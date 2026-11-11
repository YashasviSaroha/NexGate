import { describe, it, expect } from 'vitest';
import { validateUpstreamUrl } from '../../src/utils/ssrf.js';

describe('SSRF Protection & URL Validation', () => {
  it('allows valid public HTTP and HTTPS domains', async () => {
    const url = await validateUpstreamUrl('https://api.github.com');
    expect(url.hostname).toBe('api.github.com');
    expect(url.protocol).toBe('https:');
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
});
