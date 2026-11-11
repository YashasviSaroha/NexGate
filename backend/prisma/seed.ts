import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateApiKey } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NexGate Database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Create Default Admin User
  const user = await prisma.user.upsert({
    where: { email: 'admin@nexgate.dev' },
    update: {},
    create: {
      name: 'NexGate Administrator',
      email: 'admin@nexgate.dev',
      passwordHash,
    },
  });

  // 2. Create Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'nexgate-demo' },
    update: {},
    create: {
      name: 'NexGate Engineering',
      slug: 'nexgate-demo',
    },
  });

  // 3. Connect User as OWNER
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  // 4. Create Demo Weather API
  const api = await prisma.api.upsert({
    where: { slug: 'weather-api' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Global Weather API',
      slug: 'weather-api',
      description: 'Provides real-time atmospheric metrics and worldwide forecasts.',
      upstreamBaseUrl: 'http://localhost:3000/mock-upstream/weather',
      status: 'ACTIVE',
    },
  });

  // 5. Create Version v1
  const version = await prisma.apiVersion.upsert({
    where: {
      apiId_version: {
        apiId: api.id,
        version: 'v1',
      },
    },
    update: {},
    create: {
      apiId: api.id,
      version: 'v1',
      basePath: '',
      status: 'ACTIVE',
    },
  });

  // 6. Create Endpoint GET /current
  const existingEp = await prisma.apiEndpoint.findFirst({
    where: { apiId: api.id, path: '/current' },
  });

  if (!existingEp) {
    await prisma.apiEndpoint.create({
      data: {
        apiId: api.id,
        apiVersionId: version.id,
        path: '/current',
        method: 'GET',
        description: 'Fetch current temperature and conditions for any city.',
        isActive: true,
      },
    });
  }

  // 7. Create Plans: Free & Pro
  let freePlan = await prisma.apiPlan.findFirst({
    where: { apiId: api.id, tier: 'FREE' },
  });

  if (!freePlan) {
    freePlan = await prisma.apiPlan.create({
      data: {
        apiId: api.id,
        name: 'Starter Plan',
        tier: 'FREE',
        requestsPerMinute: 60,
        dailyQuota: 1000,
        monthlyQuota: 30000,
        price: 0,
      },
    });
  }

  // 8. Create Demo Application
  let app = await prisma.application.findFirst({
    where: { organizationId: org.id, name: 'Mobile Weather App' },
  });

  if (!app) {
    app = await prisma.application.create({
      data: {
        organizationId: org.id,
        createdById: user.id,
        name: 'Mobile Weather App',
        description: 'iOS and Android client consumer app.',
        status: 'ACTIVE',
      },
    });
  }

  // 9. Subscribe Application to Free Plan
  await prisma.subscription.upsert({
    where: {
      applicationId_apiId: {
        applicationId: app.id,
        apiId: api.id,
      },
    },
    update: {},
    create: {
      applicationId: app.id,
      apiId: api.id,
      apiPlanId: freePlan.id,
      status: 'ACTIVE',
    },
  });

  // 10. Generate Demo Live API Key
  const demoKey = generateApiKey('LIVE');
  const existingKey = await prisma.apiKey.findFirst({
    where: { applicationId: app.id, status: 'ACTIVE' },
  });

  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        applicationId: app.id,
        keyPrefix: demoKey.keyPrefix,
        keyHash: demoKey.keyHash,
        environment: 'LIVE',
        status: 'ACTIVE',
      },
    });

    console.log('\n🔑 Generated Demo Live API Key:');
    console.log(`   Key: ${demoKey.fullKey}`);
    console.log(`   Prefix: ${demoKey.keyPrefix}\n`);
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
