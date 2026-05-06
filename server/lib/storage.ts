import { Storage } from '@google-cloud/storage';
import { GoogleAuth, Impersonated } from 'google-auth-library';

export interface StorageWrapper {
  headObject(objectName: string): Promise<boolean>;
  uploadObject(objectName: string, body: Buffer, contentType: string, cacheControl: string): Promise<void>;
  signUrl(objectName: string, ttlSec: number): Promise<string>;
}

export function createStorage(bucketName: string, signerSaEmail?: string): StorageWrapper {
  // V4 signing calls iamcredentials.signBlob, which needs to identify a
  // target service account. User ADC (e.g. local dev in Cloud Shell) has
  // no SA identity and fails with "Gaia id not found". Wrapping in
  // Impersonated makes the storage client act as the named SA — caller
  // must hold roles/iam.serviceAccountTokenCreator on it. Impersonated needs
  // an awaited sourceClient, so the Storage instance is built lazily on
  // first use rather than at factory construction.
  let bucketPromise: Promise<ReturnType<Storage['bucket']>> | null = null;
  function getBucket() {
    if (bucketPromise) return bucketPromise;
    bucketPromise = (async () => {
      let storage: Storage;
      if (signerSaEmail) {
        const sourceAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
        const sourceClient = await sourceAuth.getClient();
        const impersonated = new Impersonated({
          sourceClient,
          targetPrincipal: signerSaEmail,
          targetScopes: ['https://www.googleapis.com/auth/cloud-platform'],
          lifetime: 3600,
        });
        storage = new Storage({ authClient: impersonated });
      } else {
        storage = new Storage();
      }
      return storage.bucket(bucketName);
    })();
    return bucketPromise;
  }

  return {
    async headObject(objectName) {
      const bucket = await getBucket();
      const [exists] = await bucket.file(objectName).exists();
      return exists;
    },

    async uploadObject(objectName, body, contentType, cacheControl) {
      const bucket = await getBucket();
      await bucket.file(objectName).save(body, {
        contentType,
        metadata: { cacheControl },
        resumable: false,
      });
    },

    async signUrl(objectName, ttlSec) {
      const bucket = await getBucket();
      const [url] = await bucket.file(objectName).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + ttlSec * 1000,
      });
      return url;
    },
  };
}
