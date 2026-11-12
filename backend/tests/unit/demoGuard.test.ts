import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { denyDemoMutation } from '../../src/middleware/demoGuard.js';
import { ForbiddenError } from '../../src/utils/errors.js';

function invoke(method: string, path: string, token?: string) {
  let forwarded: unknown = 'next';
  const req = {
    method,
    path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
  };
  denyDemoMutation(req as any, {} as any, (err?: unknown) => {
    forwarded = err ?? 'next';
  });
  return forwarded;
}

describe('demo mutation guard', () => {
  const demoToken = jwt.sign(
    { id: '11111111-1111-1111-1111-111111111111', email: 'visitor@demo.nexgate.local', name: 'Demo', demo: true },
    env.JWT_SECRET
  );
  const userToken = jwt.sign(
    { id: '22222222-2222-2222-2222-222222222222', email: 'owner@example.com', name: 'Owner', demo: false },
    env.JWT_SECRET
  );

  it('blocks demo sessions from creating APIs', () => {
    const result = invoke('POST', '/api/v1/organizations/org/apis', demoToken);
    expect(result).toBeInstanceOf(ForbiddenError);
  });

  it('allows demo sessions to read and call the sandbox gateway', () => {
    expect(invoke('GET', '/api/v1/organizations/org/apis', demoToken)).toBe('next');
    expect(invoke('POST', '/gateway/demo-weather/v1/current', demoToken)).toBe('next');
    expect(invoke('POST', '/api/v1/ai/explain', demoToken)).toBe('next');
  });

  it('allows a registered session to continue into route authorization', () => {
    expect(invoke('POST', '/api/v1/organizations/org/apis', userToken)).toBe('next');
  });
});
