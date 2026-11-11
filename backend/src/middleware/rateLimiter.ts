import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../config/redis.js';
import { env } from '../config/env.js';
import { RateLimitError } from '../utils/errors.js';

export async function authRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `auth:${ip}`;

  const result = await checkRateLimit(
    key,
    env.AUTH_RATE_LIMIT_MAX,
    Math.floor(env.AUTH_RATE_LIMIT_WINDOW_MS / 1000)
  );

  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetSeconds);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.resetSeconds);
    throw new RateLimitError(
      `Too many authentication attempts from this IP. Please try again in ${result.resetSeconds} seconds.`,
      result.resetSeconds
    );
  }

  next();
}
