import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.GCS_BUCKET;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
    delete process.env.PORT;
    delete process.env.RATE_LIMIT_RPM;
    delete process.env.REGEN_RATE_LIMIT_PER_DAY;
    delete process.env.SIGNED_URL_TTL_SEC;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads required string vars', async () => {
    process.env.GCS_BUCKET = 'my-bucket';
    process.env.FIREBASE_PROJECT_ID = 'my-project';
    process.env.GEMINI_API_KEY = 'key123';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.gcsBucket).toBe('my-bucket');
    expect(cfg.firebaseProjectId).toBe('my-project');
    expect(cfg.geminiApiKey).toBe('key123');
  });

  it('throws with the variable name when a required var is missing', async () => {
    process.env.GCS_BUCKET = 'my-bucket';
    process.env.FIREBASE_PROJECT_ID = 'my-project';
    // GEMINI_API_KEY missing
    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow(/GEMINI_API_KEY/);
  });

  it('applies defaults for optional ints', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.port).toBe(8080);
    expect(cfg.signedUrlTtlSec).toBe(3600);
    expect(cfg.rateLimitRpm).toBe(30);
    expect(cfg.regenLimitPerDay).toBe(200);
  });

  it('coerces optional ints from string env', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    process.env.PORT = '9090';
    process.env.RATE_LIMIT_RPM = '60';
    process.env.REGEN_RATE_LIMIT_PER_DAY = '500';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.port).toBe(9090);
    expect(cfg.rateLimitRpm).toBe(60);
    expect(cfg.regenLimitPerDay).toBe(500);
  });

  it('throws if an optional int var is non-numeric', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    process.env.PORT = 'not-a-number';
    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow(/PORT/);
  });
});
