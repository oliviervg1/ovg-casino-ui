import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('id-token-xyz') } },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('MusicManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.resetModules();
  });

  it('getMusic GETs /api/music/:theme/:gameType with X-Firebase-Token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/m', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getMusic } = await import('./MusicManager');
    const url = await getMusic('sweets', 'roulette');
    expect(url).toBe('https://signed/m');
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/music/sweets/roulette');
    expect(init.headers['X-Firebase-Token']).toBe('id-token-xyz');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('memoises within TTL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/m', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getMusic } = await import('./MusicManager');
    await getMusic('sweets', 'roulette');
    await getMusic('sweets', 'roulette');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('regenerateMusic POSTs to /regenerate and replaces memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) });
    const { regenerateMusic } = await import('./MusicManager');
    const url = await regenerateMusic('sweets', 'roulette');
    expect(url).toBe('https://signed/v2');
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/music/sweets/roulette/regenerate');
    expect(init.method).toBe('POST');
  });

  it('regenerateMusic throws RegenQuotaExceededError on 429', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'regen_quota_exceeded' }) });
    const { regenerateMusic, RegenQuotaExceededError } = await import('./MusicManager');
    await expect(regenerateMusic('sweets', 'roulette')).rejects.toBeInstanceOf(RegenQuotaExceededError);
  });
});
