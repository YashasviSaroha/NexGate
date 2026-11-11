import { prisma } from '../../config/database.js';
import { generateApiKey } from '../../utils/crypto.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { AppStatus, KeyEnvironment } from '@prisma/client';

const DEMO_APPS = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    organizationId: '00000000-0000-0000-0000-000000000002',
    name: 'Mobile Weather App',
    description: 'iOS and Android client consumer app.',
    status: 'ACTIVE',
    createdAt: new Date(),
    apiKeys: [
      {
        id: '00000000-0000-0000-0000-000000000030',
        keyPrefix: 'ng_live_a1b2c3d4',
        environment: 'LIVE',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        createdAt: new Date(),
      },
    ],
    subscriptions: [
      {
        id: '00000000-0000-0000-0000-000000000040',
        api: { id: '00000000-0000-0000-0000-000000000010', name: 'Global Weather API', slug: 'weather-api' },
        apiPlan: { id: 'plan_1', name: 'Starter Plan', tier: 'FREE', requestsPerMinute: 60 },
        status: 'ACTIVE',
      },
    ],
    _count: { requestLogs: 12 },
  },
];

export class AppService {
  async listApps(orgId: string) {
    try {
      return await prisma.application.findMany({
        where: { organizationId: orgId, status: { not: 'DELETED' } },
        include: {
          apiKeys: {
            select: {
              id: true,
              keyPrefix: true,
              environment: true,
              status: true,
              expiresAt: true,
              lastUsedAt: true,
              createdAt: true,
            },
          },
          subscriptions: {
            include: {
              api: { select: { id: true, name: true, slug: true } },
              apiPlan: { select: { id: true, name: true, tier: true, requestsPerMinute: true } },
            },
          },
          _count: {
            select: { requestLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      if (err.message?.includes("Can't reach database server") || err.code === 'P1001') {
        return DEMO_APPS as any;
      }
      throw err;
    }
  }

  async getAppById(orgId: string, appId: string) {
    const app = await prisma.application.findFirst({
      where: { id: appId, organizationId: orgId, status: { not: 'DELETED' } },
      include: {
        apiKeys: {
          select: {
            id: true,
            keyPrefix: true,
            environment: true,
            status: true,
            scopes: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        subscriptions: {
          include: {
            api: { select: { id: true, name: true, slug: true, upstreamBaseUrl: true } },
            apiPlan: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!app) throw new NotFoundError('Application not found.');
    return app;
  }

  async createApp(orgId: string, userId: string, data: { name: string; description?: string }) {
    return prisma.application.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: data.name,
        description: data.description,
        status: 'ACTIVE',
      },
    });
  }

  async updateApp(orgId: string, appId: string, data: { name?: string; description?: string; status?: AppStatus }) {
    const app = await prisma.application.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundError('Application not found.');

    return prisma.application.update({
      where: { id: appId },
      data,
    });
  }

  async deleteApp(orgId: string, appId: string) {
    const app = await prisma.application.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundError('Application not found.');

    // Soft delete
    await prisma.application.update({
      where: { id: appId },
      data: { status: 'DELETED' },
    });

    // Revoke all keys
    await prisma.apiKey.updateMany({
      where: { applicationId: appId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return { message: 'Application deleted.' };
  }

  // --- API KEY MANAGEMENT ---

  async generateKey(
    orgId: string,
    appId: string,
    data: { environment?: KeyEnvironment; scopes?: string[]; expiresInDays?: number }
  ) {
    const app = await prisma.application.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundError('Application not found.');

    const envMode = data.environment || 'LIVE';
    const keyData = generateApiKey(envMode);

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400000)
      : null;

    const keyRecord = await prisma.apiKey.create({
      data: {
        applicationId: appId,
        keyPrefix: keyData.keyPrefix,
        keyHash: keyData.keyHash,
        environment: envMode,
        status: 'ACTIVE',
        scopes: (data.scopes as any) || undefined,
        expiresAt,
      },
    });

    // CRITICAL SECURITY: Return the full secret key ONLY ONCE upon creation!
    return {
      id: keyRecord.id,
      apiKey: keyData.fullKey, // Show once!
      keyPrefix: keyRecord.keyPrefix,
      environment: keyRecord.environment,
      expiresAt: keyRecord.expiresAt,
      createdAt: keyRecord.createdAt,
    };
  }

  async revokeKey(orgId: string, appId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        applicationId: appId,
        application: { organizationId: orgId },
      },
    });

    if (!key) throw new NotFoundError('API key not found.');

    return prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }

  async rotateKey(orgId: string, appId: string, keyId: string) {
    const oldKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        applicationId: appId,
        application: { organizationId: orgId },
      },
    });

    if (!oldKey) throw new NotFoundError('API key not found.');

    // 1. Revoke old key
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // 2. Generate new replacement key
    return this.generateKey(orgId, appId, {
      environment: oldKey.environment,
      scopes: oldKey.scopes as string[] | undefined,
    });
  }

  // --- SUBSCRIPTIONS ---

  async subscribe(orgId: string, appId: string, data: { apiId: string; apiPlanId: string }) {
    const app = await prisma.application.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundError('Application not found.');

    const api = await prisma.api.findUnique({ where: { id: data.apiId } });
    if (!api) throw new NotFoundError('API not found.');

    const plan = await prisma.apiPlan.findFirst({
      where: { id: data.apiPlanId, apiId: data.apiId },
    });
    if (!plan) throw new NotFoundError('Plan not found for this API.');

    return prisma.subscription.upsert({
      where: {
        applicationId_apiId: {
          applicationId: appId,
          apiId: data.apiId,
        },
      },
      update: {
        apiPlanId: data.apiPlanId,
        status: 'ACTIVE',
      },
      create: {
        applicationId: appId,
        apiId: data.apiId,
        apiPlanId: data.apiPlanId,
        status: 'ACTIVE',
      },
      include: {
        api: { select: { id: true, name: true, slug: true } },
        apiPlan: true,
      },
    });
  }

  async unsubscribe(orgId: string, appId: string, subscriptionId: string) {
    const sub = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        applicationId: appId,
        application: { organizationId: orgId },
      },
    });

    if (!sub) throw new NotFoundError('Subscription not found.');

    await prisma.subscription.delete({ where: { id: subscriptionId } });
    return { message: 'Subscription cancelled.' };
  }
}

export const appService = new AppService();
