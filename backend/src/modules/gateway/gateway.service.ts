import http from 'http';
import https from 'https';
import { URL } from 'url';
import { prisma } from '../../config/database.js';
import { checkRateLimit } from '../../config/redis.js';
import { hashApiKey } from '../../utils/crypto.js';
import { validateUpstreamUrl } from '../../utils/ssrf.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  AppError,
} from '../../utils/errors.js';

export interface GatewayForwardParams {
  apiSlug: string;
  version: string;
  subPath: string;
  method: string;
  headers: http.IncomingHttpHeaders;
  query: Record<string, unknown>;
  body?: any;
  clientIp?: string;
}

export interface GatewayForwardResult {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  latencyMs: number;
  rateLimitInfo: {
    limit: number;
    remaining: number;
    resetSeconds: number;
  };
}

export class GatewayService {
  async handleGatewayRequest(params: GatewayForwardParams): Promise<GatewayForwardResult> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Extract API key from headers
    const rawKey =
      (params.headers['x-api-key'] as string) ||
      (params.headers['authorization']?.startsWith('Bearer ng_')
        ? params.headers['authorization'].substring(7)
        : null);

    if (!rawKey) {
      throw new UnauthorizedError('Missing API Key. Provide X-API-Key or Bearer token header.');
    }

    // Fast validation: API key format check
    if (!/^ng_(live|test)_[a-f0-9]{8}_[a-f0-9]{48}$/.test(rawKey)) {
      throw new UnauthorizedError('Invalid API Key format.');
    }

    // 2. Validate API Key in Database
    const keyHash = hashApiKey(rawKey);
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        application: {
          include: {
            organization: true,
            subscriptions: {
              include: {
                api: true,
                apiPlan: true,
              },
            },
          },
        },
      },
    });

    if (!keyRecord) {
      throw new UnauthorizedError('Invalid API Key.');
    }

    if (keyRecord.status !== 'ACTIVE') {
      throw new UnauthorizedError(`API Key is ${keyRecord.status.toLowerCase()}.`);
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('API Key has expired.');
    }

    const application = keyRecord.application;
    if (application.status !== 'ACTIVE') {
      throw new ForbiddenError(`Application '${application.name}' is ${application.status.toLowerCase()}.`);
    }

    // 3. Resolve Target API & Version
    const targetApi = await prisma.api.findUnique({
      where: { slug: params.apiSlug },
      include: {
        versions: {
          where: { version: params.version },
          include: { endpoints: true },
        },
      },
    });

    if (!targetApi) {
      throw new NotFoundError(`API with slug '${params.apiSlug}' not found.`);
    }

    if (targetApi.status !== 'ACTIVE') {
      throw new ForbiddenError(`API '${targetApi.name}' is currently ${targetApi.status.toLowerCase()}.`);
    }

    const targetVersion = targetApi.versions[0];
    if (!targetVersion) {
      throw new NotFoundError(`Version '${params.version}' for API '${params.apiSlug}' not found.`);
    }

    // 4. Verify Application Subscription to this API
    const subscription = application.subscriptions.find(
      (sub) => sub.apiId === targetApi.id && sub.status === 'ACTIVE'
    );

    if (!subscription) {
      throw new ForbiddenError(
        `Application '${application.name}' is not subscribed to API '${targetApi.name}'. Subscribe in the Developer Portal.`
      );
    }

    const plan = subscription.apiPlan;

    // 5. Distributed Rate Limiting (Requests Per Minute)
    const rateLimitKey = `rl:app:${application.id}:api:${targetApi.id}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, plan.requestsPerMinute, 60);

    if (!rateLimitResult.allowed) {
      // Record rate limited request log
      this.recordLogAsync({
        organizationId: application.organizationId,
        applicationId: application.id,
        apiId: targetApi.id,
        apiVersionId: targetVersion.id,
        method: params.method,
        path: `/gateway/${params.apiSlug}/${params.version}/${params.subPath}`,
        statusCode: 429,
        latencyMs: Date.now() - startTime,
        errorCategory: 'RATE_LIMIT_EXCEEDED',
        requestId,
        ipAddress: params.clientIp,
      });

      throw new RateLimitError(
        `Rate limit of ${plan.requestsPerMinute} req/min exceeded. Try again in ${rateLimitResult.resetSeconds}s.`,
        rateLimitResult.resetSeconds
      );
    }

    // 6. Check Daily & Monthly Quotas
    const dailyKey = `quota:daily:${application.id}:${new Date().toISOString().slice(0, 10)}`;
    const dailyQuotaResult = await checkRateLimit(dailyKey, plan.dailyQuota, 86400);

    if (!dailyQuotaResult.allowed) {
      this.recordLogAsync({
        organizationId: application.organizationId,
        applicationId: application.id,
        apiId: targetApi.id,
        apiVersionId: targetVersion.id,
        method: params.method,
        path: `/gateway/${params.apiSlug}/${params.version}/${params.subPath}`,
        statusCode: 429,
        latencyMs: Date.now() - startTime,
        errorCategory: 'DAILY_QUOTA_EXCEEDED',
        requestId,
        ipAddress: params.clientIp,
      });

      throw new RateLimitError(
        `Daily quota of ${plan.dailyQuota} requests reached. Resets at midnight UTC.`,
        dailyQuotaResult.resetSeconds
      );
    }

    // 7. Verify Endpoint & HTTP Method (if endpoints configured)
    if (targetVersion.endpoints.length > 0) {
      const matchingEndpoint = targetVersion.endpoints.find(
        (ep) =>
          ep.isActive &&
          ep.method.toUpperCase() === params.method.toUpperCase() &&
          this.pathMatches(ep.path, params.subPath)
      );

      if (!matchingEndpoint) {
        throw new ForbiddenError(
          `Endpoint ${params.method} /${params.subPath} is not exposed or active for this API version.`
        );
      }
    }

    // 8. Forward to Upstream
    const upstreamUrlObj = await validateUpstreamUrl(targetApi.upstreamBaseUrl);
    const forwardResult = await this.forwardUpstreamRequest(upstreamUrlObj, params);
    const totalLatency = Date.now() - startTime;

    // 9. Asynchronously record request log & update API key lastUsedAt
    this.recordLogAsync({
      organizationId: application.organizationId,
      applicationId: application.id,
      apiId: targetApi.id,
      apiVersionId: targetVersion.id,
      method: params.method,
      path: `/${params.subPath}`,
      statusCode: forwardResult.statusCode,
      latencyMs: totalLatency,
      errorCategory: forwardResult.statusCode >= 400 ? 'HTTP_ERROR' : undefined,
      requestId,
      ipAddress: params.clientIp,
    });

    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      statusCode: forwardResult.statusCode,
      headers: forwardResult.headers,
      body: forwardResult.body,
      latencyMs: totalLatency,
      rateLimitInfo: {
        limit: plan.requestsPerMinute,
        remaining: rateLimitResult.remaining,
        resetSeconds: rateLimitResult.resetSeconds,
      },
    };
  }

  private pathMatches(pattern: string, actual: string): boolean {
    const cleanPattern = pattern.replace(/^\/|\/$/g, '');
    const cleanActual = actual.replace(/^\/|\/$/g, '');

    if (cleanPattern === '*' || cleanPattern === cleanActual) return true;

    const patternParts = cleanPattern.split('/');
    const actualParts = cleanActual.split('/');

    if (patternParts.length !== actualParts.length) return false;

    return patternParts.every(
      (part, i) => part.startsWith(':') || part === actualParts[i]
    );
  }

  private forwardUpstreamRequest(
    upstreamUrl: URL,
    params: GatewayForwardParams
  ): Promise<{ statusCode: number; headers: Record<string, string | string[]>; body: Buffer }> {
    return new Promise((resolve, reject) => {
      // Build upstream request URL
      const targetPath = `${upstreamUrl.pathname.replace(/\/$/, '')}/${params.subPath.replace(/^\//, '')}`;
      const searchParams = new URLSearchParams(params.query as Record<string, string>).toString();
      const fullPath = searchParams ? `${targetPath}?${searchParams}` : targetPath;

      const client = upstreamUrl.protocol === 'https:' ? https : http;

      // Filter and sanitize headers to prevent spoofing
      const safeHeaders: Record<string, string | string[] | undefined> = {
        ...params.headers,
        host: upstreamUrl.host,
        'x-forwarded-for': params.clientIp || '127.0.0.1',
        'x-forwarded-proto': upstreamUrl.protocol.replace(':', ''),
      };

      // Strip proxy / auth credentials from upstream forwarding
      delete safeHeaders['x-api-key'];
      delete safeHeaders['authorization'];
      delete safeHeaders['connection'];

      const req = client.request(
        {
          hostname: upstreamUrl.hostname,
          port: upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
          path: fullPath,
          method: params.method,
          headers: safeHeaders as http.OutgoingHttpHeaders,
          timeout: 30000, // 30 sec upstream timeout
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const body = Buffer.concat(chunks);
            resolve({
              statusCode: res.statusCode || 200,
              headers: res.headers as Record<string, string | string[]>,
              body,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new AppError('Upstream Gateway Timeout (504)', 504));
      });

      req.on('error', (err) => {
        reject(new AppError(`Bad Gateway: Upstream connection failed (${err.message})`, 502));
      });

      if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method.toUpperCase())) {
        const bodyData = typeof params.body === 'object' ? JSON.stringify(params.body) : params.body;
        req.write(bodyData);
      }

      req.end();
    });
  }

  private async recordLogAsync(data: {
    organizationId: string;
    applicationId?: string;
    apiId?: string;
    apiVersionId?: string;
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
    errorCategory?: string;
    requestId: string;
    ipAddress?: string;
  }) {
    try {
      await prisma.requestLog.create({
        data: {
          organizationId: data.organizationId,
          applicationId: data.applicationId,
          apiId: data.apiId,
          apiVersionId: data.apiVersionId,
          method: data.method,
          path: data.path,
          statusCode: data.statusCode,
          latencyMs: data.latencyMs,
          errorCategory: data.errorCategory,
          requestId: data.requestId,
          ipAddress: data.ipAddress,
        },
      });
    } catch (e) {
      // Async log failure should never disrupt the client response
      console.error('Failed to write gateway request log:', e);
    }
  }
}

export const gatewayService = new GatewayService();
