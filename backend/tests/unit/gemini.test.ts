import { describe, expect, it } from 'vitest';
import { parseModelJson, sanitizeForModel } from '../../src/modules/ai/gemini.js';

describe('gemini response handling', () => {
  it('removes API keys and bearer tokens before a prompt is sent', () => {
    const raw = 'use ng_live_abcd1234_' + 'a'.repeat(48) + ' and Bearer secret-token';
    const clean = sanitizeForModel(raw);
    expect(clean).not.toContain('ng_live_');
    expect(clean).not.toContain('secret-token');
    expect(clean).toContain('YOUR_API_KEY');
  });

  it('reads a JSON object wrapped in extra text', () => {
    const parsed = parseModelJson('note {"summary":"Weather","endpoints":[]} trailing');
    expect(parsed).toEqual({ summary: 'Weather', endpoints: [] });
  });

  it('rejects a response that is not JSON', () => {
    expect(() => parseModelJson('no object here')).toThrow(/unexpected response/i);
  });
});
