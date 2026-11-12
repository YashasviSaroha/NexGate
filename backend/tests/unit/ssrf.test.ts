import { describe, it, expect } from 'vitest';
import { validateUpstreamUrl } from '../../src/utils/ssrf.js';

describe('SSRF Protection & URL Validation', () => {
  it('allows valid public HTTP and HTTPS domains', async () => {
    const target = await validateUpstreamUrl('https://api.github.com');
    expect(target.hostname).toBe('api.github.com');
    expect(target.url.protocol).toBe('https:');
    expect(target.pinnedAddress.length).toBeGreaterThan(0);
  });

  it('rejects unsupported protocols like ftp:, file:, javascript:', async () => {
    await expect(validateUpstreamUrl('ftp://example.com')).rejects.toThrow(
      'Upstream protocol must be HTTP or HTTPS.'
    );
    await expect(validateUpstreamUrl('file:///etc/passwd')).rejects.toThrow(
      'Upstream protocol must be HTTP or HTTPS.'
    );
  });

  it('rejects loopback addresses in production mode', async () => {
    await expect(validateUpstreamUrl('http://127.0.0.1:8080', false)).rejects.toThrow(
      'Access to loopback address is not allowed.'
    );
    await expect(validateUpstreamUrl('http://localhost:3000', false)).rejects.toThrow(
      'Access to loopback address is not allowed.'
    );
  });

  it('rejects cloud metadata IP addresses', async () => {
    await expect(validateUpstreamUrl('http://169.254.169.254/latest/meta-data', false)).rejects.toThrow();
  });

  it('rejects private and unique-local addresses', async () => {
    await expect(validateUpstreamUrl('http://10.1.2.3/latest', false)).rejects.toThrow();
    await expect(validateUpstreamUrl('http://[fd00::1]/', false)).rejects.toThrow();
  });

  it('allows loopback only when the caller opts in', async () => {
    await expect(validateUpstreamUrl('http://127.0.0.1:3000/mock', false)).rejects.toThrow();
    const target = await validateUpstreamUrl('http://127.0.0.1:3000/mock', true);
    expect(target.pinnedAddress).toBe('127.0.0.1');
  });
});
