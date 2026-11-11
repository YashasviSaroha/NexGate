import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;
let isConnected = false;

// Fallback in-memory store for dev/testing when Redis is unreachable
const memoryStore = new Map<string, { count: number; expireAt: number }>();

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️ Redis unreachable. Using high-performance in-memory fallback for rate limiting.');
        return null; // Stop retrying and fall back to memory
      }
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isConnected = true;
    console.log('✅ Connected to Redis distributed cache.');
  });

  redisClient.on('error', (err) => {
    isConnected = false;
  });

  // Attempt non-blocking connection
  redisClient.connect().catch(() => {
    // Non-fatal; will use in-memory fallback
  });
} catch (e) {
  console.warn('⚠️ Initializing Redis client failed, fallback active.');
}

/**
 * Sliding Window Rate Limiting using Redis Lua Script for atomic increment and boundary check
 * KEYS[1]: rate limit key
 * ARGV[1]: window size in seconds
 * ARGV[2]: max allowed requests
 * ARGV[3]: current timestamp (milliseconds)
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local clearBefore = now - (window * 1000)

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, limit - currentRequests - 1, window}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local resetIn = 0
    if #oldest > 0 then
        resetIn = math.ceil((tonumber(oldest[2]) + (window * 1000) - now) / 1000)
    end
    return {0, 0, math.max(resetIn, 1)}
end
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();

  if (redisClient && isConnected) {
    try {
      const res = (await redisClient.eval(
        SLIDING_WINDOW_LUA,
        1,
        `ratelimit:${key}`,
        windowSeconds,
        limit,
        now
      )) as [number, number, number];

      return {
        allowed: res[0] === 1,
        remaining: res[1],
        resetSeconds: res[2],
        limit,
      };
    } catch (err) {
      // Fall through to memory fallback
    }
  }

  // In-memory sliding window fallback
  const storeKey = `mem:rl:${key}`;
  const nowSec = Math.floor(now / 1000);
  const entry = memoryStore.get(storeKey);

  if (!entry || entry.expireAt <= nowSec) {
    memoryStore.set(storeKey, { count: 1, expireAt: nowSec + windowSeconds });
    return {
      allowed: true,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
      limit,
    };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetSeconds: Math.max(1, entry.expireAt - nowSec),
      limit,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetSeconds: Math.max(1, entry.expireAt - nowSec),
    limit,
  };
}

export { redisClient };
