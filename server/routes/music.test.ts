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
  ASSET_PROMPTS: {},
  MUSIC_PROMPTS: { 'sweets_roulette': 'jazzy candy music' },
}));

const headObject = vi.fn();
const uploadObject = vi.fn();
const signUrl = vi.fn();

vi.mock('../lib/storage.js', () => ({
  createStorage: () => ({ headObject, uploadObject, signUrl }),
}));

const generateMusic = vi.fn();
vi.mock('../lib/gemini.js', () => ({ generateImage: vi.fn(), generateMusic }));

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

async function makeApp() {
  const { createMusicRouter } = await import('./music.js');
  const { verifyFirebaseToken } = await import('../middleware/auth.js');
  const { errorHandler } = await import('../middleware/errors.js');
  const app = express();
  app.use(express.json());
  // Mirror production wiring: auth at app level, then router.
  app.use('/api/music', verifyFirebaseToken, createMusicRouter());
  app.use(errorHandler);
  return app;
}

describe('music route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headObject.mockReset();
    uploadObject.mockReset();
    signUrl.mockReset();
    generateMusic.mockReset();
  });

  it('GET unknown theme/gameType → 400', async () => {
    const app = await makeApp();
    const res = await request(app).get('/api/music/nope/zzz');
    expect(res.status).toBe(400);
    expect(generateMusic).not.toHaveBeenCalled();
  });

  it('GET prefers user-shadow over global', async () => {
    headObject.mockResolvedValueOnce(true);
    signUrl.mockResolvedValueOnce('https://signed/u1-music-shadow');
    const app = await makeApp();
    const res = await request(app).get('/api/music/sweets/roulette').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/u1-music-shadow');
    expect(headObject).toHaveBeenCalledWith('music/v1/users/u1/sweets_roulette.wav');
    expect(generateMusic).not.toHaveBeenCalled();
  });

  it('GET cache miss writes to global path', async () => {
    headObject.mockResolvedValueOnce(false);
    headObject.mockResolvedValueOnce(false);
    generateMusic.mockResolvedValueOnce({ bytes: Buffer.from('m'), mimeType: 'audio/wav' });
    signUrl.mockResolvedValueOnce('https://signed/m-global');
    const app = await makeApp();
    const res = await request(app).get('/api/music/sweets/roulette').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(uploadObject).toHaveBeenCalledWith(
      'music/v1/global/sweets_roulette.wav',
      Buffer.from('m'),
      'audio/wav',
      'public, max-age=31536000, immutable',
    );
  });

  it('POST /regenerate writes to user-shadow with private cache-control', async () => {
    generateMusic.mockResolvedValueOnce({ bytes: Buffer.from('r'), mimeType: 'audio/wav' });
    signUrl.mockResolvedValueOnce('https://signed/u1-rolled');
    const app = await makeApp();
    const res = await request(app).post('/api/music/sweets/roulette/regenerate').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(uploadObject).toHaveBeenCalledWith(
      'music/v1/users/u1/sweets_roulette.wav',
      Buffer.from('r'),
      'audio/wav',
      'private, max-age=31536000, immutable',
    );
  });

  it('POST unknown theme/gameType → 400', async () => {
    const app = await makeApp();
    const res = await request(app).post('/api/music/nope/zzz/regenerate');
    expect(res.status).toBe(400);
    expect(generateMusic).not.toHaveBeenCalled();
  });
});
