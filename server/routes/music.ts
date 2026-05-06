import { Router, type Request, type Response, type NextFunction } from 'express';
import { createRegenLimit } from '../middleware/regenLimit.js';
import { consumeGenerationToken } from '../middleware/genLimit.js';
import { MUSIC_PROMPTS } from '../lib/prompts.js';
import { createStorage } from '../lib/storage.js';
import { generateMusic } from '../lib/gemini.js';
import { readOrGenerateGlobal, regenerateShadow } from '../lib/cache.js';
import { loadConfig } from '../lib/config.js';

export function createMusicRouter() {
  const config = loadConfig();
  const storage = createStorage(config.gcsBucket, config.signerSaEmail);
  const regenLimit = createRegenLimit({ limitPerDay: config.regenLimitPerDay, databaseId: config.firestoreDatabaseId });
  const router = Router();

  router.get('/:theme/:gameType', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { theme, gameType } = req.params as { theme: string; gameType: string };
      const key = `${theme}_${gameType}`;
      if (!Object.prototype.hasOwnProperty.call(MUSIC_PROMPTS, key)) {
        res.status(400).json({ error: 'unknown_key' });
        return;
      }
      const uid = req.uid!;
      const shadowName = `music/v1/users/${uid}/${key}.wav`;
      const globalName = `music/v1/global/${key}.wav`;

      if (await storage.headObject(shadowName)) {
        const url = await storage.signUrl(shadowName, config.signedUrlTtlSec);
        res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
        return;
      }

      const url = await readOrGenerateGlobal({
        storage,
        objectName: globalName,
        contentType: 'audio/wav',
        ttlSec: config.signedUrlTtlSec,
        // Token consumed only on cache miss (when we actually call Lyria).
        generator: () => {
          consumeGenerationToken(uid, config.rateLimitRpm);
          return generateMusic({ apiKey: config.geminiApiKey, prompt: MUSIC_PROMPTS[key] });
        },
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:theme/:gameType/regenerate', regenLimit, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { theme, gameType } = req.params as { theme: string; gameType: string };
      const key = `${theme}_${gameType}`;
      if (!Object.prototype.hasOwnProperty.call(MUSIC_PROMPTS, key)) {
        res.status(400).json({ error: 'unknown_key' });
        return;
      }
      const uid = req.uid!;
      const shadowName = `music/v1/users/${uid}/${key}.wav`;
      const url = await regenerateShadow({
        storage,
        objectName: shadowName,
        contentType: 'audio/wav',
        ttlSec: config.signedUrlTtlSec,
        // POST /regenerate always generates.
        generator: () => {
          consumeGenerationToken(uid, config.rateLimitRpm);
          return generateMusic({ apiKey: config.geminiApiKey, prompt: MUSIC_PROMPTS[key] });
        },
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
