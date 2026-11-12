import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';
import { BadRequestError } from './errors.js';

const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface UpstreamTarget {
  url: URL;
  hostname: string;
  pinnedAddress: string;
  family: 4 | 6;
}

function allowLocalUpstream(explicit?: boolean): boolean {
  if (typeof explicit === 'boolean') return explicit;
  return process.env.ALLOW_LOCAL_UPSTREAM === 'true';
}

function unwrapMappedIpv4(address: string): string {
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped ? mapped[1] : address;
}

export function isBlockedAddress(address: string): boolean {
  const normalized = unwrapMappedIpv4(address.trim().toLowerCase());
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(normalized));
}

function familyOf(address: string): 4 | 6 {
  return net.isIP(unwrapMappedIpv4(address)) === 6 ? 6 : 4;
}

export async function validateUpstreamUrl(
  urlString: string,
  allowLocalhost?: boolean
): Promise<UpstreamTarget> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new BadRequestError('Invalid upstream URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('Upstream protocol must be HTTP or HTTPS.');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const permitLoopback = allowLocalUpstream(allowLocalhost);

  if (LOOPBACK_HOSTS.has(hostname)) {
    if (!permitLoopback) {
      throw new BadRequestError('Access to loopback address is not allowed.');
    }
    const pinnedAddress = hostname === '::1' ? '::1' : '127.0.0.1';
    return {
      url: parsed,
      hostname,
      pinnedAddress,
      family: hostname === '::1' ? 6 : 4,
    };
  }

  const literal = net.isIP(hostname);
  if (literal !== 0) {
    if (isBlockedAddress(hostname)) {
      throw new BadRequestError(`Upstream host resolves to restricted IP range (${hostname}).`);
    }
    return {
      url: parsed,
      hostname,
      pinnedAddress: hostname,
      family: literal === 6 ? 6 : 4,
    };
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BadRequestError(`Unable to resolve upstream hostname: ${hostname}`);
  }

  if (records.length === 0) {
    throw new BadRequestError(`Unable to resolve upstream hostname: ${hostname}`);
  }

  for (const record of records) {
    if (isBlockedAddress(record.address)) {
      throw new BadRequestError(`Upstream host resolves to restricted IP range (${record.address}).`);
    }
  }

  const chosen = records[0];
  return {
    url: parsed,
    hostname,
    pinnedAddress: unwrapMappedIpv4(chosen.address),
    family: familyOf(chosen.address),
  };
}
