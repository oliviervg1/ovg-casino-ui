import { Storage } from '@google-cloud/storage';

export interface StorageWrapper {
  headObject(objectName: string): Promise<boolean>;
  uploadObject(objectName: string, body: Buffer, contentType: string, cacheControl: string): Promise<void>;
  signUrl(objectName: string, ttlSec: number): Promise<string>;
}

export function createStorage(bucketName: string): StorageWrapper {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);

  return {
    async headObject(objectName) {
      const [exists] = await bucket.file(objectName).exists();
      return exists;
    },

    async uploadObject(objectName, body, contentType, cacheControl) {
      await bucket.file(objectName).save(body, {
        contentType,
        metadata: { cacheControl },
        resumable: false,
      });
    },

    async signUrl(objectName, ttlSec) {
      const [url] = await bucket.file(objectName).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + ttlSec * 1000,
      });
      return url;
    },
  };
}
