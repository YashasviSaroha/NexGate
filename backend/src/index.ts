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

  const server = app.listen(PORT, () => {
    console.log(`🚀 NexGate Server running on http://localhost:${PORT}`);
    console.log(`🌐 API Management:  http://localhost:${PORT}/api/v1`);
    console.log(`🚪 Gateway Endpoint: http://localhost:${PORT}/gateway/:apiSlug/:version/*`);
    console.log(`🧪 Mock Upstream:    http://localhost:${PORT}/mock-upstream`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Closing the HTTP server.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.VERCEL !== '1') {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}

export default app;
