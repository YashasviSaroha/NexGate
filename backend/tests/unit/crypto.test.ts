import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, generateRandomToken, signWebhookPayload } from '../../src/utils/crypto.js';

describe('Cryptographic Utilities', () => {
  it('generates secure live API key with correct format and prefix', () => {
    const keyData = generateApiKey('LIVE');

    expect(keyData.fullKey).toMatch(/^ng_live_[a-f0-9]{8}_[a-f0-9]{48}$/);
    expect(keyData.keyPrefix).toMatch(/^ng_live_[a-f0-9]{8}$/);
    expect(keyData.keyHash).toHaveLength(64); // SHA-256 is 64 hex characters
    expect(hashApiKey(keyData.fullKey)).toBe(keyData.keyHash);
  });

  it('generates secure test API key with test prefix', () => {
    const keyData = generateApiKey('TEST');
    expect(keyData.fullKey.startsWith('ng_test_')).toBe(true);
    expect(keyData.keyPrefix.startsWith('ng_test_')).toBe(true);
  });

  it('generates unique keys on successive calls', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.fullKey).not.toBe(key2.fullKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
  });

  it('produces reliable HMAC-SHA256 signatures for webhooks', () => {
    const payload = JSON.stringify({ event: 'api.created', id: '123' });
    const secret = 'whsec_test_secret_key';
    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);

    expect(sig1).toHaveLength(64);
    expect(sig1).toBe(sig2);

    const sigDifferentPayload = signWebhookPayload('other', secret);
    expect(sig1).not.toBe(sigDifferentPayload);
  });
});
