import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { hashApiKey, GeneratedApiKey } from '../../utils/crypto.js';
import { ForbiddenError } from '../../utils/errors.js';

export const DEMO_ORG_SLUG = 'public-demo';
const SAMPLE_CATEGORY = 'demo-sample';

export function demoSandboxKey(): GeneratedApiKey {
  const material = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update('nexgate-public-demo-sandbox-v1')
    .digest('hex');
  const fullKey = `ng_test_${material.slice(0, 8)}_${material.slice(8, 56)}`;
  const keyPrefix = `ng_test_${material.slice(0, 8)}`;
  return { fullKey, keyPrefix, keyHash: hashApiKey(fullKey) };
}

async function upsertApi(
  organizationId: string,
  spec: {
    slug: string;
    name: string;
    description: string;
    upstreamPath: string;
    endpointPath: string;
    endpointDescription: string;
  }
) {
  const upstreamBaseUrl = `${env.BACKEND_URL.replace(/\/$/, '')}${spec.upstreamPath}`;
  const api = await prisma.api.upsert({
    where: { slug: spec.slug },
    update: {
      name: spec.name,
      description: spec.description,
      upstreamBaseUrl,
      status: 'ACTIVE',
      organizationId,
    },
    create: {
      organizationId,
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
      upstreamBaseUrl,
      status: 'ACTIVE',
    },
  });

  const version = await prisma.apiVersion.upsert({
    where: { apiId_version: { apiId: api.id, version: 'v1' } },
    update: { status: 'ACTIVE' },
    create: { apiId: api.id, version: 'v1', status: 'ACTIVE', basePath: '' },
  });

  const endpoint = await prisma.apiEndpoint.findFirst({
    where: { apiId: api.id, path: spec.endpointPath, method: 'GET' },
  });
  if (!endpoint) {
    await prisma.apiEndpoint.create({
      data: {
        apiId: api.id,
        apiVersionId: version.id,
        path: spec.endpointPath,
        method: 'GET',
        description: spec.endpointDescription,
        isActive: true,
      },
    });
  }

  let freePlan = await prisma.apiPlan.findFirst({ where: { apiId: api.id, tier: 'FREE' } });
  if (!freePlan) {
    freePlan = await prisma.apiPlan.create({
      data: {
        apiId: api.id,
        name: 'Free Developer Plan',
        tier: 'FREE',
        requestsPerMinute: 30,
        dailyQuota: 200,
        monthlyQuota: 2000,
        price: 0,
      },
    });
  }

  const proPlan = await prisma.apiPlan.findFirst({ where: { apiId: api.id, tier: 'PRO' } });
  if (!proPlan) {
    await prisma.apiPlan.create({
      data: {
        apiId: api.id,
        name: 'Pro Developer Plan',
        tier: 'PRO',
        requestsPerMinute: 120,
        dailyQuota: 5000,
        monthlyQuota: 100000,
        price: 0,
      },
    });
  }

  return { api, freePlan };
}

async function seedSampleLogs(organizationId: string, applicationId: string, apiId: string) {
  const existing = await prisma.requestLog.count({
    where: { organizationId, errorCategory: SAMPLE_CATEGORY },
  });
  if (existing > 0) return;

  const samples = [
    { path: '/gateway/demo-weather/v1/current', statusCode: 200, latencyMs: 42, hoursAgo: 1 },
    { path: '/gateway/demo-weather/v1/current', statusCode: 200, latencyMs: 36, hoursAgo: 2 },
    { path: '/gateway/demo-catalog/v1/products', statusCode: 200, latencyMs: 51, hoursAgo: 3 },
    { path: '/gateway/demo-weather/v1/current', statusCode: 401, latencyMs: 11, hoursAgo: 5 },
    { path: '/gateway/demo-catalog/v1/products', statusCode: 429, latencyMs: 9, hoursAgo: 8 },
    { path: '/gateway/demo-weather/v1/missing', statusCode: 404, latencyMs: 14, hoursAgo: 12 },
    { path: '/gateway/demo-catalog/v1/products', statusCode: 200, latencyMs: 47, hoursAgo: 18 },
  ];

  await prisma.requestLog.createMany({
    data: samples.map((sample, index) => ({
      organizationId,
      applicationId,
      apiId,
      method: 'GET',
      path: sample.path,
      statusCode: sample.statusCode,
      latencyMs: sample.latencyMs,
      errorCategory: SAMPLE_CATEGORY,
      requestId: `demo-sample-${index + 1}`,
      ipAddress: null,
      createdAt: new Date(Date.now() - sample.hoursAgo * 3600000),
    })),
  });
}

export async function ensureDemoWorkspace() {
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
  const user = await prisma.user.upsert({
    where: { email: env.DEMO_USER_EMAIL },
    update: { name: 'Demo Visitor' },
    create: {
      email: env.DEMO_USER_EMAIL,
      name: 'Demo Visitor',
      passwordHash,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: { name: 'NexGate Demo' },
    create: { name: 'NexGate Demo', slug: DEMO_ORG_SLUG },
  });

  await prisma.organizationMember.deleteMany({
    where: { userId: user.id, organizationId: { not: org.id } },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { role: 'DEVELOPER', status: 'ACTIVE' },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'DEVELOPER',
      status: 'ACTIVE',
    },
  });

  const weather = await upsertApi(org.id, {
    slug: 'demo-weather',
    name: 'Sample Weather API',
    description: 'Demonstration weather API. Returns sample conditions for a city.',
    upstreamPath: '/mock-upstream/weather',
    endpointPath: '/current',
    endpointDescription: 'Current sample conditions for a city.',
  });

  const catalog = await upsertApi(org.id, {
    slug: 'demo-catalog',
    name: 'Sample Product Catalog API',
    description: 'Demonstration product catalog. Returns a fixed sample list.',
    upstreamPath: '/mock-upstream/catalog',
    endpointPath: '/products',
    endpointDescription: 'List sample products.',
  });

  let application = await prisma.application.findFirst({
    where: { organizationId: org.id, name: 'Demo Application' },
  });
  if (!application) {
    application = await prisma.application.create({
      data: {
        organizationId: org.id,
        createdById: user.id,
        name: 'Demo Application',
        description: 'Sandbox application for the public demo. Keys cannot be rotated from this session.',
        status: 'ACTIVE',
      },
    });
  }

  for (const entry of [weather, catalog]) {
    await prisma.subscription.upsert({
      where: { applicationId_apiId: { applicationId: application.id, apiId: entry.api.id } },
      update: { status: 'ACTIVE', apiPlanId: entry.freePlan.id },
      create: {
        applicationId: application.id,
        apiId: entry.api.id,
        apiPlanId: entry.freePlan.id,
        status: 'ACTIVE',
      },
    });
  }

  const sandbox = demoSandboxKey();
  const existingKey = await prisma.apiKey.findUnique({ where: { keyHash: sandbox.keyHash } });
  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        applicationId: application.id,
        keyPrefix: sandbox.keyPrefix,
        keyHash: sandbox.keyHash,
        environment: 'TEST',
        status: 'ACTIVE',
      },
    });
  } else if (existingKey.status !== 'ACTIVE') {
    await prisma.apiKey.update({
      where: { id: existingKey.id },
      data: { status: 'ACTIVE', revokedAt: null },
    });
  }

  await seedSampleLogs(org.id, application.id, weather.api.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: 'DEMO_VIEWER',
    },
    sandboxKey: sandbox.fullKey,
  };
}

export async function resetDemoTraffic(userId: string) {
  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) throw new ForbiddenError('Demo workspace is not available.');

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: org.id, status: 'ACTIVE' },
  });
  if (!membership) throw new ForbiddenError('Demo reset is limited to the demo workspace.');

  const removed = await prisma.requestLog.deleteMany({
    where: {
      organizationId: org.id,
      OR: [{ errorCategory: null }, { errorCategory: { not: SAMPLE_CATEGORY } }],
    },
  });

  return {
    message: 'Live demo traffic was cleared. Sample history and registered organizations were left unchanged.',
    removed: removed.count,
  };
}
