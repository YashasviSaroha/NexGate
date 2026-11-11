import dns from 'dns/promises';
import { URL } from 'url';
import { BadRequestError } from './errors.js';

// Blocked IP ranges: loopback, link-local, private networks, cloud metadata
const BLOCKED_IP_PATTERNS = [
  /^127\./,                         // Loopback IPv4
  /^0\./,                           // Current network
  /^10\./,                          // Private class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B
  /^192\.168\./,                    // Private class C
  /^169\.254\./,                    // Link-local / AWS / GCP / Azure metadata
  /^::1$/,                          // Loopback IPv6
  /^fc00:/i,                        // IPv6 Unique local address
  /^fe80:/i,                        // IPv6 Link-local
];

export async function validateUpstreamUrl(
  urlString: string,
  allowLocalhostInDev = process.env.NODE_ENV !== 'production'
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new BadRequestError('Invalid upstream URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('Upstream protocol must be HTTP or HTTPS.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // In dev/test, we may allow explicit localhost testing
  if (allowLocalhostInDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return parsed;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    throw new BadRequestError('Access to loopback address is not allowed.');
  }

  // Resolve hostname to IP to protect against DNS rebinding and private subnet routing
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      for (const pattern of BLOCKED_IP_PATTERNS) {
        if (pattern.test(record.address)) {
          throw new BadRequestError(`Upstream host resolves to restricted IP range (${record.address}).`);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadRequestError(`Unable to resolve upstream hostname: ${hostname}`);
  }

  return parsed;
}
