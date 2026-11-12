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
  ALLOW_LOCAL_UPSTREAM: z.enum(['true', 'false']).default('false'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(20000),
  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().default(800),
  DEMO_USER_EMAIL: z.string().email().default('visitor@demo.nexgate.local'),
  DEMO_DAILY_AI_LIMIT: z.coerce.number().default(8),
  USER_DAILY_AI_LIMIT: z.coerce.number().default(40),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
