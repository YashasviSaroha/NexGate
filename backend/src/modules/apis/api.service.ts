import { prisma } from '../../config/database.js';
import { validateUpstreamUrl } from '../../utils/ssrf.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { ApiStatus, HttpMethod } from '@prisma/client';

const DEMO_APIS = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    organizationId: '00000000-0000-0000-0000-000000000002',
    name: 'Global Weather API',
    slug: 'weather-api',
    description: 'Provides real-time atmospheric metrics and worldwide forecasts.',
    upstreamBaseUrl: 'http://localhost:3000/mock-upstream/weather',
    status: 'ACTIVE',
    createdAt: new Date(),
    versions: [{ id: 'v1_id', version: 'v1', status: 'ACTIVE', basePath: '' }],
    endpoints: [
      { id: 'ep_1', path: '/current', method: 'GET', description: 'Real-time weather query', isActive: true },
    ],
    plans: [
      { id: 'plan_1', name: 'Starter Plan', tier: 'FREE', requestsPerMinute: 60, dailyQuota: 1000, monthlyQuota: 30000 },
    ],
    _count: { subscriptions: 1, requestLogs: 12 },
  },
];

export class ApiService {
  async listApis(orgId: string) {
    try {
      return await prisma.api.findMany({
        where: { organizationId: orgId },
        include: {
          versions: true,
          endpoints: true,
          plans: true,
          _count: {
            select: {
              subscriptions: true,
              requestLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      if (err.message?.includes("Can't reach database server") || err.code === 'P1001') {
        return DEMO_APIS as any;
      }
      throw err;
    }
  }

  async getApiById(orgId: string, apiId: string) {
    const api = await prisma.api.findFirst({
      where: { id: apiId, organizationId: orgId },
      include: {
        versions: {
          include: {
            endpoints: true,
          },
        },
        endpoints: true,
        plans: true,
        _count: {
          select: {
            subscriptions: true,
            requestLogs: true,
          },
        },
      },
    });

    if (!api) throw new NotFoundError('API not found in this organization.');
    return api;
  }

  async createApi(
    orgId: string,
    data: {
      name: string;
      slug?: string;
      description?: string;
      upstreamBaseUrl: string;
      initialVersion?: string;
      openApiSpec?: Record<string, unknown>;
    }
  ) {
    // 1. SSRF check for upstream destination
    await validateUpstreamUrl(data.upstreamBaseUrl);

    // 2. Slug generation
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const existing = await prisma.api.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestError(`An API with slug '${slug}' already exists.`);
    }

    const versionTag = data.initialVersion || 'v1';

    // 3. Create API + Initial version + Default Free Plan
    const result = await prisma.$transaction(async (tx) => {
      const api = await tx.api.create({
        data: {
          organizationId: orgId,
          name: data.name,
          slug,
          description: data.description,
          upstreamBaseUrl: data.upstreamBaseUrl,
          status: 'ACTIVE',
          openApiSpec: (data.openApiSpec as any) || undefined,
        },
      });

      const version = await tx.apiVersion.create({
        data: {
          apiId: api.id,
          version: versionTag,
          basePath: '',
          status: 'ACTIVE',
        },
      });

      // Default Free Plan
      await tx.apiPlan.create({
        data: {
          apiId: api.id,
          name: 'Free Plan',
          tier: 'FREE',
          requestsPerMinute: 60,
          dailyQuota: 1000,
          monthlyQuota: 10000,
        },
      });

      return { api, version };
    });

    return result.api;
  }

  async updateApi(
    orgId: string,
    apiId: string,
    data: {
      name?: string;
      description?: string;
      upstreamBaseUrl?: string;
      status?: ApiStatus;
      openApiSpec?: Record<string, unknown>;
    }
  ) {
    const api = await prisma.api.findFirst({
      where: { id: apiId, organizationId: orgId },
    });
    if (!api) throw new NotFoundError('API not found.');

    if (data.upstreamBaseUrl) {
      await validateUpstreamUrl(data.upstreamBaseUrl);
    }

    return prisma.api.update({
      where: { id: apiId },
      data: {
        name: data.name,
        description: data.description,
        upstreamBaseUrl: data.upstreamBaseUrl,
        status: data.status,
        openApiSpec: (data.openApiSpec as any) || undefined,
      },
    });
  }

  async deleteApi(orgId: string, apiId: string) {
    const api = await prisma.api.findFirst({
      where: { id: apiId, organizationId: orgId },
    });
    if (!api) throw new NotFoundError('API not found.');

    await prisma.api.delete({ where: { id: apiId } });
    return { message: 'API deleted successfully.' };
  }

  async createVersion(orgId: string, apiId: string, data: { version: string; basePath?: string }) {
    const api = await prisma.api.findFirst({ where: { id: apiId, organizationId: orgId } });
    if (!api) throw new NotFoundError('API not found.');

    return prisma.apiVersion.create({
      data: {
        apiId,
        version: data.version,
        basePath: data.basePath || '',
        status: 'ACTIVE',
      },
    });
  }

  async createEndpoint(
    orgId: string,
    apiId: string,
    versionId: string,
    data: {
      path: string;
      method: HttpMethod;
      description?: string;
      requestSchema?: Record<string, unknown>;
      responseSchema?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    const api = await prisma.api.findFirst({ where: { id: apiId, organizationId: orgId } });
    if (!api) throw new NotFoundError('API not found.');

    return prisma.apiEndpoint.create({
      data: {
        apiId,
        apiVersionId: versionId,
        path: data.path,
        method: data.method,
        description: data.description,
        requestSchema: (data.requestSchema as any) || undefined,
        responseSchema: (data.responseSchema as any) || undefined,
        isActive: data.isActive ?? true,
      },
    });
  }
}

export const apiService = new ApiService();
