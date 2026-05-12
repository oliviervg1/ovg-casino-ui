import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
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
  // Pass projectId only if explicitly configured; otherwise let firebase-admin
  // auto-detect via GOOGLE_CLOUD_PROJECT (set by Cloud Run automatically).
  const projectId = process.env.FIREBASE_PROJECT_ID;
  admin.initializeApp(projectId ? { projectId } : undefined);
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
        // The CES Messenger fetches an impersonated token from a project-
        // specific Cloud Run broker before each chat session — the URL is
        // stable per deployment, so it's hardcoded alongside the gstatic
        // and jsdelivr CES origins below rather than env-plumbed.
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseapp.com', 'https://identitytoolkit.googleapis.com', 'https://ces-token-broker-y4zvagwaqa-uc.a.run.app'],
        // Firebase popup login renders an iframe under firebaseapp.com.
        frameSrc: ["'self'", 'https://*.firebaseapp.com'],
        // CES Messenger when enabled — gstatic for the widget, jsdelivr for handlebars.
        // Vite-injected styles need 'unsafe-inline' for tailwind utilities. Google Fonts
        // ships the @font-face stylesheet from fonts.googleapis.com and the .woff2 files
        // from fonts.gstatic.com — both are required for the themed display fonts.
        // Firebase signInWithPopup dynamically injects https://apis.google.com/js/api.js
        // (the gapi loader) before opening the OAuth popup; the popup window itself is
        // not subject to our CSP and the hidden auth iframe is covered by frame-src.
        scriptSrc: ["'self'", 'https://www.gstatic.com', 'https://cdn.jsdelivr.net', 'https://apis.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
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

  // Underscore-prefixed to avoid Cloud Run's Knative-default /healthz probe
  // path interception, which causes /healthz requests to be 404'd at the GFE
  // before reaching the container.
  app.get('/_healthz', (_req, res) => {
    res.status(200).send('ok');
  });

  // Authenticated API. The per-uid generation rate limit (config.rateLimitRpm)
  // is enforced inside route handlers around the Gemini/Lyria call sites,
  // not here — cache-hit fetches (HEAD + sign existing GCS object) shouldn't
  // count against the user's quota.
  app.use('/api/asset', verifyFirebaseToken, createAssetRouter());
  app.use('/api/music', verifyFirebaseToken, createMusicRouter());

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
