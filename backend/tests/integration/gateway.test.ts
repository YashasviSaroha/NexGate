import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('API Gateway & Server Integration', () => {
  it('serves health check with brand metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.product).toBe('NexGate');
    expect(res.body.status).toBe('healthy');
  });

  it('serves mock upstream weather endpoint directly', async () => {
    const res = await request(app).get('/mock-upstream/weather/current?city=Tokyo');
    expect(res.status).toBe(200);
    expect(res.body.location).toBe('Tokyo');
    expect(res.body.temperatureC).toBeDefined();
  });

  it('rejects gateway proxy requests when X-API-Key is missing with 401', async () => {
    const res = await request(app).get('/gateway/weather-api/v1/current');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Missing API Key');
  });

  it('rejects gateway proxy requests with invalid key format with 401', async () => {
    const res = await request(app)
      .get('/gateway/weather-api/v1/current')
      .set('X-API-Key', 'invalid_random_key_123');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
