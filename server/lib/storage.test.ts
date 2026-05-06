import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFile = {
  exists: vi.fn(),
  save: vi.fn(),
  getSignedUrl: vi.fn(),
};
const mockBucket = { file: vi.fn(() => mockFile) };
const mockStorage = { bucket: vi.fn(() => mockBucket) };

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn(() => mockStorage),
}));

describe('storage wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('headObject returns true when the object exists', async () => {
    mockFile.exists.mockResolvedValueOnce([true]);
    const { createStorage } = await import('./storage.js');
    const s = createStorage('my-bucket');
    expect(await s.headObject('foo/bar.png')).toBe(true);
    expect(mockBucket.file).toHaveBeenCalledWith('foo/bar.png');
  });

  it('headObject returns false when the object is missing', async () => {
    mockFile.exists.mockResolvedValueOnce([false]);
    const { createStorage } = await import('./storage.js');
    const s = createStorage('my-bucket');
    expect(await s.headObject('foo/bar.png')).toBe(false);
  });

  it('uploadObject writes bytes with the given content-type and cache-control', async () => {
    mockFile.save.mockResolvedValueOnce(undefined);
    const { createStorage } = await import('./storage.js');
    const s = createStorage('my-bucket');
    await s.uploadObject('foo/bar.png', Buffer.from('hi'), 'image/png', 'public, max-age=31536000, immutable');
    expect(mockFile.save).toHaveBeenCalledWith(Buffer.from('hi'), {
      contentType: 'image/png',
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      resumable: false,
    });
  });

  it('signUrl returns a V4 signed URL with expires = now + ttlSec * 1000', async () => {
    mockFile.getSignedUrl.mockResolvedValueOnce(['https://storage.googleapis.com/signed/foo']);
    const { createStorage } = await import('./storage.js');
    const s = createStorage('my-bucket');
    const before = Date.now();
    const url = await s.signUrl('foo/bar.png', 3600);
    const after = Date.now();
    expect(url).toBe('https://storage.googleapis.com/signed/foo');
    const callArg = mockFile.getSignedUrl.mock.calls[0][0];
    expect(callArg.action).toBe('read');
    expect(callArg.version).toBe('v4');
    // Lock in the multiplication: ttlSec * 1000 (not seconds, not microseconds).
    expect(callArg.expires).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(callArg.expires).toBeLessThanOrEqual(after + 3600 * 1000);
  });
});
