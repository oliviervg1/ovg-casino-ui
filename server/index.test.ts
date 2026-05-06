import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('firebase-admin', () => ({
  default: {
    apps: [{}],
    initializeApp: vi.fn(),
    auth: () => ({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) }),
    firestore: () => ({}),
  },
  apps: [{}],
  initializeApp: vi.fn(),
  auth: () => ({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) }),
  firestore: () => ({}),
}));

vi.mock('./lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

vi.mock('./routes/asset.js', () => ({ createAssetRouter: () => (_req: any, _res: any, next: any) => next() }));
vi.mock('./routes/music.js', () => ({ createMusicRouter: () => (_req: any, _res: any, next: any) => next() }));

describe('server bootstrap', () => {
  beforeEach(() => vi.resetModules());

  it('GET /healthz returns 200 unauthenticated', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  it('serves Helmet headers on responses', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
});
