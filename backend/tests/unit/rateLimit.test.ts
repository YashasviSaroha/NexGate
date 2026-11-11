import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../../src/config/redis.js';

describe('Distributed Rate Limiting (Sliding Window)', () => {
  it('allows requests within limit and decrements remaining counter', async () => {
    const key = `test_rl_${Date.now()}`;
    const limit = 5;
    const windowSec = 10;

    const res1 = await checkRateLimit(key, limit, windowSec);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = await checkRateLimit(key, limit, windowSec);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it('rejects requests when rate limit boundary is reached', async () => {
    const key = `test_rl_boundary_${Date.now()}`;
    const limit = 3;
    const windowSec = 5;

    await checkRateLimit(key, limit, windowSec); // 1
    await checkRateLimit(key, limit, windowSec); // 2
    const res3 = await checkRateLimit(key, limit, windowSec); // 3
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request exceeds limit
    const res4 = await checkRateLimit(key, limit, windowSec);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetSeconds).toBeGreaterThan(0);
  });
});
