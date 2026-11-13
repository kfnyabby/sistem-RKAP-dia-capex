import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Health API Endpoints', () => {
  it('GET /api/health should return status 200 with status ok and timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / should return root server message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API RKAP Server is running' });
  });
});

