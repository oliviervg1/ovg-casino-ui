import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.js';
import { createAssetRouter } from './routes/asset.js';
import { createMusicRouter } from './routes/music.js';
import { errorHandler } from './middleware/errors.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export function createApp(): Express {
  const config = loadConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-ancestors': ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use(cors({ origin: false }));
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok');
  });

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.uid ?? req.ip ?? 'anon',
  });

  app.use('/api/asset', apiLimiter, createAssetRouter());
  app.use('/api/music', apiLimiter, createMusicRouter());

  // Static client (built React) — only when present (production)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath, { maxAge: '1h' }));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(JSON.stringify({ msg: 'listening', port: config.port }));
  });
}
