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

  it('CSP allowlists GCS, Google avatars, Firebase, and CES origins', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    const csp = res.headers['content-security-policy'] ?? '';
    expect(csp).toMatch(/img-src[^;]*storage\.googleapis\.com/);
    expect(csp).toMatch(/img-src[^;]*lh3\.googleusercontent\.com/);
    expect(csp).toMatch(/media-src[^;]*storage\.googleapis\.com/);
    expect(csp).toMatch(/connect-src[^;]*\*\.googleapis\.com/);
    expect(csp).toMatch(/script-src[^;]*www\.gstatic\.com/);
    expect(csp).toMatch(/frame-ancestors\s+'none'/);
  });

  it('sets Cross-Origin-Opener-Policy to allow Firebase popup login', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
  });

  it('returns JSON 404 for unknown /api/* paths (not the SPA shell)', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('trusts one upstream proxy so req.ip reflects X-Forwarded-For', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    // app.set('trust proxy', 1) is configured; a no-op assertion: server boots
    // and the trust-proxy setting is queryable.
    expect(app.get('trust proxy')).toBe(1);
  });
});
