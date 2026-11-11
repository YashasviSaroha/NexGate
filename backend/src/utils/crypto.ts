import crypto from 'crypto';

export interface GeneratedApiKey {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
}

/**
 * Generate a cryptographically secure API key
 * Prefix: ng_live_ or ng_test_
 * Format: ng_{env}_{8 char lookup prefix}_{32 random hex chars}
 */
export function generateApiKey(environment: 'LIVE' | 'TEST' = 'LIVE'): GeneratedApiKey {
  const envPrefix = environment === 'LIVE' ? 'ng_live' : 'ng_test';
  const prefixId = crypto.randomBytes(4).toString('hex'); // 8 hex chars
  const secretRandom = crypto.randomBytes(24).toString('hex'); // 48 hex chars

  const fullKey = `${envPrefix}_${prefixId}_${secretRandom}`;
  const keyPrefix = `${envPrefix}_${prefixId}`;
  const keyHash = hashApiKey(fullKey);

  return {
    fullKey,
    keyPrefix,
    keyHash,
  };
}

/**
 * Hash API Key using SHA-256 for secure, irreversible database storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate secure random token for password resets or webhook secrets
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * HMAC-SHA256 signature generator for webhooks
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
