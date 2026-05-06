import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StorageWrapper } from './storage.js';

function makeStorage(): StorageWrapper {
  return {
    headObject: vi.fn(),
    uploadObject: vi.fn(),
    signUrl: vi.fn(),
  };
}

describe('readOrGenerateGlobal', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('cache hit signs without invoking the generator', async () => {
    const storage = makeStorage();
    (storage.headObject as any).mockResolvedValueOnce(true);
    (storage.signUrl as any).mockResolvedValueOnce('https://signed/global');
    const generator = vi.fn();
    const { readOrGenerateGlobal } = await import('./cache.js');
    const url = await readOrGenerateGlobal({
      storage,
      objectName: 'assets/v1/global/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    });
    expect(url).toBe('https://signed/global');
    expect(generator).not.toHaveBeenCalled();
  });

  it('cache miss invokes generator, uploads with public cache-control, signs', async () => {
    const storage = makeStorage();
    (storage.headObject as any).mockResolvedValueOnce(false);
    (storage.signUrl as any).mockResolvedValueOnce('https://signed/new');
    const generator = vi.fn().mockResolvedValueOnce({ bytes: Buffer.from('img'), mimeType: 'image/png' });
    const { readOrGenerateGlobal } = await import('./cache.js');
    const url = await readOrGenerateGlobal({
      storage,
      objectName: 'assets/v1/global/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    });
    expect(generator).toHaveBeenCalledOnce();
    expect(storage.uploadObject).toHaveBeenCalledWith(
      'assets/v1/global/k.png',
      Buffer.from('img'),
      'image/png',
      'public, max-age=31536000, immutable',
    );
    expect(url).toBe('https://signed/new');
  });

  it('coalesces concurrent calls for the same global key', async () => {
    const storage = makeStorage();
    (storage.headObject as any).mockResolvedValue(false);
    (storage.signUrl as any).mockResolvedValue('https://signed/coalesced');
    let resolveGen!: (v: any) => void;
    const genPromise = new Promise(r => { resolveGen = r; });
    const generator = vi.fn(() => genPromise as any);
    const { readOrGenerateGlobal } = await import('./cache.js');
    const args = {
      storage,
      objectName: 'assets/v1/global/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    };
    const p1 = readOrGenerateGlobal(args);
    const p2 = readOrGenerateGlobal(args);
    resolveGen({ bytes: Buffer.from('x'), mimeType: 'image/png' });
    const [u1, u2] = await Promise.all([p1, p2]);
    expect(u1).toBe('https://signed/coalesced');
    expect(u2).toBe('https://signed/coalesced');
    expect(generator).toHaveBeenCalledOnce();
  });

  it('does not write to GCS when the generator throws', async () => {
    const storage = makeStorage();
    (storage.headObject as any).mockResolvedValueOnce(false);
    const generator = vi.fn().mockRejectedValueOnce(new Error('upstream'));
    const { readOrGenerateGlobal } = await import('./cache.js');
    await expect(readOrGenerateGlobal({
      storage,
      objectName: 'assets/v1/global/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    })).rejects.toThrow('upstream');
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
});

describe('regenerateShadow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('always invokes generator (even when shadow exists), uploads with private cache-control', async () => {
    const storage = makeStorage();
    (storage.signUrl as any).mockResolvedValueOnce('https://signed/shadow');
    const generator = vi.fn().mockResolvedValueOnce({ bytes: Buffer.from('img'), mimeType: 'image/png' });
    const { regenerateShadow } = await import('./cache.js');
    const url = await regenerateShadow({
      storage,
      objectName: 'assets/v1/users/u1/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    });
    expect(generator).toHaveBeenCalledOnce();
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(storage.uploadObject).toHaveBeenCalledWith(
      'assets/v1/users/u1/k.png',
      Buffer.from('img'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
    expect(url).toBe('https://signed/shadow');
  });

  it('does not write when generator throws', async () => {
    const storage = makeStorage();
    const generator = vi.fn().mockRejectedValueOnce(new Error('upstream'));
    const { regenerateShadow } = await import('./cache.js');
    await expect(regenerateShadow({
      storage,
      objectName: 'assets/v1/users/u1/k.png',
      contentType: 'image/png',
      ttlSec: 3600,
      generator,
    })).rejects.toThrow('upstream');
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
});
