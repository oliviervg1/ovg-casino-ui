import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.js';
import { createAssetRouter } from './routes/asset.js';
import { createMusicRouter } from './routes/music.js';
import { verifyFirebaseToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export function createApp(): Express {
  const config = loadConfig();
  const app = express();

  // Cloud Run terminates TLS at the GFE; trust exactly one upstream proxy
  // so req.ip reflects the real client (otherwise rate-limit keys collapse
  // to a single GFE address for the whole fleet).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Signed GCS asset and music URLs are loaded as <img>/<audio>; Google
        // profile photos come from lh3.googleusercontent.com.
        imgSrc: ["'self'", 'data:', 'https://storage.googleapis.com', 'https://lh3.googleusercontent.com'],
        mediaSrc: ["'self'", 'https://storage.googleapis.com'],
        // Firebase Auth + Firestore + identity toolkit. Wildcards cover
        // the various REST endpoints under googleapis.com / firebaseapp.com.
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseapp.com', 'https://identitytoolkit.googleapis.com'],
        // Firebase popup login renders an iframe under firebaseapp.com.
        frameSrc: ["'self'", 'https://*.firebaseapp.com'],
        // CES Messenger when enabled — gstatic for the widget, jsdelivr for handlebars.
        // Vite-injected styles need 'unsafe-inline' for tailwind utilities.
        scriptSrc: ["'self'", 'https://www.gstatic.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    // Firebase popup login posts results back via window.opener; default
    // 'same-origin' COOP severs the opener reference.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Allow cross-origin <img>/<audio> from GCS without CORP errors.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({ origin: false }));
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok');
  });

  // Per-uid 429 (per-minute window). Mounted AFTER verifyFirebaseToken so
  // req.uid is set; the IP fallback is defence-in-depth (auth would already
  // have returned 401 if no token were present).
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.uid ?? req.ip ?? 'anon',
    handler: (_req, res) => {
      res.status(429).json({ error: 'rate_limit' });
    },
  });

  // Authenticated API: auth → per-uid limit → router.
  app.use('/api/asset', verifyFirebaseToken, apiLimiter, createAssetRouter());
  app.use('/api/music', verifyFirebaseToken, apiLimiter, createMusicRouter());

  // Anything else under /api/* is a typo or missing route — return JSON 404
  // BEFORE the SPA catch-all so we don't serve index.html with status 200.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Static client (built React) — only mounted when dist/ exists. In dev
  // (npm run dev:server alone, no build) the SPA is served by Vite on a
  // separate port; mounting a sendFile fallback here would 502 on every
  // unmatched path because index.html doesn't exist yet.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.get(/.*/, (_req: Request, res: Response, next: NextFunction) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

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
