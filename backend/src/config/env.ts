import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load from project root .env or backend .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://nexgate:nexgate_dev_password@localhost:5432/nexgate'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('nexgate-super-secret-jwt-key-min-32-chars-long!'),
  JWT_EXPIRY: z.string().default('24h'),
  SESSION_SECRET: z.string().min(16).default('nexgate-session-secret-min-32-chars-long-123'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
  GATEWAY_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  GATEWAY_MAX_REQUEST_SIZE: z.string().default('10mb'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
