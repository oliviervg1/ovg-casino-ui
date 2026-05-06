import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('id-token-xyz') } },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('AssetManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.resetModules();
  });

  it('getAsset GETs /api/asset/:key with Bearer token and returns the URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/x', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getAsset } = await import('./AssetManager');
    const url = await getAsset('roulette_sweets');
    expect(url).toBe('https://signed/x');
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('/api/asset/roulette_sweets');
    expect(init.headers.Authorization).toBe('Bearer id-token-xyz');
  });

  it('second call within TTL returns memoised URL without refetch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/x', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getAsset } = await import('./AssetManager');
    await getAsset('roulette_sweets');
    await getAsset('roulette_sweets');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('refetches if memo entry is within 60s of expiry', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/old', expiresAt: Date.now() + 30_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/new', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset } = await import('./AssetManager');
    const u1 = await getAsset('roulette_sweets');
    const u2 = await getAsset('roulette_sweets');
    expect(u1).toBe('https://signed/old');
    expect(u2).toBe('https://signed/new');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetch error rejects without poisoning memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'oops' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/ok', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset } = await import('./AssetManager');
    await expect(getAsset('roulette_sweets')).rejects.toThrow();
    const u = await getAsset('roulette_sweets');
    expect(u).toBe('https://signed/ok');
  });

  it('regenerateAsset POSTs to /regenerate, replaces memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v1', expiresAt: Date.now() + 3_600_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset, regenerateAsset } = await import('./AssetManager');
    await getAsset('roulette_sweets');
    const u = await regenerateAsset('roulette_sweets');
    expect(u).toBe('https://signed/v2');
    const [postUrl, postInit] = fetchMock.mock.calls[1];
    expect(postUrl).toBe('/api/asset/roulette_sweets/regenerate');
    expect(postInit.method).toBe('POST');
    const u2 = await getAsset('roulette_sweets');
    expect(u2).toBe('https://signed/v2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('regenerateAsset throws RegenQuotaExceededError on 429', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'regen_quota_exceeded' }) });
    const { regenerateAsset, RegenQuotaExceededError } = await import('./AssetManager');
    await expect(regenerateAsset('roulette_sweets')).rejects.toBeInstanceOf(RegenQuotaExceededError);
  });
});
