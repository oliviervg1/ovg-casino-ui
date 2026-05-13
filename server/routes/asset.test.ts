import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../middleware/auth.js', () => ({
  verifyFirebaseToken: (req: any, _res: any, next: any) => { req.uid = req.headers['x-test-uid'] || 'u1'; next(); },
}));

vi.mock('../middleware/regenLimit.js', () => ({
  createRegenLimit: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../lib/prompts.js', () => ({
  ASSET_PROMPTS: { 'roulette_sweets': 'a roulette wheel', 'unknown_no': 'never used' },
  MUSIC_PROMPTS: {},
}));

const headObject = vi.fn();
const uploadObject = vi.fn();
const signUrl = vi.fn();

vi.mock('../lib/storage.js', () => ({
  createStorage: () => ({ headObject, uploadObject, signUrl }),
}));

const generateImage = vi.fn();
vi.mock('../lib/gemini.js', () => ({ generateImage, generateMusic: vi.fn() }));

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

async function makeApp() {
  const { createAssetRouter } = await import('./asset.js');
  const { verifyFirebaseToken } = await import('../middleware/auth.js');
  const { errorHandler } = await import('../middleware/errors.js');
  const app = express();
  app.use(express.json());
  // Mirror production wiring: auth at app level, then router.
  app.use('/api/asset', verifyFirebaseToken, createAssetRouter());
  app.use(errorHandler);
  return app;
}

describe('assets route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headObject.mockReset();
    uploadObject.mockReset();
    signUrl.mockReset();
    generateImage.mockReset();
  });

  it('GET unknown :key → 400 with no generator call', async () => {
    const app = await makeApp();
    const res = await request(app).get('/api/asset/not_a_real_key');
    expect(res.status).toBe(400);
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('GET prefers user-shadow over global when both exist', async () => {
    headObject.mockResolvedValueOnce(true);
    signUrl.mockResolvedValueOnce('https://signed/shadow');
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u-alice');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/shadow');
    expect(headObject).toHaveBeenCalledWith('assets/v2/users/u-alice/roulette_sweets.png');
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('GET cache miss → generator invoked once, written to global path, signed', async () => {
    headObject.mockResolvedValueOnce(false);
    headObject.mockResolvedValueOnce(false);
    generateImage.mockResolvedValueOnce({ bytes: Buffer.from('img'), mimeType: 'image/png' });
    signUrl.mockResolvedValueOnce('https://signed/global');
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/global');
    expect(generateImage).toHaveBeenCalledOnce();
    expect(uploadObject).toHaveBeenCalledWith(
      'assets/v2/global/roulette_sweets.png',
      Buffer.from('img'),
      'image/png',
      'public, max-age=31536000, immutable',
    );
  });

  it('GET generator throws → 502 sanitised body', async () => {
    headObject.mockResolvedValue(false);
    generateImage.mockRejectedValueOnce(new Error('Gemini PERMISSION_DENIED key=secret'));
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u1');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'generation_failed' });
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });

  it('POST /:key/regenerate always calls generator, writes to user-shadow path', async () => {
    generateImage.mockResolvedValueOnce({ bytes: Buffer.from('rolled'), mimeType: 'image/png' });
    signUrl.mockResolvedValueOnce('https://signed/u1-shadow');
    const app = await makeApp();
    const res = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/u1-shadow');
    expect(generateImage).toHaveBeenCalledOnce();
    expect(uploadObject).toHaveBeenCalledWith(
      'assets/v2/users/u1/roulette_sweets.png',
      Buffer.from('rolled'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
    expect(headObject).not.toHaveBeenCalled();
  });

  it('two uids regenerating the same key produce isolated objects', async () => {
    generateImage
      .mockResolvedValueOnce({ bytes: Buffer.from('alice'), mimeType: 'image/png' })
      .mockResolvedValueOnce({ bytes: Buffer.from('bob'), mimeType: 'image/png' });
    signUrl
      .mockResolvedValueOnce('https://signed/alice')
      .mockResolvedValueOnce('https://signed/bob');
    const app = await makeApp();
    const r1 = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'alice');
    const r2 = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'bob');
    expect(r1.body.url).toBe('https://signed/alice');
    expect(r2.body.url).toBe('https://signed/bob');
    expect(uploadObject).toHaveBeenNthCalledWith(1,
      'assets/v2/users/alice/roulette_sweets.png',
      Buffer.from('alice'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
    expect(uploadObject).toHaveBeenNthCalledWith(2,
      'assets/v2/users/bob/roulette_sweets.png',
      Buffer.from('bob'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
  });

  it('POST unknown :key → 400 with no generator call', async () => {
    const app = await makeApp();
    const res = await request(app).post('/api/asset/not_a_key/regenerate');
    expect(res.status).toBe(400);
    expect(generateImage).not.toHaveBeenCalled();
  });
});
