import http from 'http';
import https from 'https';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { checkRateLimit } from '../../config/redis.js';
import { hashApiKey } from '../../utils/crypto.js';
import { validateUpstreamUrl, type UpstreamTarget } from '../../utils/ssrf.js';
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
      (sub: any) => sub.apiId === targetApi.id && sub.status === 'ACTIVE'
    );

    if (!subscription) {
      throw new ForbiddenError(
        `Application '${application.name}' is not subscribed to API '${targetApi.name}'. Subscribe in the Developer Portal.`
      );
    }

    const plan = subscription.apiPlan;

    if (!scopeAllows(keyRecord.scopes, params.method, params.subPath)) {
      throw new ForbiddenError('This API key is not allowed to call that endpoint.');
    }

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
        `Daily quota of ${plan.dailyQuota} requests reached for this UTC date.`,
        dailyQuotaResult.resetSeconds
      );
    }

    const monthKey = `quota:monthly:${application.id}:${new Date().toISOString().slice(0, 7)}`;
    const monthlyQuotaResult = await checkRateLimit(monthKey, plan.monthlyQuota, 32 * 24 * 60 * 60);

    if (!monthlyQuotaResult.allowed) {
      this.recordLogAsync({
        organizationId: application.organizationId,
        applicationId: application.id,
        apiId: targetApi.id,
        apiVersionId: targetVersion.id,
        method: params.method,
        path: `/gateway/${params.apiSlug}/${params.version}/${params.subPath}`,
        statusCode: 429,
        latencyMs: Date.now() - startTime,
        errorCategory: 'MONTHLY_QUOTA_EXCEEDED',
        requestId,
        ipAddress: params.clientIp,
      });

      throw new RateLimitError(
        `Monthly quota of ${plan.monthlyQuota} requests reached.`,
        monthlyQuotaResult.resetSeconds
      );
    }

    // 7. Verify Endpoint & HTTP Method (if endpoints configured)
    if (targetVersion.endpoints.length > 0) {
      const matchingEndpoint = targetVersion.endpoints.find(
        (ep: any) =>
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
    const upstream = await validateUpstreamUrl(targetApi.upstreamBaseUrl);
    const forwardResult = await this.forwardUpstreamRequest(upstream, params);
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
    upstream: UpstreamTarget,
    params: GatewayForwardParams
  ): Promise<{ statusCode: number; headers: Record<string, string | string[]>; body: Buffer }> {
    return new Promise((resolve, reject) => {
      const upstreamUrl = upstream.url;
      const targetPath = `${upstreamUrl.pathname.replace(/\/$/, '')}/${params.subPath.replace(/^\//, '')}`;
      const searchParams = new URLSearchParams(params.query as Record<string, string>).toString();
      const fullPath = searchParams ? `${targetPath}?${searchParams}` : targetPath;

      const client = upstreamUrl.protocol === 'https:' ? https : http;
      const payload = encodeUpstreamBody(params.method, params.body);
      const safeHeaders = buildForwardHeaders(params.headers, {
        host: upstreamUrl.host,
        clientIp: params.clientIp,
        proto: upstreamUrl.protocol.replace(':', ''),
        contentLength: payload ? payload.length : undefined,
      });

      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const req = client.request(
        {
          host: upstream.pinnedAddress,
          servername: upstream.hostname,
          port: upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
          path: fullPath,
          method: params.method,
          headers: safeHeaders,
          timeout: env.GATEWAY_REQUEST_TIMEOUT_MS,
          lookup: (_hostname, options, callback) => {
            const done = typeof options === 'function' ? options : callback;
            done(null, upstream.pinnedAddress, upstream.family);
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let received = 0;
          res.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (received > MAX_UPSTREAM_RESPONSE_BYTES) {
              req.destroy();
              fail(new AppError('Upstream response exceeded the 5 MB size limit.', 502));
              return;
            }
            chunks.push(Buffer.from(chunk));
          });
          res.on('end', () => {
            if (settled) return;
            settled = true;
            resolve({
              statusCode: res.statusCode || 200,
              headers: res.headers as Record<string, string | string[]>,
              body: Buffer.concat(chunks),
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        fail(new AppError('Upstream Gateway Timeout (504)', 504));
      });

      req.on('error', (err) => {
        fail(new AppError(`Bad Gateway: Upstream connection failed (${err.message})`, 502));
      });

      if (payload) req.write(payload);
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

      if (data.applicationId && data.apiId) {
        const periodStart = new Date();
        periodStart.setUTCMinutes(0, 0, 0);
        const success = data.statusCode < 400;
        await prisma.usageRecord.upsert({
          where: {
            applicationId_apiId_period_periodStart: {
              applicationId: data.applicationId,
              apiId: data.apiId,
              period: 'HOUR',
              periodStart,
            },
          },
          create: {
            organizationId: data.organizationId,
            applicationId: data.applicationId,
            apiId: data.apiId,
            period: 'HOUR',
            periodStart,
            requestCount: 1,
            successCount: success ? 1 : 0,
            failureCount: success ? 0 : 1,
            avgLatencyMs: data.latencyMs,
          },
          update: {
            requestCount: { increment: 1 },
            successCount: { increment: success ? 1 : 0 },
            failureCount: { increment: success ? 0 : 1 },
          },
        });
      }
    } catch (e) {
      // Async log failure should never disrupt the client response
      console.error('Failed to write gateway request log:', e);
    }
  }
}

export const gatewayService = new GatewayService();

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'cookie',
  'set-cookie',
  'host',
  'content-length',
  'x-api-key',
  'authorization',
]);

const MAX_UPSTREAM_RESPONSE_BYTES = 5 * 1024 * 1024;

export function buildForwardHeaders(
  incoming: http.IncomingHttpHeaders,
  options: { host: string; clientIp?: string; proto: string; contentLength?: number }
): http.OutgoingHttpHeaders {
  const safe: http.OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || HOP_BY_HOP.has(key.toLowerCase())) continue;
    safe[key] = value;
  }
  safe.host = options.host;
  safe['x-forwarded-for'] = options.clientIp || 'unknown';
  safe['x-forwarded-proto'] = options.proto;
  if (options.contentLength !== undefined) {
    safe['content-length'] = String(options.contentLength);
  }
  return safe;
}

export function encodeUpstreamBody(method: string, body: unknown): Buffer | undefined {
  if (!body || !['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) return undefined;
  const raw = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
}

export function scopeAllows(scopes: unknown, method: string, subPath: string): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) return true;
  const path = `/${subPath.replace(/^\/|\/$/g, '')}`;
  const verb = method.toUpperCase();
  return scopes.some((entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') return false;
    const parts = entry.trim().split(/\s+/);
    const allowedMethod = parts.length > 1 ? parts[0].toUpperCase() : '*';
    const allowedPath = parts.length > 1 ? parts[1] : parts[0];
    const methodOk = allowedMethod === '*' || allowedMethod === verb;
    const pathOk = allowedPath === '*' || allowedPath === path || allowedPath === subPath;
    return methodOk && pathOk;
  });
}

export const STRIPPED_RESPONSE_HEADERS = [
  'transfer-encoding',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'trailer',
  'upgrade',
  'set-cookie',
];
