import app from './app.js';
import { env } from './config/env.js';
import { testDbConnection } from './config/database.js';

const PORT = env.PORT || 3000;

async function bootstrap() {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                 ⚡ NexGate Server                ║
  ║          API Infrastructure, Simplified.         ║
  ╚══════════════════════════════════════════════════╝
  `);

  await testDbConnection();

  app.listen(PORT, () => {
    console.log(`🚀 NexGate Server running on http://localhost:${PORT}`);
    console.log(`🌐 API Management:  http://localhost:${PORT}/api/v1`);
    console.log(`🚪 Gateway Endpoint: http://localhost:${PORT}/gateway/:apiSlug/:version/*`);
    console.log(`🧪 Mock Upstream:    http://localhost:${PORT}/mock-upstream`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
