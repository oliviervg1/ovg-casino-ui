import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { createRegenLimit } from '../middleware/regenLimit.js';
import { ASSET_PROMPTS } from '../lib/prompts.js';
import { createStorage } from '../lib/storage.js';
import { generateImage } from '../lib/gemini.js';
import { readOrGenerateGlobal, regenerateShadow } from '../lib/cache.js';
import { loadConfig } from '../lib/config.js';

function aspectFor(key: string): '1:1' | '16:9' {
  return key.startsWith('bg_') ? '16:9' : '1:1';
}

export function createAssetRouter() {
  const config = loadConfig();
  const storage = createStorage(config.gcsBucket);
  const regenLimit = createRegenLimit({ limitPerDay: config.regenLimitPerDay });
  const router = Router();

  router.get('/:key', verifyFirebaseToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key as string;
      if (!Object.prototype.hasOwnProperty.call(ASSET_PROMPTS, key)) {
        res.status(400).json({ error: 'unknown_key' });
        return;
      }
      const uid = req.uid!;
      const shadowName = `assets/v1/users/${uid}/${key}.png`;
      const globalName = `assets/v1/global/${key}.png`;

      if (await storage.headObject(shadowName)) {
        const url = await storage.signUrl(shadowName, config.signedUrlTtlSec);
        res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
        return;
      }

      const url = await readOrGenerateGlobal({
        storage,
        objectName: globalName,
        contentType: 'image/png',
        ttlSec: config.signedUrlTtlSec,
        generator: () => generateImage({ apiKey: config.geminiApiKey, prompt: ASSET_PROMPTS[key], aspectRatio: aspectFor(key) }),
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:key/regenerate', verifyFirebaseToken, regenLimit, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key as string;
      if (!Object.prototype.hasOwnProperty.call(ASSET_PROMPTS, key)) {
        res.status(400).json({ error: 'unknown_key' });
        return;
      }
      const uid = req.uid!;
      const shadowName = `assets/v1/users/${uid}/${key}.png`;
      const url = await regenerateShadow({
        storage,
        objectName: shadowName,
        contentType: 'image/png',
        ttlSec: config.signedUrlTtlSec,
        generator: () => generateImage({ apiKey: config.geminiApiKey, prompt: ASSET_PROMPTS[key], aspectRatio: aspectFor(key) }),
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
