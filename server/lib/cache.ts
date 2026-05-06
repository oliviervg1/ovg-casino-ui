import type { StorageWrapper } from './storage.js';
import type { GeneratedAsset } from './gemini.js';

export type Generator = () => Promise<GeneratedAsset>;

export interface ReadOrGenerateArgs {
  storage: StorageWrapper;
  objectName: string;
  contentType: string;
  ttlSec: number;
  generator: Generator;
}

const PUBLIC_CACHE = 'public, max-age=31536000, immutable';
const PRIVATE_CACHE = 'private, max-age=31536000, immutable';

const inFlight = new Map<string, Promise<string>>();

export async function readOrGenerateGlobal(args: ReadOrGenerateArgs): Promise<string> {
  const { storage, objectName, contentType, ttlSec, generator } = args;

  if (await storage.headObject(objectName)) {
    return storage.signUrl(objectName, ttlSec);
  }

  // Coalesce concurrent same-key requests on this instance.
  // Cross-instance dedup is bounded by GCS HEAD-on-arrival.
  const existing = inFlight.get(objectName);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const asset = await generator();
      await storage.uploadObject(objectName, asset.bytes, contentType, PUBLIC_CACHE);
      return await storage.signUrl(objectName, ttlSec);
    } finally {
      inFlight.delete(objectName);
    }
  })();
  inFlight.set(objectName, promise);
  return promise;
}

export async function regenerateShadow(args: ReadOrGenerateArgs): Promise<string> {
  const { storage, objectName, contentType, ttlSec, generator } = args;
  const asset = await generator();
  await storage.uploadObject(objectName, asset.bytes, contentType, PRIVATE_CACHE);
  return storage.signUrl(objectName, ttlSec);
}
