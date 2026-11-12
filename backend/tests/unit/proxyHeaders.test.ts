import { describe, it, expect } from 'vitest';
import { buildForwardHeaders, encodeUpstreamBody, scopeAllows } from '../../src/modules/gateway/gateway.service.js';

describe('Gateway request hardening', () => {
  it('does not forward cookies or the caller content-length', () => {
    const headers = buildForwardHeaders(
      {
        cookie: 'nexgate_token=secret',
        authorization: 'Bearer ng_live_example',
        'x-api-key': 'ng_live_example',
        'content-length': '999',
        accept: 'application/json',
      },
      { host: 'upstream.example', clientIp: '203.0.113.8', proto: 'https', contentLength: 18 }
    );

    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['content-length']).toBe('18');
    expect(headers.host).toBe('upstream.example');
    expect(headers['x-forwarded-for']).toBe('203.0.113.8');
    expect(headers.accept).toBe('application/json');
  });

  it('encodes JSON bodies to the bytes that content-length describes', () => {
    const body = encodeUpstreamBody('POST', { city: 'Tokyo' });
    expect(body?.toString()).toBe('{"city":"Tokyo"}');
    expect(encodeUpstreamBody('GET', { city: 'Tokyo' })).toBeUndefined();
  });

  it('enforces key scopes and allows an empty scope list', () => {
    expect(scopeAllows(null, 'GET', 'current')).toBe(true);
    expect(scopeAllows(['GET /current'], 'GET', 'current')).toBe(true);
    expect(scopeAllows(['GET /current'], 'POST', 'current')).toBe(false);
    expect(scopeAllows(['POST /forecast'], 'GET', 'current')).toBe(false);
  });
});
