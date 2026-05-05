# Cloud Run Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the AI-Studio-generated OVG Casino prototype for production Cloud Run deployment: server-side Gemini proxy behind Firebase Auth, private GCS bucket with signed URLs, hybrid global+per-user shadow asset model with per-uid daily regen quota, slim React clients, deploy script, and a Vitest suite that gates the deploy.

**Architecture:** Express 5 server proxies AI generation behind Firebase Auth, writes to private GCS, signs V4 URLs for the browser. Hybrid asset model: shared `assets/v1/global/<key>.png` warmed on first GET; per-user `assets/v1/users/<uid>/<key>.png` written only when the user clicks Regenerate. Per-uid daily regen quota enforced via Firestore counter at `regen_quota/<uid>`. Slim React clients drop ~370 lines of client-side AI/IndexedDB machinery in favor of memoised fetches against the API.

**Tech Stack:** Express 5 + TypeScript on the server. `@google/genai` for image/music generation. `firebase-admin` for Auth ID-token verification and Firestore counter. `@google-cloud/storage` for asset storage. `helmet`, `express-rate-limit`, `cors`. React 19 + Vite 5 + Tailwind 4 client. Vitest + supertest + @testing-library/react for tests. Cloud Run + Cloud Build + Artifact Registry + Secret Manager + Firestore + GCS.

**Reference spec:** `docs/superpowers/specs/2026-05-05-cloud-run-hardening-design.md` (commit `b0cf241`).

---

## File Structure

### New
- `server/index.ts` — Express bootstrap, healthz, port binding, helmet, rate limit, route mounting
- `server/middleware/auth.ts` — verifyFirebaseToken; sets `req.uid`
- `server/middleware/regenLimit.ts` — per-uid daily Firestore counter; 429 on overage
- `server/middleware/errors.ts` — central error handler, sanitised JSON
- `server/routes/asset.ts` — `GET /api/asset/:key`, `POST /api/asset/:key/regenerate`
- `server/routes/music.ts` — `GET /api/music/:theme/:gameType`, `POST .../regenerate`
- `server/lib/config.ts` — typed env reader; throws at boot if a required var is missing
- `server/lib/storage.ts` — GCS wrapper: `head`, `upload`, `getSignedUrl`
- `server/lib/gemini.ts` — `generateImage(prompt, aspect)`, `generateMusic(prompt)`
- `server/lib/cache.ts` — `readOrGenerateGlobal()`, `regenerateShadow()`
- `server/lib/prompts.ts` — `ASSET_PROMPTS`, `MUSIC_PROMPTS` (moved from client)
- `server/**/*.test.ts` — server tests
- `src/components/Games/GameShell.tsx` — shared game-page shell
- `src/components/Games/gameLogic.ts` — pure win-determination helpers
- `src/utils/themeStyles.ts` — `lightThemes`/`darkThemes` mapping (moved from `App.tsx`)
- `src/**/*.test.ts(x)` — client tests
- `Dockerfile`, `.dockerignore`
- `tsconfig.server.json`
- `vitest.config.ts`
- `deploy/deploy.sh`, `deploy/cloudbuild.yaml`, `deploy/.env.deploy.example`
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`

### Modified
- `package.json` — corrected version pins, new server deps, vitest scripts, build splits
- `tsconfig.json` — exclude `server/`
- `vite.config.ts` — drop `define` of `process.env.GEMINI_API_KEY`
- `index.html` — CES vars made build-time-conditional
- `src/firebase.ts` — env-var-driven config
- `src/App.tsx` — drop `as any` theme casts; move `lightThemes`/`darkThemes` to `themeStyles.ts`
- `src/lib/AssetManager.ts` — slim ~50-line client with `regenerateAsset`
- `src/lib/MusicManager.ts` — slim ~50-line client with `regenerateMusic`
- `src/lib/firebase-utils.ts` — throw real `Error` objects
- `src/hooks/useAssets.ts`, `src/hooks/useMusic.ts` — drop progress fan-out
- `src/components/Games/Roulette.tsx`, `Slots.tsx`, `Bingo.tsx` — use `GameShell` + `gameLogic`
- `src/components/Profile.tsx` — rewire Regenerate button to new endpoints
- `.env.example` — rewritten by audience
- `.gitignore` — add `firebase-applet-config.json`, `deploy/.env.deploy`
- `README.md` — full rewrite
- `firestore.rules` — deny-all on `regen_quota` collection

### Deleted
- `firebase-applet-config.json` — replaced by `VITE_FIREBASE_*` env vars
- `firebase-blueprint.json` — Firebase Studio scaffolding artifact
- `metadata.json` — AI Studio applet metadata

---

## Task 1: Project setup — deps, tsconfigs, vitest config, dead-file cleanup

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`
- Modify: `.env.example`
- Delete: `firebase-applet-config.json`, `firebase-blueprint.json`, `metadata.json`

- [ ] **Step 1: Rewrite `package.json`**

Replace the entire file with:

```json
{
  "name": "ovg-casino-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "dev:server": "tsx watch --env-file=.env server/index.ts",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist-server/index.js",
    "lint": "tsc --noEmit && tsc -p tsconfig.server.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist dist-server"
  },
  "dependencies": {
    "@google-cloud/storage": "^7.14.0",
    "@google/genai": "^1.46.0",
    "@tailwindcss/vite": "^4.2.2",
    "clsx": "^2.1.1",
    "cors": "^2.8.5",
    "express": "^5.0.1",
    "express-rate-limit": "^7.4.1",
    "firebase": "^12.11.0",
    "firebase-admin": "^13.0.1",
    "helmet": "^8.0.0",
    "lucide-react": "^0.469.0",
    "motion": "^12.38.0",
    "react": "^19.2.4",
    "react-confetti": "^6.4.0",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.2",
    "react-use": "^17.6.0",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/supertest": "^6.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^3.2.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "supertest": "^7.0.0",
    "tailwindcss": "^4.2.2",
    "tsx": "^4.21.0",
    "typescript": "~5.6.3",
    "vite": "^5.4.11",
    "vitest": "^3.2.0"
  }
}
```

Notes for the executing engineer: `dotenv` is removed (Node 22 has native `--env-file`); duplicated `vite` entry consolidated into devDependencies; Express 5 retained from prototype.

- [ ] **Step 2: Update `tsconfig.json` to exclude server/**

Read current `tsconfig.json`, then add `"exclude": ["server", "dist", "dist-server", "node_modules"]` (or merge with existing `exclude` if present). The existing client compiler options stay as-is.

- [ ] **Step 3: Create `tsconfig.server.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist-server",
    "rootDir": "server",
    "declaration": false,
    "sourceMap": true,
    "noEmit": false,
    "types": ["node"]
  },
  "include": ["server/**/*.ts"],
  "exclude": ["server/**/*.test.ts", "node_modules", "dist", "dist-server"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          globals: true,
        },
      },
    ],
  },
});
```

- [ ] **Step 5: Update `.gitignore`**

Add these lines (preserve existing content; `coverage/` is already there, don't duplicate):

```
firebase-applet-config.json
deploy/.env.deploy
dist-server
```

- [ ] **Step 6: Rewrite `.env.example`**

```bash
# === Server (read by Express via process.env) ===
# GCS bucket holding generated assets and music. Created by deploy/deploy.sh setup.
GCS_BUCKET=
# Firebase project ID for Auth ID-token verification.
FIREBASE_PROJECT_ID=
# Optional: server port (defaults to 8080; Cloud Run sets PORT dynamically).
PORT=8080
# Optional: per-uid GET rate limit, requests/minute (default 30).
RATE_LIMIT_RPM=30
# Optional: per-uid daily regen quota — caps total POST /regenerate calls per user per UTC day (default 200, ~5 full asset cycles).
REGEN_RATE_LIMIT_PER_DAY=200
# Optional: signed URL TTL in seconds (default 3600 = 1 hour, max 604800 = 7 days).
SIGNED_URL_TTL_SEC=3600

# === Server secret — DO NOT COMMIT ===
# Set via Secret Manager in prod (`gcloud secrets versions add gemini-api-key`); only used in .env locally.
GEMINI_API_KEY=

# === Client (baked into Vite bundle at build time as import.meta.env.VITE_*) ===
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=

# === Optional: CES Messenger widget (omit to strip from build) ===
VITE_CES_DEPLOYMENT_ID=
VITE_CES_TOKEN_BROKER_URL=
VITE_CES_CHAT_TITLE=
VITE_CES_THEME_ID=
```

- [ ] **Step 7: Delete dead Firebase Studio artifacts**

```bash
git rm firebase-applet-config.json firebase-blueprint.json metadata.json
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

Expected: completes without errors. (Some peer-dep warnings are OK.)

- [ ] **Step 9: Verify project lints**

```bash
npm run lint
```

Expected at this stage:
- Server tsconfig fails with "no inputs found" — fine, `server/` doesn't exist yet.
- Client tsconfig fails with three known transitional errors:
  - `src/firebase.ts(4,28): error TS2307: Cannot find module '../firebase-applet-config.json'` — fixed by Task 25.
  - `src/lib/AssetManager.ts(2,37): error TS2307: Cannot find module 'idb-keyval'` — fixed by Task 14.
  - `src/lib/MusicManager.ts(2,37): error TS2307: Cannot find module 'idb-keyval'` — fixed by Task 15.

If you see *any other* TypeScript error, stop and investigate.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json vitest.config.ts .gitignore .env.example
git rm firebase-applet-config.json firebase-blueprint.json metadata.json
git commit -m "chore: Project setup for Cloud Run hardening — corrected deps, tsconfigs, vitest, dead-file cleanup"
```

---

## Task 2: `server/lib/config.ts` — typed env reader

**Files:**
- Create: `server/lib/config.ts`
- Test: `server/lib/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/lib/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('config loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.GCS_BUCKET;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
    delete process.env.PORT;
    delete process.env.RATE_LIMIT_RPM;
    delete process.env.REGEN_RATE_LIMIT_PER_DAY;
    delete process.env.SIGNED_URL_TTL_SEC;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads required string vars', async () => {
    process.env.GCS_BUCKET = 'my-bucket';
    process.env.FIREBASE_PROJECT_ID = 'my-project';
    process.env.GEMINI_API_KEY = 'key123';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.gcsBucket).toBe('my-bucket');
    expect(cfg.firebaseProjectId).toBe('my-project');
    expect(cfg.geminiApiKey).toBe('key123');
  });

  it('throws with the variable name when a required var is missing', async () => {
    process.env.GCS_BUCKET = 'my-bucket';
    process.env.FIREBASE_PROJECT_ID = 'my-project';
    // GEMINI_API_KEY missing
    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow(/GEMINI_API_KEY/);
  });

  it('applies defaults for optional ints', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.port).toBe(8080);
    expect(cfg.signedUrlTtlSec).toBe(3600);
    expect(cfg.rateLimitRpm).toBe(30);
    expect(cfg.regenLimitPerDay).toBe(200);
  });

  it('coerces optional ints from string env', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    process.env.PORT = '9090';
    process.env.RATE_LIMIT_RPM = '60';
    process.env.REGEN_RATE_LIMIT_PER_DAY = '500';
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.port).toBe(9090);
    expect(cfg.rateLimitRpm).toBe(60);
    expect(cfg.regenLimitPerDay).toBe(500);
  });

  it('throws if an optional int var is non-numeric', async () => {
    process.env.GCS_BUCKET = 'b';
    process.env.FIREBASE_PROJECT_ID = 'p';
    process.env.GEMINI_API_KEY = 'k';
    process.env.PORT = 'not-a-number';
    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow(/PORT/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run server/lib/config.test.ts
```

Expected: all 5 tests fail with "Cannot find module './config.js'".

- [ ] **Step 3: Implement `server/lib/config.ts`**

```ts
function requireStr(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Env var ${name} must be a number, got: ${raw}`);
  }
  return n;
}

export interface Config {
  port: number;
  geminiApiKey: string;
  gcsBucket: string;
  firebaseProjectId: string;
  signedUrlTtlSec: number;
  rateLimitRpm: number;
  regenLimitPerDay: number;
}

export function loadConfig(): Config {
  return {
    port: optionalInt('PORT', 8080),
    geminiApiKey: requireStr('GEMINI_API_KEY'),
    gcsBucket: requireStr('GCS_BUCKET'),
    firebaseProjectId: requireStr('FIREBASE_PROJECT_ID'),
    signedUrlTtlSec: optionalInt('SIGNED_URL_TTL_SEC', 3600),
    rateLimitRpm: optionalInt('RATE_LIMIT_RPM', 30),
    regenLimitPerDay: optionalInt('REGEN_RATE_LIMIT_PER_DAY', 200),
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/lib/config.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/config.ts server/lib/config.test.ts
git commit -m "feat(server): typed env-var loader (config.ts) with boot-time validation"
```

---

## Task 3: `server/lib/prompts.ts` — move ASSET_PROMPTS and MUSIC_PROMPTS to server

**Files:**
- Create: `server/lib/prompts.ts`

This is a pure relocation — the prompt content lives at `src/lib/AssetManager.ts:4-103` (`ASSET_PROMPTS`) and `src/lib/MusicManager.ts:4-...` (`MUSIC_PROMPTS`). No tests needed (static data).

- [ ] **Step 1: Create `server/lib/prompts.ts`**

Read the current `src/lib/AssetManager.ts` to extract the full `ASSET_PROMPTS` map (lines 4-103), and `src/lib/MusicManager.ts` to extract `MUSIC_PROMPTS`. Write them to the new file:

```ts
export const ASSET_PROMPTS: Record<string, string> = {
  // ... copy the entire ASSET_PROMPTS object verbatim from src/lib/AssetManager.ts:4-103
};

export const MUSIC_PROMPTS: Record<string, string> = {
  // ... copy the entire MUSIC_PROMPTS object verbatim from src/lib/MusicManager.ts
};

export type AssetKey = keyof typeof ASSET_PROMPTS;
export type MusicKey = keyof typeof MUSIC_PROMPTS;
```

- [ ] **Step 2: Verify the file type-checks**

```bash
npx tsc -p tsconfig.server.json --noEmit
```

Expected: passes (no other server files yet, but this one compiles).

- [ ] **Step 3: Commit**

```bash
git add server/lib/prompts.ts
git commit -m "feat(server): relocate ASSET_PROMPTS and MUSIC_PROMPTS from client to server/lib/prompts.ts"
```

---

## Task 4: `server/lib/storage.ts` — GCS wrapper

**Files:**
- Create: `server/lib/storage.ts`
- Test: `server/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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

  it('signUrl returns a V4 signed URL with the given TTL', async () => {
    mockFile.getSignedUrl.mockResolvedValueOnce(['https://storage.googleapis.com/signed/foo']);
    const { createStorage } = await import('./storage.js');
    const s = createStorage('my-bucket');
    const url = await s.signUrl('foo/bar.png', 3600);
    expect(url).toBe('https://storage.googleapis.com/signed/foo');
    const callArg = mockFile.getSignedUrl.mock.calls[0][0];
    expect(callArg.action).toBe('read');
    expect(callArg.version).toBe('v4');
    expect(typeof callArg.expires).toBe('number');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/lib/storage.test.ts
```

Expected: 4 failures, "Cannot find module './storage.js'".

- [ ] **Step 3: Implement `server/lib/storage.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/lib/storage.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/storage.ts server/lib/storage.test.ts
git commit -m "feat(server): GCS storage wrapper (head, upload, sign)"
```

---

## Task 5: `server/lib/gemini.ts` — Gemini wrappers

**Files:**
- Create: `server/lib/gemini.ts`
- Test: `server/lib/gemini.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  })),
  Modality: { AUDIO: 'AUDIO' },
}));

describe('gemini.generateImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the raw image bytes from the first inline data part', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'image/png' } }] } }],
    });
    const { generateImage } = await import('./gemini.js');
    const out = await generateImage({ apiKey: 'k', prompt: 'test', aspectRatio: '1:1' });
    expect(out.bytes).toEqual(Buffer.from('hello'));
    expect(out.mimeType).toBe('image/png');
  });

  it('throws when the response has no inline image data', async () => {
    mockGenerateContent.mockResolvedValueOnce({ candidates: [{ content: { parts: [{ text: 'sorry' }] } }] });
    const { generateImage } = await import('./gemini.js');
    await expect(generateImage({ apiKey: 'k', prompt: 'test', aspectRatio: '1:1' }))
      .rejects.toThrow(/no image data/i);
  });
});

describe('gemini.generateMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('concatenates audio chunks from the stream into a single Buffer', async () => {
    async function* stream() {
      yield { candidates: [{ content: { parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'audio/wav' } }] } }] };
      yield { candidates: [{ content: { parts: [{ inlineData: { data: 'd29ybGQ=', mimeType: 'audio/wav' } }] } }] };
    }
    mockGenerateContentStream.mockResolvedValueOnce(stream());
    const { generateMusic } = await import('./gemini.js');
    const out = await generateMusic({ apiKey: 'k', prompt: 'jazzy' });
    expect(out.bytes).toEqual(Buffer.concat([Buffer.from('hello'), Buffer.from('world')]));
    expect(out.mimeType).toBe('audio/wav');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/lib/gemini.test.ts
```

Expected: 3 failures.

- [ ] **Step 3: Implement `server/lib/gemini.ts`**

```ts
import { GoogleGenAI } from '@google/genai';

export interface ImageRequest {
  apiKey: string;
  prompt: string;
  aspectRatio: '1:1' | '16:9';
}

export interface MusicRequest {
  apiKey: string;
  prompt: string;
}

export interface GeneratedAsset {
  bytes: Buffer;
  mimeType: string;
}

export async function generateImage(req: ImageRequest): Promise<GeneratedAsset> {
  const ai = new GoogleGenAI({ apiKey: req.apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts: [{ text: req.prompt }] },
    config: {
      imageConfig: { aspectRatio: req.aspectRatio as any, imageSize: '512' },
    },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        bytes: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType ?? 'image/png',
      };
    }
  }
  throw new Error('No image data in Gemini response');
}

export async function generateMusic(req: MusicRequest): Promise<GeneratedAsset> {
  const ai = new GoogleGenAI({ apiKey: req.apiKey });
  const stream = await ai.models.generateContentStream({
    model: 'lyria-3-pro',
    contents: req.prompt,
  });
  const chunks: Buffer[] = [];
  let mimeType = 'audio/wav';
  for await (const chunk of stream) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        chunks.push(Buffer.from(part.inlineData.data, 'base64'));
        if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
      }
    }
  }
  if (chunks.length === 0) throw new Error('No audio data in Gemini response');
  return { bytes: Buffer.concat(chunks), mimeType };
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/lib/gemini.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/gemini.ts server/lib/gemini.test.ts
git commit -m "feat(server): Gemini wrappers for image and music generation"
```

---

## Task 6: `server/lib/cache.ts` — readOrGenerateGlobal + regenerateShadow

**Files:**
- Create: `server/lib/cache.ts`
- Test: `server/lib/cache.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/lib/cache.test.ts
```

Expected: 6 failures.

- [ ] **Step 3: Implement `server/lib/cache.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/lib/cache.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/cache.ts server/lib/cache.test.ts
git commit -m "feat(server): cache helpers — readOrGenerateGlobal with in-flight lock, regenerateShadow"
```

---

## Task 7: `server/middleware/auth.ts` — Firebase ID-token verification

**Files:**
- Create: `server/middleware/auth.ts`
- Test: `server/middleware/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockVerifyIdToken = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
    apps: [{}],
    initializeApp: vi.fn(),
  },
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  apps: [{}],
  initializeApp: vi.fn(),
}));

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response;
}

describe('verifyFirebaseToken middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets req.uid on a valid Bearer token and calls next()', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer good-token' } } as unknown as Request & { uid?: string };
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(req.uid).toBe('user-1');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 when the Authorization header is missing', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 on a malformed header', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'NotBearer xyz' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer bad' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/middleware/auth.test.ts
```

Expected: 4 failures.

- [ ] **Step 3: Implement `server/middleware/auth.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

declare module 'express-serve-static-core' {
  interface Request {
    uid?: string;
  }
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/middleware/auth.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/auth.ts server/middleware/auth.test.ts
git commit -m "feat(server): Firebase ID-token verification middleware"
```

---

## Task 8: `server/middleware/regenLimit.ts` — per-uid daily Firestore counter

**Files:**
- Create: `server/middleware/regenLimit.ts`
- Test: `server/middleware/regenLimit.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockRunTransaction = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    firestore: () => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    }),
    apps: [{}],
    initializeApp: vi.fn(),
  },
  firestore: () => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
  apps: [{}],
  initializeApp: vi.fn(),
}));

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response;
}

const TODAY = '2026-05-05';

describe('createRegenLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ id: 'user-1' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  });

  it('first call of the day creates the document at count=1 and proceeds', async () => {
    const setSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: false }),
        set: setSpy,
        update: vi.fn(),
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), { date: TODAY, count: 1 });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('subsequent same-day call increments the counter', async () => {
    const updateSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: TODAY, count: 5 }) }),
        set: vi.fn(),
        update: updateSpy,
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(updateSpy).toHaveBeenCalledWith(expect.anything(), { count: 6 });
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects with 429 once count reaches the daily limit', async () => {
    const setSpy = vi.fn();
    const updateSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: TODAY, count: 200 }) }),
        set: setSpy,
        update: updateSpy,
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'regen_quota_exceeded' });
    expect(next).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('resets counter on UTC date rollover', async () => {
    const setSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: '2026-05-04', count: 200 }) }),
        set: setSpy,
        update: vi.fn(),
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), { date: TODAY, count: 1 });
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401-equivalent if req.uid is missing', async () => {
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = {} as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/middleware/regenLimit.test.ts
```

Expected: 5 failures.

- [ ] **Step 3: Implement `server/middleware/regenLimit.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface RegenLimitOptions {
  limitPerDay: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createRegenLimit(opts: RegenLimitOptions) {
  return async function regenLimit(req: Request, res: Response, next: NextFunction) {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const db = admin.firestore();
    const ref = db.collection('regen_quota').doc(uid);
    const today = todayUtc();

    try {
      const allowed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          tx.set(ref, { date: today, count: 1 });
          return true;
        }
        const data = snap.data() as { date: string; count: number };
        if (data.date !== today) {
          tx.set(ref, { date: today, count: 1 });
          return true;
        }
        if (data.count >= opts.limitPerDay) {
          return false;
        }
        tx.update(ref, { count: data.count + 1 });
        return true;
      });

      if (!allowed) {
        res.status(429).json({ error: 'regen_quota_exceeded' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/middleware/regenLimit.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/regenLimit.ts server/middleware/regenLimit.test.ts
git commit -m "feat(server): per-uid daily regen-quota middleware backed by Firestore"
```

---

## Task 9: `server/middleware/errors.ts` — central error handler

**Files:**
- Create: `server/middleware/errors.ts`
- Test: `server/middleware/errors.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.headersSent = false;
  return res as Response;
}

describe('errorHandler middleware', () => {
  it('responds 502 generation_failed without leaking the message', async () => {
    const { errorHandler } = await import('./errors.js');
    const err = new Error('upstream Gemini PERMISSION_DENIED key 12345');
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'generation_failed' });
  });

  it('passes the error through if headers already sent', async () => {
    const { errorHandler } = await import('./errors.js');
    const err = new Error('boom');
    const req = {} as Request;
    const res = makeRes();
    res.headersSent = true;
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/middleware/errors.test.ts
```

Expected: 2 failures.

- [ ] **Step 3: Implement `server/middleware/errors.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }
  // Log the real error server-side; never echo it to the client.
  console.error(JSON.stringify({ msg: 'request_failed', err: err.message, stack: err.stack }));
  res.status(502).json({ error: 'generation_failed' });
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/middleware/errors.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/errors.ts server/middleware/errors.test.ts
git commit -m "feat(server): central error handler with sanitised JSON response"
```

---

## Task 10: `server/routes/asset.ts` — GET + POST /api/asset/:key

**Files:**
- Create: `server/routes/asset.ts`
- Test: `server/routes/asset.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../middleware/auth.js', () => ({
  verifyFirebaseToken: (req: any, _res: any, next: any) => { req.uid = req.headers['x-test-uid'] || 'u1'; next(); },
}));

vi.mock('../middleware/regenLimit.js', () => ({
  createRegenLimit: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../lib/prompts.js', () => ({
  ASSET_PROMPTS: { 'roulette_sweets': 'a roulette wheel', 'unknown_no': 'never used' },
  MUSIC_PROMPTS: {},
}));

const headObject = vi.fn();
const uploadObject = vi.fn();
const signUrl = vi.fn();

vi.mock('../lib/storage.js', () => ({
  createStorage: () => ({ headObject, uploadObject, signUrl }),
}));

const generateImage = vi.fn();
vi.mock('../lib/gemini.js', () => ({ generateImage, generateMusic: vi.fn() }));

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

async function makeApp() {
  const { createAssetRouter } = await import('./asset.js');
  const { errorHandler } = await import('../middleware/errors.js');
  const app = express();
  app.use(express.json());
  app.use('/api/asset', createAssetRouter());
  app.use(errorHandler);
  return app;
}

describe('assets route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headObject.mockReset();
    uploadObject.mockReset();
    signUrl.mockReset();
    generateImage.mockReset();
  });

  it('GET unknown :key → 400 with no generator call', async () => {
    const app = await makeApp();
    const res = await request(app).get('/api/asset/not_a_real_key');
    expect(res.status).toBe(400);
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('GET prefers user-shadow over global when both exist', async () => {
    headObject.mockResolvedValueOnce(true); // shadow exists
    signUrl.mockResolvedValueOnce('https://signed/shadow');
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u-alice');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/shadow');
    expect(headObject).toHaveBeenCalledWith('assets/v1/users/u-alice/roulette_sweets.png');
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('GET cache miss → generator invoked once, written to global path, signed', async () => {
    headObject.mockResolvedValueOnce(false); // shadow miss
    headObject.mockResolvedValueOnce(false); // global miss
    generateImage.mockResolvedValueOnce({ bytes: Buffer.from('img'), mimeType: 'image/png' });
    signUrl.mockResolvedValueOnce('https://signed/global');
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/global');
    expect(generateImage).toHaveBeenCalledOnce();
    expect(uploadObject).toHaveBeenCalledWith(
      'assets/v1/global/roulette_sweets.png',
      Buffer.from('img'),
      'image/png',
      'public, max-age=31536000, immutable',
    );
  });

  it('GET generator throws → 502 sanitised body', async () => {
    headObject.mockResolvedValue(false);
    generateImage.mockRejectedValueOnce(new Error('Gemini PERMISSION_DENIED key=secret'));
    const app = await makeApp();
    const res = await request(app).get('/api/asset/roulette_sweets').set('x-test-uid', 'u1');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'generation_failed' });
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });

  it('POST /:key/regenerate always calls generator, writes to user-shadow path', async () => {
    generateImage.mockResolvedValueOnce({ bytes: Buffer.from('rolled'), mimeType: 'image/png' });
    signUrl.mockResolvedValueOnce('https://signed/u1-shadow');
    const app = await makeApp();
    const res = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/u1-shadow');
    expect(generateImage).toHaveBeenCalledOnce();
    expect(uploadObject).toHaveBeenCalledWith(
      'assets/v1/users/u1/roulette_sweets.png',
      Buffer.from('rolled'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
    expect(headObject).not.toHaveBeenCalled();
  });

  it('two uids regenerating the same key produce isolated objects', async () => {
    generateImage
      .mockResolvedValueOnce({ bytes: Buffer.from('alice'), mimeType: 'image/png' })
      .mockResolvedValueOnce({ bytes: Buffer.from('bob'), mimeType: 'image/png' });
    signUrl
      .mockResolvedValueOnce('https://signed/alice')
      .mockResolvedValueOnce('https://signed/bob');
    const app = await makeApp();
    const r1 = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'alice');
    const r2 = await request(app).post('/api/asset/roulette_sweets/regenerate').set('x-test-uid', 'bob');
    expect(r1.body.url).toBe('https://signed/alice');
    expect(r2.body.url).toBe('https://signed/bob');
    expect(uploadObject).toHaveBeenNthCalledWith(1,
      'assets/v1/users/alice/roulette_sweets.png',
      Buffer.from('alice'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
    expect(uploadObject).toHaveBeenNthCalledWith(2,
      'assets/v1/users/bob/roulette_sweets.png',
      Buffer.from('bob'),
      'image/png',
      'private, max-age=31536000, immutable',
    );
  });

  it('POST unknown :key → 400 with no generator call', async () => {
    const app = await makeApp();
    const res = await request(app).post('/api/asset/not_a_key/regenerate');
    expect(res.status).toBe(400);
    expect(generateImage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/routes/asset.test.ts
```

Expected: 7 failures.

- [ ] **Step 3: Implement `server/routes/asset.ts`**

```ts
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
      const key = req.params.key;
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
      const key = req.params.key;
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/routes/asset.test.ts
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add server/routes/asset.ts server/routes/asset.test.ts
git commit -m "feat(server): /api/asset GET (shadow→global) and POST /regenerate routes"
```

---

## Task 11: `server/routes/music.ts` — GET + POST /api/music/:theme/:gameType

**Files:**
- Create: `server/routes/music.ts`
- Test: `server/routes/music.test.ts`

Same shape as asset routes, against `MUSIC_PROMPTS` keyed by `${theme}_${gameType}`, with `audio/wav` content type and `music/v1/...` paths.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../middleware/auth.js', () => ({
  verifyFirebaseToken: (req: any, _res: any, next: any) => { req.uid = req.headers['x-test-uid'] || 'u1'; next(); },
}));

vi.mock('../middleware/regenLimit.js', () => ({
  createRegenLimit: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../lib/prompts.js', () => ({
  ASSET_PROMPTS: {},
  MUSIC_PROMPTS: { 'sweets_roulette': 'jazzy candy music' },
}));

const headObject = vi.fn();
const uploadObject = vi.fn();
const signUrl = vi.fn();

vi.mock('../lib/storage.js', () => ({
  createStorage: () => ({ headObject, uploadObject, signUrl }),
}));

const generateMusic = vi.fn();
vi.mock('../lib/gemini.js', () => ({ generateImage: vi.fn(), generateMusic }));

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

async function makeApp() {
  const { createMusicRouter } = await import('./music.js');
  const { errorHandler } = await import('../middleware/errors.js');
  const app = express();
  app.use(express.json());
  app.use('/api/music', createMusicRouter());
  app.use(errorHandler);
  return app;
}

describe('music route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headObject.mockReset();
    uploadObject.mockReset();
    signUrl.mockReset();
    generateMusic.mockReset();
  });

  it('GET unknown theme/gameType → 400', async () => {
    const app = await makeApp();
    const res = await request(app).get('/api/music/nope/zzz');
    expect(res.status).toBe(400);
    expect(generateMusic).not.toHaveBeenCalled();
  });

  it('GET prefers user-shadow over global', async () => {
    headObject.mockResolvedValueOnce(true);
    signUrl.mockResolvedValueOnce('https://signed/u1-music-shadow');
    const app = await makeApp();
    const res = await request(app).get('/api/music/sweets/roulette').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://signed/u1-music-shadow');
    expect(headObject).toHaveBeenCalledWith('music/v1/users/u1/sweets_roulette.wav');
    expect(generateMusic).not.toHaveBeenCalled();
  });

  it('GET cache miss writes to global path', async () => {
    headObject.mockResolvedValueOnce(false);
    headObject.mockResolvedValueOnce(false);
    generateMusic.mockResolvedValueOnce({ bytes: Buffer.from('m'), mimeType: 'audio/wav' });
    signUrl.mockResolvedValueOnce('https://signed/m-global');
    const app = await makeApp();
    const res = await request(app).get('/api/music/sweets/roulette').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(uploadObject).toHaveBeenCalledWith(
      'music/v1/global/sweets_roulette.wav',
      Buffer.from('m'),
      'audio/wav',
      'public, max-age=31536000, immutable',
    );
  });

  it('POST /regenerate writes to user-shadow with private cache-control', async () => {
    generateMusic.mockResolvedValueOnce({ bytes: Buffer.from('r'), mimeType: 'audio/wav' });
    signUrl.mockResolvedValueOnce('https://signed/u1-rolled');
    const app = await makeApp();
    const res = await request(app).post('/api/music/sweets/roulette/regenerate').set('x-test-uid', 'u1');
    expect(res.status).toBe(200);
    expect(uploadObject).toHaveBeenCalledWith(
      'music/v1/users/u1/sweets_roulette.wav',
      Buffer.from('r'),
      'audio/wav',
      'private, max-age=31536000, immutable',
    );
  });

  it('POST unknown theme/gameType → 400', async () => {
    const app = await makeApp();
    const res = await request(app).post('/api/music/nope/zzz/regenerate');
    expect(res.status).toBe(400);
    expect(generateMusic).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/routes/music.test.ts
```

Expected: 5 failures.

- [ ] **Step 3: Implement `server/routes/music.ts`**

```ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { createRegenLimit } from '../middleware/regenLimit.js';
import { MUSIC_PROMPTS } from '../lib/prompts.js';
import { createStorage } from '../lib/storage.js';
import { generateMusic } from '../lib/gemini.js';
import { readOrGenerateGlobal, regenerateShadow } from '../lib/cache.js';
import { loadConfig } from '../lib/config.js';

export function createMusicRouter() {
  const config = loadConfig();
  const storage = createStorage(config.gcsBucket);
  const regenLimit = createRegenLimit({ limitPerDay: config.regenLimitPerDay });
  const router = Router();

  router.get('/:theme/:gameType', verifyFirebaseToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${req.params.theme}_${req.params.gameType}`;
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
        generator: () => generateMusic({ apiKey: config.geminiApiKey, prompt: MUSIC_PROMPTS[key] }),
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:theme/:gameType/regenerate', verifyFirebaseToken, regenLimit, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${req.params.theme}_${req.params.gameType}`;
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
        generator: () => generateMusic({ apiKey: config.geminiApiKey, prompt: MUSIC_PROMPTS[key] }),
      });
      res.json({ url, expiresAt: Date.now() + config.signedUrlTtlSec * 1000 });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/routes/music.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server/routes/music.ts server/routes/music.test.ts
git commit -m "feat(server): /api/music GET (shadow→global) and POST /regenerate routes"
```

---

## Task 12: `server/index.ts` — Express bootstrap

**Files:**
- Create: `server/index.ts`
- Test: `server/index.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('firebase-admin', () => ({
  default: {
    apps: [{}],
    initializeApp: vi.fn(),
    auth: () => ({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) }),
    firestore: () => ({}),
  },
  apps: [{}],
  initializeApp: vi.fn(),
  auth: () => ({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) }),
  firestore: () => ({}),
}));

vi.mock('../lib/config.js', () => ({
  loadConfig: () => ({
    port: 8080, geminiApiKey: 'k', gcsBucket: 'b', firebaseProjectId: 'p',
    signedUrlTtlSec: 3600, rateLimitRpm: 30, regenLimitPerDay: 200,
  }),
}));

vi.mock('./routes/asset.js', () => ({ createAssetRouter: () => (_req: any, _res: any, next: any) => next() }));
vi.mock('./routes/music.js', () => ({ createMusicRouter: () => (_req: any, _res: any, next: any) => next() }));

describe('server bootstrap', () => {
  beforeEach(() => vi.resetModules());

  it('GET /healthz returns 200 unauthenticated', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  it('serves Helmet headers on responses', async () => {
    const { createApp } = await import('./index.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run server/index.test.ts
```

Expected: 2 failures.

- [ ] **Step 3: Implement `server/index.ts`**

```ts
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
    keyGenerator: (req) => (req as any).uid ?? req.ip ?? 'anon',
  });

  app.use('/api/asset', apiLimiter, createAssetRouter());
  app.use('/api/music', apiLimiter, createMusicRouter());

  // Static client (built React) — only when present (production)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath, { maxAge: '1h' }));
  app.get('*', (_req, res) => {
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run server/index.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Verify the full server suite**

```bash
npx vitest run --project server
```

Expected: all server tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/index.ts server/index.test.ts
git commit -m "feat(server): Express bootstrap with helmet, CORS, rate limiter, healthz, route mounting, static fallback"
```

---

## Task 13: `firestore.rules` — deny-all on regen_quota

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Read the current rules**

```bash
cat firestore.rules
```

Note the existing match blocks.

- [ ] **Step 2: Add deny-all rule for the regen_quota collection**

Edit `firestore.rules` to add (inside `match /databases/{database}/documents { ... }`):

```
match /regen_quota/{uid} {
  allow read, write: if false;
}
```

The Admin SDK on the server bypasses these rules; this prevents any client from tampering with their counter.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): deny-all on regen_quota collection (server-only writes)"
```

---

## Task 14: Slim `src/lib/AssetManager.ts` — fetch from API, add regenerateAsset

**Files:**
- Modify: `src/lib/AssetManager.ts` (full rewrite — drops ~220 lines of client-side AI machinery)
- Test: `src/lib/AssetManager.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('id-token-xyz') } },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('AssetManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.resetModules();
  });

  it('getAsset GETs /api/asset/:key with Bearer token and returns the URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/x', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getAsset } = await import('./AssetManager');
    const url = await getAsset('roulette_sweets');
    expect(url).toBe('https://signed/x');
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('/api/asset/roulette_sweets');
    expect(init.headers.Authorization).toBe('Bearer id-token-xyz');
  });

  it('second call within TTL returns memoised URL without refetch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/x', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getAsset } = await import('./AssetManager');
    await getAsset('roulette_sweets');
    await getAsset('roulette_sweets');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('refetches if memo entry is within 60s of expiry', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/old', expiresAt: Date.now() + 30_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/new', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset } = await import('./AssetManager');
    const u1 = await getAsset('roulette_sweets');
    const u2 = await getAsset('roulette_sweets');
    expect(u1).toBe('https://signed/old');
    expect(u2).toBe('https://signed/new');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetch error rejects without poisoning memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'oops' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/ok', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset } = await import('./AssetManager');
    await expect(getAsset('roulette_sweets')).rejects.toThrow();
    const u = await getAsset('roulette_sweets');
    expect(u).toBe('https://signed/ok');
  });

  it('regenerateAsset POSTs to /regenerate, replaces memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v1', expiresAt: Date.now() + 3_600_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) });
    const { getAsset, regenerateAsset } = await import('./AssetManager');
    await getAsset('roulette_sweets');
    const u = await regenerateAsset('roulette_sweets');
    expect(u).toBe('https://signed/v2');
    const [postUrl, postInit] = fetchMock.mock.calls[1];
    expect(postUrl).toBe('/api/asset/roulette_sweets/regenerate');
    expect(postInit.method).toBe('POST');
    // Subsequent get returns the regen result without a new fetch
    const u2 = await getAsset('roulette_sweets');
    expect(u2).toBe('https://signed/v2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('regenerateAsset throws RegenQuotaExceededError on 429', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'regen_quota_exceeded' }) });
    const { regenerateAsset, RegenQuotaExceededError } = await import('./AssetManager');
    await expect(regenerateAsset('roulette_sweets')).rejects.toBeInstanceOf(RegenQuotaExceededError);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/AssetManager.test.ts
```

Expected: 6 failures (current AssetManager has wrong shape).

- [ ] **Step 3: Replace `src/lib/AssetManager.ts` with the slim version**

```ts
import { auth } from '../firebase';

export class RegenQuotaExceededError extends Error {
  constructor() {
    super('regen_quota_exceeded');
    this.name = 'RegenQuotaExceededError';
  }
}

interface MemoEntry { url: string; expiresAt: number; }
const memo = new Map<string, MemoEntry>();
const REFRESH_BUFFER_MS = 60_000;

async function authHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('not_authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function memoFresh(entry: MemoEntry | undefined): entry is MemoEntry {
  return !!entry && entry.expiresAt - Date.now() > REFRESH_BUFFER_MS;
}

export async function getAsset(key: string): Promise<string> {
  const cached = memo.get(key);
  if (memoFresh(cached)) return cached.url;
  const headers = await authHeader();
  const res = await fetch(`/api/asset/${encodeURIComponent(key)}`, { headers });
  if (!res.ok) throw new Error(`asset_fetch_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

export async function regenerateAsset(key: string): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`/api/asset/${encodeURIComponent(key)}/regenerate`, { method: 'POST', headers });
  if (res.status === 429) throw new RegenQuotaExceededError();
  if (!res.ok) throw new Error(`asset_regen_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

// Kept for source-compat with hook signature; preloads via getAsset memoisation.
export async function preloadAssets(keys: string[]) {
  await Promise.all(keys.map(k => getAsset(k)));
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/lib/AssetManager.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/AssetManager.ts src/lib/AssetManager.test.ts
git commit -m "refactor(client): slim AssetManager to API client with memo and regenerateAsset"
```

---

## Task 15: Slim `src/lib/MusicManager.ts` — fetch from API, add regenerateMusic

**Files:**
- Modify: `src/lib/MusicManager.ts` (full rewrite)
- Test: `src/lib/MusicManager.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('id-token-xyz') } },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('MusicManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.resetModules();
  });

  it('getMusic GETs /api/music/:theme/:gameType with Bearer token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/m', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getMusic } = await import('./MusicManager');
    const url = await getMusic('sweets', 'roulette');
    expect(url).toBe('https://signed/m');
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/music/sweets/roulette');
    expect(init.headers.Authorization).toBe('Bearer id-token-xyz');
  });

  it('memoises within TTL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed/m', expiresAt: Date.now() + 3_600_000 }),
    });
    const { getMusic } = await import('./MusicManager');
    await getMusic('sweets', 'roulette');
    await getMusic('sweets', 'roulette');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('regenerateMusic POSTs to /regenerate and replaces memo', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed/v2', expiresAt: Date.now() + 3_600_000 }) });
    const { regenerateMusic } = await import('./MusicManager');
    const url = await regenerateMusic('sweets', 'roulette');
    expect(url).toBe('https://signed/v2');
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/music/sweets/roulette/regenerate');
    expect(init.method).toBe('POST');
  });

  it('regenerateMusic throws RegenQuotaExceededError on 429', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'regen_quota_exceeded' }) });
    const { regenerateMusic, RegenQuotaExceededError } = await import('./MusicManager');
    await expect(regenerateMusic('sweets', 'roulette')).rejects.toBeInstanceOf(RegenQuotaExceededError);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/MusicManager.test.ts
```

Expected: 4 failures.

- [ ] **Step 3: Replace `src/lib/MusicManager.ts` with the slim version**

```ts
import { auth } from '../firebase';

export class RegenQuotaExceededError extends Error {
  constructor() {
    super('regen_quota_exceeded');
    this.name = 'RegenQuotaExceededError';
  }
}

interface MemoEntry { url: string; expiresAt: number; }
const memo = new Map<string, MemoEntry>();
const REFRESH_BUFFER_MS = 60_000;

async function authHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('not_authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function memoFresh(entry: MemoEntry | undefined): entry is MemoEntry {
  return !!entry && entry.expiresAt - Date.now() > REFRESH_BUFFER_MS;
}

function key(theme: string, gameType: string) {
  return `${theme}_${gameType}`;
}

export async function getMusic(theme: string, gameType: string): Promise<string | null> {
  const k = key(theme, gameType);
  const cached = memo.get(k);
  if (memoFresh(cached)) return cached.url;
  const headers = await authHeader();
  const res = await fetch(`/api/music/${encodeURIComponent(theme)}/${encodeURIComponent(gameType)}`, { headers });
  if (res.status === 400) return null; // unknown theme/gameType combo
  if (!res.ok) throw new Error(`music_fetch_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(k, data);
  return data.url;
}

export async function regenerateMusic(theme: string, gameType: string): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`/api/music/${encodeURIComponent(theme)}/${encodeURIComponent(gameType)}/regenerate`, {
    method: 'POST',
    headers,
  });
  if (res.status === 429) throw new RegenQuotaExceededError();
  if (!res.ok) throw new Error(`music_regen_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key(theme, gameType), data);
  return data.url;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/lib/MusicManager.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/MusicManager.ts src/lib/MusicManager.test.ts
git commit -m "refactor(client): slim MusicManager to API client with memo and regenerateMusic"
```

---

## Task 16: `src/lib/firebase-utils.ts` — throw real Error objects

**Files:**
- Modify: `src/lib/firebase-utils.ts`
- Test: `src/lib/firebase-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'u1', email: 'a@b', emailVerified: true, isAnonymous: false, tenantId: null, providerData: [] } },
}));

describe('handleFirestoreError', () => {
  it('throws an Error (not a stringified-JSON Error) with structured fields as own properties', async () => {
    const { handleFirestoreError, OperationType } = await import('./firebase-utils');
    let caught: any;
    try {
      handleFirestoreError(new Error('inner boom'), OperationType.GET, 'users/u1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('inner boom');
    expect(caught.operationType).toBe('get');
    expect(caught.path).toBe('users/u1');
    expect(caught.authInfo.userId).toBe('u1');
    // The legacy form put JSON-stringified errInfo into the message; assert we no longer do that
    expect(caught.message).not.toMatch(/\{.*\}/);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/firebase-utils.test.ts
```

Expected: failure on `caught.operationType` being undefined (the current code stringifies into the message instead).

- [ ] **Step 3: Modify `src/lib/firebase-utils.ts`**

Replace the function body (preserve `OperationType` enum and `FirestoreErrorInfo` interface, lines 3-29). Replace lines 31-52 with:

```ts
export class FirestoreOperationError extends Error implements FirestoreErrorInfo {
  operationType: OperationType;
  path: string | null;
  authInfo: FirestoreErrorInfo['authInfo'];

  constructor(info: FirestoreErrorInfo) {
    super(info.error);
    this.name = 'FirestoreOperationError';
    this.operationType = info.operationType;
    this.path = info.path;
    this.authInfo = info.authInfo;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const info: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', info);
  throw new FirestoreOperationError(info);
}
```

The `FirestoreErrorInfo` interface and `OperationType` enum stay as-is from the existing file.

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/lib/firebase-utils.test.ts
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase-utils.ts src/lib/firebase-utils.test.ts
git commit -m "refactor(client): throw FirestoreOperationError with structured fields (not JSON-stringified Error)"
```

---

## Task 17: Hook simplification — `useAssets` and `useMusic`

**Files:**
- Modify: `src/hooks/useAssets.ts`
- Modify: `src/hooks/useMusic.ts`
- Test: `src/hooks/useAssets.test.tsx`
- Test: `src/hooks/useMusic.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/hooks/useAssets.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/AssetManager', () => ({
  getAsset: vi.fn(async (k: string) => `https://signed/${k}`),
}));

import { useAssets } from './useAssets';

describe('useAssets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions from loading → loaded with the resolved URLs', async () => {
    const { result } = renderHook(() => useAssets(['k1', 'k2']));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toEqual({ k1: 'https://signed/k1', k2: 'https://signed/k2' });
  });
});
```

`src/hooks/useMusic.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/MusicManager', () => ({
  getMusic: vi.fn(async (theme: string, gt: string) => `https://signed/${theme}_${gt}`),
}));

import { useMusic } from './useMusic';

describe('useMusic', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the URL for the (theme, gameType) pair', async () => {
    const { result } = renderHook(() => useMusic('sweets', 'roulette'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.musicUrl).toBe('https://signed/sweets_roulette');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/hooks/useAssets.test.tsx src/hooks/useMusic.test.tsx
```

Expected: failures (URL.revokeObjectURL is called on a signed URL in old useMusic, etc.).

- [ ] **Step 3: Replace `src/hooks/useAssets.ts`**

```ts
import { useState, useEffect, useMemo } from 'react';
import { getAsset } from '../lib/AssetManager';

export function useAssets(keys: string[]) {
  const memoKeys = useMemo(() => keys, [keys.join('|')]);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(memoKeys.map(async (k) => {
        try {
          loaded[k] = await getAsset(k);
        } catch (e) {
          console.error(`Asset load failed: ${k}`, e);
        }
      }));
      if (mounted) {
        setAssets(prev => ({ ...prev, ...loaded }));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [memoKeys]);

  return { assets, loading };
}
```

- [ ] **Step 4: Replace `src/hooks/useMusic.ts`**

```ts
import { useState, useEffect } from 'react';
import { getMusic } from '../lib/MusicManager';

export function useMusic(theme: string, gameType: string) {
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMusic(theme, gameType)
      .then((url) => {
        if (mounted) {
          setMusicUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Music load failed:', err);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [theme, gameType]);

  return { musicUrl, loading };
}
```

(No URL.revokeObjectURL — these are signed HTTPS URLs, not blob URLs.)

- [ ] **Step 5: Run tests to confirm pass**

```bash
npx vitest run src/hooks/useAssets.test.tsx src/hooks/useMusic.test.tsx
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAssets.ts src/hooks/useMusic.ts src/hooks/useAssets.test.tsx src/hooks/useMusic.test.tsx
git commit -m "refactor(client): simplify useAssets/useMusic — drop progress, drop blob URL revocation"
```

---

## Task 18: `src/components/Games/gameLogic.ts` — extract pure win helpers

**Files:**
- Create: `src/components/Games/gameLogic.ts`
- Test: `src/components/Games/gameLogic.test.ts`

This pulls win-determination out of the three game components so it can be unit-tested cleanly. Behavior is preserved — including the simplified roulette colour rule the prototype uses.

- [ ] **Step 1: Read existing logic**

```bash
grep -n -E "evaluateRoulette|evaluateSlots|evaluateBingo|determineWin|checkWin|colour|color" src/components/Games/Roulette.tsx src/components/Games/Slots.tsx src/components/Games/Bingo.tsx
```

Note the inline win-determination logic in each game (look for win-state setters and the conditions around them). The plan asks the implementer to preserve current behavior verbatim — do not "fix" any rules.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateRouletteBet, evaluateSlotsResult, evaluateBingoBoard } from './gameLogic';

describe('evaluateRouletteBet', () => {
  it('matches when betType is the chosen number', () => {
    expect(evaluateRouletteBet(7, 'red', 'number-7')).toBe(true);
  });
  it('matches when betType is the chosen colour', () => {
    expect(evaluateRouletteBet(7, 'red', 'red')).toBe(true);
    expect(evaluateRouletteBet(8, 'black', 'red')).toBe(false);
  });
  it('matches even/odd correctly', () => {
    expect(evaluateRouletteBet(8, 'black', 'even')).toBe(true);
    expect(evaluateRouletteBet(7, 'red', 'odd')).toBe(true);
    expect(evaluateRouletteBet(8, 'black', 'odd')).toBe(false);
  });
});

describe('evaluateSlotsResult', () => {
  it('returns jackpot when all three reels match', () => {
    expect(evaluateSlotsResult(['cherry', 'cherry', 'cherry'])).toBe('jackpot');
  });
  it('returns small when exactly two reels match', () => {
    expect(evaluateSlotsResult(['cherry', 'cherry', 'lemon'])).toBe('small');
  });
  it('returns none when nothing matches', () => {
    expect(evaluateSlotsResult(['cherry', 'lemon', 'bell'])).toBe('none');
  });
});

describe('evaluateBingoBoard', () => {
  it('returns true when any row, column, or diagonal is fully drawn', () => {
    const board = [[1,2,3],[4,5,6],[7,8,9]];
    expect(evaluateBingoBoard(board, [1,2,3])).toBe(true);   // row
    expect(evaluateBingoBoard(board, [1,4,7])).toBe(true);   // col
    expect(evaluateBingoBoard(board, [1,5,9])).toBe(true);   // diag
    expect(evaluateBingoBoard(board, [3,5,7])).toBe(true);   // anti-diag
  });
  it('returns false otherwise', () => {
    const board = [[1,2,3],[4,5,6],[7,8,9]];
    expect(evaluateBingoBoard(board, [1,2,4,8])).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```

Expected: failures (file doesn't exist).

- [ ] **Step 4: Implement `src/components/Games/gameLogic.ts`**

Implementation must mirror what the existing game components do today. Read `Roulette.tsx`, `Slots.tsx`, `Bingo.tsx` to copy the rules. The test cases above show the expected interface; the implementer adapts the logic from the components.

```ts
export type RouletteColour = 'red' | 'black' | 'green';

export function evaluateRouletteBet(num: number, colour: RouletteColour, betType: string): boolean {
  if (betType.startsWith('number-')) {
    return Number(betType.slice('number-'.length)) === num;
  }
  if (betType === 'red' || betType === 'black' || betType === 'green') {
    return betType === colour;
  }
  if (betType === 'even') return num !== 0 && num % 2 === 0;
  if (betType === 'odd') return num % 2 === 1;
  return false;
}

export type SlotsResult = 'jackpot' | 'small' | 'none';

export function evaluateSlotsResult(reels: string[]): SlotsResult {
  const [a, b, c] = reels;
  if (a === b && b === c) return 'jackpot';
  if (a === b || b === c || a === c) return 'small';
  return 'none';
}

export function evaluateBingoBoard(board: number[][], drawn: number[]): boolean {
  const drawnSet = new Set(drawn);
  const n = board.length;
  for (let i = 0; i < n; i++) {
    if (board[i].every(v => drawnSet.has(v))) return true;
    if (board.every(row => drawnSet.has(row[i]))) return true;
  }
  if (board.every((row, i) => drawnSet.has(row[i]))) return true;
  if (board.every((row, i) => drawnSet.has(row[n - 1 - i]))) return true;
  return false;
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```

Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/gameLogic.ts src/components/Games/gameLogic.test.ts
git commit -m "refactor(games): extract pure win-determination helpers (gameLogic.ts)"
```

---

## Task 19: `src/components/Games/GameShell.tsx` — extract shared shell

**Files:**
- Create: `src/components/Games/GameShell.tsx`
- Test: `src/components/Games/GameShell.test.tsx`

The shell owns: asset+music wiring with combined progress, loading screen, header (back button), `<audio>` element, win/jackpot overlay (AnimatePresence + confetti), bet input + play button row, theme styling. Each game's unique JSX is passed as `children`.

Read `Roulette.tsx`, `Slots.tsx`, `Bingo.tsx` to identify the duplicated shell. Lift it into `GameShell.tsx` with the props described in the spec (§4 GameShell extraction, lines 155-173).

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: { bg_test: 'https://x/bg' }, loading: false }) }));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: 'https://x/m', loading: false }) }));

import { GameShell } from './GameShell';

describe('GameShell', () => {
  const baseProps = {
    name: 'Roulette',
    theme: 'sweets' as const,
    bgKey: 'bg_test',
    extraAssetKeys: [] as string[],
    gameType: 'roulette' as const,
    win: null,
    bet: 10,
    onBet: vi.fn(),
    onPlay: vi.fn(),
    playLabel: 'SPIN',
    playDisabled: false,
    message: null,
    balance: 100,
    onBack: vi.fn(),
  };

  it('renders children', () => {
    render(<GameShell {...baseProps}><div data-testid="surface">wheel</div></GameShell>);
    expect(screen.getByTestId('surface')).toBeTruthy();
  });

  it('calls onPlay when the play button is clicked', () => {
    const onPlay = vi.fn();
    render(<GameShell {...baseProps} onPlay={onPlay}><div /></GameShell>);
    fireEvent.click(screen.getByText('SPIN'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('disables the play button when playDisabled is true', () => {
    render(<GameShell {...baseProps} playDisabled><div /></GameShell>);
    const btn = screen.getByText('SPIN').closest('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('shows loading state when assets are loading', async () => {
    vi.doMock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: true }) }));
    vi.resetModules();
    const { GameShell: Shell2 } = await import('./GameShell');
    render(<Shell2 {...baseProps}><div /></Shell2>);
    expect(screen.getByText(/generating/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/components/Games/GameShell.test.tsx
```

Expected: failures (file doesn't exist).

- [ ] **Step 3: Implement `src/components/Games/GameShell.tsx`**

Read the three game components (Roulette/Slots/Bingo) to extract the shared shell. The implementer should produce the smallest faithful version of the duplicated chrome with this signature:

```tsx
import { type ReactNode, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Confetti from 'react-confetti';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';

export interface GameShellProps {
  name: string;
  theme: string;
  bgKey: string;
  extraAssetKeys: string[];
  gameType: 'roulette' | 'slots' | 'bingo';
  win: 'jackpot' | 'small' | null;
  bet: number;
  onBet: (n: number) => void;
  onPlay: () => void;
  playLabel: string;
  playDisabled: boolean;
  message: string | null;
  balance: number;
  onBack: () => void;
  children: ReactNode;
}

export function GameShell(props: GameShellProps) {
  const { assets, loading: assetsLoading } = useAssets([props.bgKey, ...props.extraAssetKeys]);
  const { musicUrl, loading: musicLoading } = useMusic(props.theme, props.gameType);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => { /* user-gesture required */ });
    }
  }, [musicUrl]);

  if (assetsLoading || musicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg text-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-theme-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating unique game assets…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-white" style={{ backgroundImage: `url(${assets[props.bgKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <audio ref={audioRef} />
      <div className="bg-black/60 min-h-screen p-6">
        <header className="flex items-center justify-between mb-8">
          <button onClick={props.onBack} className="flex items-center gap-2 opacity-80 hover:opacity-100">
            <ArrowLeft className="w-5 h-5" /> Back to Lobby
          </button>
          <h1 className="text-3xl font-casino tracking-wider">{props.name}</h1>
          <div className="opacity-90">Balance: {props.balance}</div>
        </header>

        <main className="max-w-4xl mx-auto">{props.children}</main>

        <div className="max-w-md mx-auto mt-8 flex items-center gap-4">
          <input
            type="number"
            value={props.bet}
            onChange={e => props.onBet(Number(e.target.value))}
            className="flex-1 bg-black/40 border border-white/20 rounded px-3 py-2 text-white"
            min={1}
          />
          <button
            onClick={props.onPlay}
            disabled={props.playDisabled}
            className="px-8 py-3 rounded-xl bg-theme-primary text-black font-bold tracking-wider disabled:opacity-50"
          >
            {props.playLabel}
          </button>
        </div>

        {props.message && <p className="text-center mt-4">{props.message}</p>}

        <AnimatePresence>
          {props.win === 'jackpot' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
            >
              <Confetti />
              <div className="text-7xl font-casino text-yellow-300">JACKPOT!</div>
            </motion.div>
          )}
          {props.win === 'small' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-3 rounded-full text-black font-bold"
            >
              You won!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/Games/GameShell.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/GameShell.tsx src/components/Games/GameShell.test.tsx
git commit -m "feat(games): extract shared GameShell (header, asset+music wiring, bet+play row, win overlay)"
```

---

## Task 20: Refactor `src/components/Games/Roulette.tsx` to use GameShell + gameLogic

**Files:**
- Modify: `src/components/Games/Roulette.tsx`

The component shrinks from ~250 lines to ~80–120, containing only its game-specific play surface (the wheel) and state machine. The header, asset/music wiring, win overlay, bet input, and play button are gone — the shell renders them.

- [ ] **Step 1: Read the existing component**

```bash
cat src/components/Games/Roulette.tsx
```

Identify:
- The wheel JSX (game-specific, keep as `children`).
- The spin state machine (number selection, animation timing) — keep.
- The win-determination logic — replace with a call to `evaluateRouletteBet` from `gameLogic.ts`.
- The bet/play UI, header, audio, asset wiring — delete; GameShell handles all of this.

- [ ] **Step 2: Rewrite Roulette.tsx**

The new top-level shape:

```tsx
import { useState } from 'react';
import { GameShell } from './GameShell';
import { evaluateRouletteBet, type RouletteColour } from './gameLogic';

interface Props {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Roulette({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const extraAssetKeys = [`roulette_${theme}`];

  function handleSpin() {
    if (!betType || spinning || balance < bet) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance(-bet);

    // Pick a result number with a colour. Colour rule preserved from prototype.
    const num = Math.floor(Math.random() * 37);
    const colour: RouletteColour = num === 0 ? 'green' : (num % 2 === 1 ? 'red' : 'black');

    // Animation pause; then resolve.
    setTimeout(() => {
      setResultNum(num);
      const won = evaluateRouletteBet(num, colour, betType);
      if (won) {
        const payout = betType.startsWith('number-') ? bet * 35 : bet * 2;
        onUpdateBalance(payout);
        setWin(payout >= bet * 10 ? 'jackpot' : 'small');
        setMessage(`Won ${payout}!`);
      } else {
        setMessage(`Landed on ${num} (${colour}). Better luck next time.`);
      }
      setSpinning(false);
    }, 2500);
  }

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_roulette_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="roulette"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handleSpin}
      playLabel="SPIN THE WHEEL"
      playDisabled={spinning || !betType}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      {/* Wheel + bet selector — preserve existing JSX from the old component here.
          Use `betType`/`setBetType`, `spinning`, `resultNum` as the local state hooks. */}
      <div data-testid="roulette-surface">
        {/* Implementer: copy the wheel and bet-selector JSX from the original Roulette.tsx,
            updating to use the local state names above. */}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 3: Verify the file builds**

```bash
npx tsc --noEmit
```

Expected: no errors. (No new tests for Roulette — coverage is via `gameLogic.test.ts` and `GameShell.test.tsx`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/Games/Roulette.tsx
git commit -m "refactor(games): Roulette uses GameShell + gameLogic.evaluateRouletteBet"
```

---

## Task 21: Refactor `src/components/Games/Slots.tsx` to use GameShell + gameLogic

**Files:**
- Modify: `src/components/Games/Slots.tsx`

- [ ] **Step 1: Read the existing component, identify the reels JSX and spin state machine**

```bash
cat src/components/Games/Slots.tsx
```

Asset keys for theme: `slots_${theme}` plus `${theme}_1..4` symbols. Background key: `bg_slots_${theme}`.

- [ ] **Step 2: Rewrite Slots.tsx**

```tsx
import { useState } from 'react';
import { GameShell } from './GameShell';
import { evaluateSlotsResult } from './gameLogic';

interface Props {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(['', '', '']);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const symbols = [1, 2, 3, 4].map(n => `${theme}_${n}`);
  const extraAssetKeys = [`slots_${theme}`, ...symbols];

  function handleSpin() {
    if (spinning || balance < bet) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance(-bet);

    setTimeout(() => {
      const next = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
      setReels(next);
      const result = evaluateSlotsResult(next);
      if (result === 'jackpot') {
        const payout = bet * 50;
        onUpdateBalance(payout);
        setWin('jackpot');
        setMessage(`JACKPOT! +${payout}`);
      } else if (result === 'small') {
        const payout = bet * 3;
        onUpdateBalance(payout);
        setWin('small');
        setMessage(`Small win: +${payout}`);
      } else {
        setMessage('No match. Try again.');
      }
      setSpinning(false);
    }, 1500);
  }

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_slots_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="slots"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handleSpin}
      playLabel="SPIN"
      playDisabled={spinning || balance < bet}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      <div data-testid="slots-surface">
        {/* Implementer: copy the 3-reel display JSX from the original Slots.tsx,
            using local `reels`/`spinning` and rendering symbols via `useAssets` lookups
            on the `symbols` keys. */}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Games/Slots.tsx
git commit -m "refactor(games): Slots uses GameShell + gameLogic.evaluateSlotsResult"
```

---

## Task 22: Refactor `src/components/Games/Bingo.tsx` to use GameShell + gameLogic

**Files:**
- Modify: `src/components/Games/Bingo.tsx`

- [ ] **Step 1: Read the existing component**

```bash
cat src/components/Games/Bingo.tsx
```

- [ ] **Step 2: Rewrite Bingo.tsx**

```tsx
import { useState } from 'react';
import { GameShell } from './GameShell';
import { evaluateBingoBoard } from './gameLogic';

interface Props {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

function makeBoard(): number[][] {
  const pool = Array.from({ length: 30 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  return [pool.slice(0, 3), pool.slice(3, 6), pool.slice(6, 9)];
}

export function Bingo({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState<number[][]>(() => makeBoard());
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const extraAssetKeys = [`bingo_${theme}`];

  function handlePlay() {
    if (drawing || balance < bet) return;
    setDrawing(true);
    setWin(null);
    setMessage(null);
    setDrawn([]);
    setBoard(makeBoard());
    onUpdateBalance(-bet);

    let drawCount = 0;
    const localDrawn: number[] = [];
    const interval = setInterval(() => {
      drawCount++;
      let n: number;
      do { n = Math.floor(Math.random() * 30) + 1; } while (localDrawn.includes(n));
      localDrawn.push(n);
      setDrawn([...localDrawn]);
      if (drawCount >= 12 || evaluateBingoBoard(board, localDrawn)) {
        clearInterval(interval);
        const won = evaluateBingoBoard(board, localDrawn);
        if (won) {
          const payout = bet * 5;
          onUpdateBalance(payout);
          setWin('small');
          setMessage(`Bingo! +${payout}`);
        } else {
          setMessage('No bingo this round.');
        }
        setDrawing(false);
      }
    }, 600);
  }

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_bingo_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="bingo"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handlePlay}
      playLabel="PLAY BINGO"
      playDisabled={drawing || balance < bet}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      <div data-testid="bingo-surface">
        {/* Implementer: copy the 3x3 board + drawn-numbers display from the original Bingo.tsx. */}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Games/Bingo.tsx
git commit -m "refactor(games): Bingo uses GameShell + gameLogic.evaluateBingoBoard"
```

---

## Task 23: Rewire `src/components/Profile.tsx` Regenerate button to call new endpoints

**Files:**
- Modify: `src/components/Profile.tsx`

- [ ] **Step 1: Read the existing component**

```bash
cat src/components/Profile.tsx
```

The button currently calls `clearAllAssets()` then `window.location.reload()` (lines 17-26). Replace with parallel POSTs to the new regen endpoints.

- [ ] **Step 2: Replace the regenerate handler and imports**

Edit the imports (line 1-5):

```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User as UserIcon, LogOut, Wallet, Palette, RefreshCw } from 'lucide-react';
import { UserProfile } from '../hooks/useUser';
import { regenerateAsset, RegenQuotaExceededError } from '../lib/AssetManager';
import { regenerateMusic } from '../lib/MusicManager';
```

Drop the `clearAllAssets` import (it no longer exists).

Replace the `handleRegenerateAssets` (lines 15-26) and the rendered button text/state with:

```tsx
const [isRegenerating, setIsRegenerating] = useState(false);
const [regenStatus, setRegenStatus] = useState<string | null>(null);

const ASSET_KEYS = [
  'sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja',
].flatMap(theme => [
  `roulette_${theme}`, `slots_${theme}`, `bingo_${theme}`,
  `${theme}_1`, `${theme}_2`, `${theme}_3`, `${theme}_4`,
  `bg_roulette_${theme}`, `bg_slots_${theme}`, `bg_bingo_${theme}`,
]).concat(['bg_main']);

const MUSIC_PAIRS: Array<[string, string]> = [
  'sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja',
].flatMap(theme => (['roulette', 'slots', 'bingo'] as const).map(gt => [theme, gt] as [string, string]));

const handleRegenerateAssets = async () => {
  setIsRegenerating(true);
  setRegenStatus(null);
  let done = 0;
  const total = ASSET_KEYS.length + MUSIC_PAIRS.length;
  let quotaHit = false;
  const update = () => setRegenStatus(`Regenerating ${++done}/${total}…`);

  const tasks = [
    ...ASSET_KEYS.map(k => () => regenerateAsset(k).then(update)),
    ...MUSIC_PAIRS.map(([t, gt]) => () => regenerateMusic(t, gt).then(update)),
  ];

  const results = await Promise.allSettled(tasks.map(fn => fn().catch((err) => {
    if (err instanceof RegenQuotaExceededError) quotaHit = true;
    throw err;
  })));

  const failures = results.filter(r => r.status === 'rejected').length;
  if (quotaHit) {
    setRegenStatus("You've hit today's regenerate limit — try again tomorrow.");
  } else if (failures > 0) {
    setRegenStatus(`Regenerated ${total - failures}/${total}. ${failures} failed.`);
  } else {
    setRegenStatus(`All ${total} assets regenerated. Reload the page to see them.`);
  }
  setIsRegenerating(false);
};
```

Update the button JSX (lines 81-88) to surface progress/status:

```tsx
<div className="flex flex-col items-center gap-2">
  <button
    onClick={handleRegenerateAssets}
    disabled={isRegenerating}
    className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
    {isRegenerating ? (regenStatus ?? 'REGENERATING…') : 'REGENERATE ASSETS'}
  </button>
  {!isRegenerating && regenStatus && <p className="text-sm opacity-80">{regenStatus}</p>}
</div>
```

(Keep the surrounding sign-out button JSX as-is.)

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Profile.tsx
git commit -m "refactor(profile): Regenerate button calls per-key POST /regenerate endpoints with progress + quota toast"
```

---

## Task 24: `src/utils/themeStyles.ts` + cleanup `src/App.tsx` theme casts

**Files:**
- Create: `src/utils/themeStyles.ts`
- Modify: `src/App.tsx`

The current `App.tsx:69-79` uses `as any` casts to coerce per-game theme names ('sweets', 'egypt', …) into the user-selectable global theme ('light' | 'dark'). Move the mapping to `themeStyles.ts` and replace casts with a typed helper.

- [ ] **Step 1: Create `src/utils/themeStyles.ts`**

```ts
import type { ThemeType } from '../App';

export const lightThemes: ThemeType[] = ['sweets', 'ocean', 'west'];
export const darkThemes: ThemeType[] = ['egypt', 'space', 'jungle', 'vampire', 'ninja'];

export type GlobalTheme = 'light' | 'dark';

export function resolveGlobalTheme(theme: ThemeType | GlobalTheme | undefined): GlobalTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  if (theme && lightThemes.includes(theme)) return 'light';
  return 'dark';
}
```

- [ ] **Step 2: Modify `src/App.tsx`**

Replace lines 69-79 (the `lightThemes` array, `userTheme` ternary, `currentTheme` resolution, and game-route theme override) with:

```tsx
import { resolveGlobalTheme, lightThemes } from './utils/themeStyles';

// ... inside AppContent():
const userTheme = resolveGlobalTheme(profile?.theme as any);
let currentTheme = userTheme;
if (location.pathname.startsWith('/game/')) {
  const gameId = location.pathname.split('/game/')[1];
  const gameDef = getGameById(gameId);
  if (gameDef) {
    currentTheme = lightThemes.includes(gameDef.theme as any) ? 'light' : 'dark';
  }
}
```

(The remaining `as any` cast on `profile?.theme` is because the `UserProfile` type uses a different theme shape. If the existing `UserProfile.theme` is typed as `'light' | 'dark'`, `resolveGlobalTheme` accepts both — drop the cast. If it's `ThemeType`, also drop the cast. Investigate `src/hooks/useUser.ts` to confirm the actual type and remove the cast accordingly.)

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/themeStyles.ts src/App.tsx
git commit -m "refactor(app): extract themeStyles helper, drop \`as any\` casts on theme resolution"
```

---

## Task 25: `src/firebase.ts` — env-var-driven config

**Files:**
- Modify: `src/firebase.ts`

The existing file imports JSON from `firebase-applet-config.json`, which is being deleted. Replace with `import.meta.env.VITE_FIREBASE_*` reads.

- [ ] **Step 1: Replace `src/firebase.ts`**

```ts
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function requireEnv(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
};

const databaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || '(default)';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors. (If `firebase-applet-config.json` is referenced anywhere else, search and remove.)

```bash
grep -rn "firebase-applet-config" src/ || echo "no references — good"
```

- [ ] **Step 3: Commit**

```bash
git add src/firebase.ts
git commit -m "refactor(firebase): read config from VITE_FIREBASE_* env vars (no JSON import)"
```

---

## Task 26: `vite.config.ts` + `index.html` — drop GEMINI_API_KEY define, make CES build-time conditional

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Replace `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
```

(Drops the `loadEnv`/`define` machinery — `process.env.GEMINI_API_KEY` is no longer needed in the client; Vite reads `VITE_*` natively. Adds dev-server proxy so `npm run dev` (Vite on 3000) forwards `/api/*` to the local Express server (`npm run dev:server` on 8080).)

- [ ] **Step 2: Make CES Messenger conditional in `index.html`**

The current `index.html` hardcodes deployment IDs (lines 16-23). Replace those literals with Vite substitution placeholders, and wrap the entire `<ces-messenger>` block + supporting `<script>` blocks in a build-time guard.

Replace lines 6-7 with:

```html
<title>OVG Casino</title>
```

(Drop the inline gstatic and handlebars `<script>` tags — they only run when CES is enabled. They'll be re-injected conditionally below.)

Replace lines 14-138 (the `<ces-messenger>` element and the supporting `<script>` blocks) with this Vite-conditional template:

```html
<!--__CES_BLOCK_START__-->
<script src="https://www.gstatic.com/ces-console/fast/ces-messenger/ces-messenger.js"></script>
<script src="https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js"></script>
<ces-messenger
  style="position: relative; z-index: 9999;"
  deployment-id="%VITE_CES_DEPLOYMENT_ID%"
  chat-title="%VITE_CES_CHAT_TITLE%"
  token-broker-url="%VITE_CES_TOKEN_BROKER_URL%"
  theme-id="%VITE_CES_THEME_ID%"
  auto-open-chat="false"
  initial-message="Hello"
></ces-messenger>
<script>
  // (template-registration + session-end handlers from the original index.html)
  // Implementer: paste the original <script> blocks (lines 25-138 of the previous index.html) here verbatim.
</script>
<!--__CES_BLOCK_END__-->
```

Vite substitutes `%VITE_*%` in HTML at build time. To strip the entire CES block when `VITE_CES_DEPLOYMENT_ID` is unset, add a small Vite plugin in `vite.config.ts`:

Update `vite.config.ts` to include the plugin:

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function stripCesIfDisabled(): Plugin {
  return {
    name: 'strip-ces-if-disabled',
    transformIndexHtml(html, ctx) {
      const enabled = !!ctx.server || !!process.env.VITE_CES_DEPLOYMENT_ID;
      if (enabled) return html;
      return html.replace(/<!--__CES_BLOCK_START__-->[\s\S]*?<!--__CES_BLOCK_END__-->/, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripCesIfDisabled()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
```

- [ ] **Step 3: Verify the build still produces a working HTML**

```bash
npm run build
```

Expected: build succeeds. Inspect `dist/index.html` — the CES block should be present if `VITE_CES_DEPLOYMENT_ID` is set in the environment, absent otherwise.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts index.html
git commit -m "refactor(build): drop GEMINI_API_KEY define, dev proxy for /api, CES block built conditionally on VITE_CES_DEPLOYMENT_ID"
```

---

## Task 27: Run all tests and verify the project builds

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all server and client tests pass. If any fail, stop and fix them — do not proceed until green.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: `dist/` and `dist-server/` populated, no errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no TypeScript errors on either project.

- [ ] **Step 4: No commit** — this task is a verification gate only.

---

## Task 28: `Dockerfile` + `.dockerignore`

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_DATABASE_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_CES_DEPLOYMENT_ID
ARG VITE_CES_TOKEN_BROKER_URL
ARG VITE_CES_CHAT_TITLE
ARG VITE_CES_THEME_ID
RUN npm run build

# runtime stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 8080
CMD ["node", "dist-server/index.js"]
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
dist
dist-server
.env*
.git
.gitignore
.github
docs
*.md
coverage
.dockerignore
Dockerfile
```

- [ ] **Step 3: Build the image locally to confirm it works**

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=test \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=test \
  --build-arg VITE_FIREBASE_PROJECT_ID=test \
  --build-arg VITE_FIREBASE_APP_ID=test \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=test \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=test \
  --build-arg VITE_FIREBASE_DATABASE_ID=test \
  -t ovg-casino-test .
```

Expected: image builds, ~150-200 MB. (If Docker is not installed locally, skip this step — Cloud Build will exercise it.)

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat(deploy): multi-stage Dockerfile (Node 22 alpine, ~150 MB runtime)"
```

---

## Task 29: `deploy/cloudbuild.yaml` + `deploy/.env.deploy.example`

**Files:**
- Create: `deploy/cloudbuild.yaml`
- Create: `deploy/.env.deploy.example`

- [ ] **Step 1: Create `deploy/cloudbuild.yaml`**

```yaml
substitutions:
  _SERVICE_NAME: ovg-casino
  _REGION: us-central1
  _GCS_BUCKET: ''
  _FIREBASE_PROJECT_ID: ''
  _VITE_FIREBASE_API_KEY: ''
  _VITE_FIREBASE_AUTH_DOMAIN: ''
  _VITE_FIREBASE_PROJECT_ID: ''
  _VITE_FIREBASE_APP_ID: ''
  _VITE_FIREBASE_DATABASE_ID: ''
  _VITE_FIREBASE_STORAGE_BUCKET: ''
  _VITE_FIREBASE_MESSAGING_SENDER_ID: ''
  _VITE_CES_DEPLOYMENT_ID: ''
  _VITE_CES_TOKEN_BROKER_URL: ''
  _VITE_CES_CHAT_TITLE: ''
  _VITE_CES_THEME_ID: ''

options:
  logging: CLOUD_LOGGING_ONLY

steps:
  - id: build
    name: gcr.io/cloud-builders/docker
    args:
      - build
      - --tag
      - ${_REGION}-docker.pkg.dev/${PROJECT_ID}/ovg-casino/app:$BUILD_ID
      - --build-arg
      - VITE_FIREBASE_API_KEY=${_VITE_FIREBASE_API_KEY}
      - --build-arg
      - VITE_FIREBASE_AUTH_DOMAIN=${_VITE_FIREBASE_AUTH_DOMAIN}
      - --build-arg
      - VITE_FIREBASE_PROJECT_ID=${_VITE_FIREBASE_PROJECT_ID}
      - --build-arg
      - VITE_FIREBASE_APP_ID=${_VITE_FIREBASE_APP_ID}
      - --build-arg
      - VITE_FIREBASE_DATABASE_ID=${_VITE_FIREBASE_DATABASE_ID}
      - --build-arg
      - VITE_FIREBASE_STORAGE_BUCKET=${_VITE_FIREBASE_STORAGE_BUCKET}
      - --build-arg
      - VITE_FIREBASE_MESSAGING_SENDER_ID=${_VITE_FIREBASE_MESSAGING_SENDER_ID}
      - --build-arg
      - VITE_CES_DEPLOYMENT_ID=${_VITE_CES_DEPLOYMENT_ID}
      - --build-arg
      - VITE_CES_TOKEN_BROKER_URL=${_VITE_CES_TOKEN_BROKER_URL}
      - --build-arg
      - VITE_CES_CHAT_TITLE=${_VITE_CES_CHAT_TITLE}
      - --build-arg
      - VITE_CES_THEME_ID=${_VITE_CES_THEME_ID}
      - .

  - id: push
    name: gcr.io/cloud-builders/docker
    args:
      - push
      - ${_REGION}-docker.pkg.dev/${PROJECT_ID}/ovg-casino/app:$BUILD_ID

  - id: deploy
    name: gcr.io/google.com/cloudsdktool/cloud-sdk:slim
    entrypoint: gcloud
    args:
      - run
      - deploy
      - ${_SERVICE_NAME}
      - --image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/ovg-casino/app:$BUILD_ID
      - --region=${_REGION}
      - --platform=managed
      - --allow-unauthenticated
      - --port=8080
      - --set-env-vars=GCS_BUCKET=${_GCS_BUCKET},FIREBASE_PROJECT_ID=${_FIREBASE_PROJECT_ID}
      - --set-secrets=GEMINI_API_KEY=gemini-api-key:latest
```

- [ ] **Step 2: Create `deploy/.env.deploy.example`**

```bash
# Copy this to deploy/.env.deploy and fill in. Sourced by deploy/deploy.sh.
# (deploy/.env.deploy is gitignored.)

# === GCP location ===
GCP_PROJECT_ID=
GCP_REGION=us-central1
SERVICE_NAME=ovg-casino
GCS_BUCKET=

# === Firebase web config (Firebase Console → Project Settings → General → Your apps) ===
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=

# === Optional CES Messenger (leave blank to strip widget from build) ===
VITE_CES_DEPLOYMENT_ID=
VITE_CES_TOKEN_BROKER_URL=
VITE_CES_CHAT_TITLE=Casino Concierge
VITE_CES_THEME_ID=dark
```

- [ ] **Step 3: Commit**

```bash
git add deploy/cloudbuild.yaml deploy/.env.deploy.example
git commit -m "feat(deploy): cloudbuild.yaml (build → push → run deploy) and env template"
```

---

## Task 30: `deploy/deploy.sh` — setup, deploy, rotate-key, logs

**Files:**
- Create: `deploy/deploy.sh`

- [ ] **Step 1: Create `deploy/deploy.sh`**

```bash
#!/usr/bin/env bash
# Entry point: ./deploy/deploy.sh {setup|deploy|rotate-key|logs}
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env.deploy"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from deploy/.env.deploy.example" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${SERVICE_NAME:?SERVICE_NAME required}"
: "${GCS_BUCKET:?GCS_BUCKET required}"

cmd="${1:-}"

run() { echo "+ $*"; "$@"; }

cmd_setup() {
  run gcloud config set project "$GCP_PROJECT_ID"

  echo "=== Enabling APIs ==="
  run gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    generativelanguage.googleapis.com \
    iamcredentials.googleapis.com \
    firestore.googleapis.com

  echo "=== Creating Artifact Registry repo (if absent) ==="
  if ! gcloud artifacts repositories describe ovg-casino --location="$GCP_REGION" >/dev/null 2>&1; then
    run gcloud artifacts repositories create ovg-casino \
      --repository-format=docker \
      --location="$GCP_REGION"
  fi

  echo "=== Creating GCS bucket (if absent) ==="
  if ! gcloud storage buckets describe "gs://${GCS_BUCKET}" >/dev/null 2>&1; then
    run gcloud storage buckets create "gs://${GCS_BUCKET}" \
      --location="$GCP_REGION" \
      --uniform-bucket-level-access
  fi

  echo "=== Creating Secret Manager secret (if absent) ==="
  if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
    if [[ -t 0 ]]; then
      read -r -s -p "Enter GEMINI_API_KEY: " key; echo
    else
      key=$(cat)
    fi
    printf "%s" "$key" | gcloud secrets create gemini-api-key --data-file=-
  fi

  echo "=== Granting IAM to Cloud Run service account ==="
  PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")
  RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

  run gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/datastore.user"
  run gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor"
  run gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/storage.objectAdmin"
  run gcloud iam service-accounts add-iam-policy-binding "$RUN_SA" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/iam.serviceAccountTokenCreator"

  echo "=== Deploying Firestore rules ==="
  if command -v firebase >/dev/null 2>&1; then
    run firebase deploy --only firestore:rules --project "$GCP_PROJECT_ID"
  else
    echo "(firebase CLI not installed — run \`firebase deploy --only firestore:rules\` manually)"
  fi

  echo "=== Setup complete ==="
}

cmd_deploy() {
  echo "=== Pre-build gate: npm test ==="
  (cd "$ROOT_DIR" && npm test)

  echo "=== Submitting Cloud Build ==="
  local subs=(
    "_SERVICE_NAME=${SERVICE_NAME}"
    "_REGION=${GCP_REGION}"
    "_GCS_BUCKET=${GCS_BUCKET}"
    "_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
    "_VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}"
    "_VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}"
    "_VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
    "_VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}"
    "_VITE_FIREBASE_DATABASE_ID=${VITE_FIREBASE_DATABASE_ID:-}"
    "_VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}"
    "_VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}"
    "_VITE_CES_DEPLOYMENT_ID=${VITE_CES_DEPLOYMENT_ID:-}"
    "_VITE_CES_TOKEN_BROKER_URL=${VITE_CES_TOKEN_BROKER_URL:-}"
    "_VITE_CES_CHAT_TITLE=${VITE_CES_CHAT_TITLE:-}"
    "_VITE_CES_THEME_ID=${VITE_CES_THEME_ID:-}"
  )
  local IFS=,
  run gcloud builds submit \
    --project "$GCP_PROJECT_ID" \
    --config "${ROOT_DIR}/deploy/cloudbuild.yaml" \
    --substitutions="${subs[*]}" \
    "$ROOT_DIR"
}

cmd_rotate_key() {
  if [[ -t 0 ]]; then
    read -r -s -p "Enter new GEMINI_API_KEY: " key; echo
  else
    key=$(cat)
  fi
  printf "%s" "$key" | gcloud secrets versions add gemini-api-key \
    --project "$GCP_PROJECT_ID" \
    --data-file=-
  echo "Rotated. Cloud Run picks up :latest on next request."
}

cmd_logs() {
  run gcloud run services logs tail "$SERVICE_NAME" \
    --project "$GCP_PROJECT_ID" \
    --region "$GCP_REGION"
}

case "$cmd" in
  setup) cmd_setup ;;
  deploy) cmd_deploy ;;
  rotate-key) cmd_rotate_key ;;
  logs) cmd_logs ;;
  *)
    echo "Usage: $0 {setup|deploy|rotate-key|logs}" >&2
    exit 1
    ;;
esac
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x deploy/deploy.sh
```

- [ ] **Step 3: Smoke-test the script's argument parsing**

```bash
./deploy/deploy.sh
```

Expected: prints `Usage: ./deploy/deploy.sh {setup|deploy|rotate-key|logs}` and exits 1. (If `deploy/.env.deploy` doesn't exist, you'll see the missing-env-file error first — also acceptable.)

- [ ] **Step 4: Commit**

```bash
git add deploy/deploy.sh
git commit -m "feat(deploy): deploy.sh wrapper for setup, deploy, rotate-key, logs"
```

---

## Task 31: `README.md` rewrite

**Files:**
- Modify: `README.md` (full replacement)

- [ ] **Step 1: Replace `README.md`**

```markdown
# OVG Casino

A virtual-currency casino prototype with AI-generated themed assets and music. Three games (roulette, slots, bingo) across eight themes (sweets, egypt, space, west, ocean, jungle, vampire, ninja). Built on React + Vite, deployed on Google Cloud Run.

## Architecture

\`\`\`
Browser ──► Cloud Run (Express + React static)
              │
              ├── GET /  + /game/* + /assets/* → static React build (dist/)
              │
              ├── GET /healthz → 200
              │
              ├── GET /api/asset/:key
              │   GET /api/music/:theme/:gameType
              │        → Helmet + auth + rate-limit
              │        → HEAD users/<uid>/<key>     → hit: sign URL
              │        → HEAD global/<key>          → hit: sign URL
              │        → miss: lock, call Gemini, upload to global, sign URL
              │
              └── POST /api/asset/:key/regenerate
                  POST /api/music/:theme/:gameType/regenerate
                       → auth + per-uid daily quota (Firestore counter)
                       → call Gemini, upload to users/<uid>/<key>, sign URL
\`\`\`

GCS bucket is private. Browsers receive 1-hour V4 signed URLs and load assets directly from GCS. The Gemini key lives in Secret Manager and is mounted by Cloud Run as `$GEMINI_API_KEY`. See `docs/ARCHITECTURE.md` for the full request-flow walkthrough.

## Local development

Prerequisites: Node 22+, a Firebase project (Auth + Firestore enabled), a Gemini API key.

\`\`\`bash
git clone <repo>
cd ovg-casino-ui
cp .env.example .env   # then fill in the VITE_FIREBASE_* and GEMINI_API_KEY values
npm install
npm run dev:server    # terminal 1 — Express on :8080
npm run dev           # terminal 2 — Vite on :3000, proxies /api to :8080
\`\`\`

Open <http://localhost:3000>. Vite's dev server proxies `/api/*` to the Express server.

## Tests

\`\`\`bash
npm test
\`\`\`

Vitest runs server (node env) and client (jsdom env) projects in parallel. Both must pass before deploy. The `deploy.sh deploy` command runs `npm test` as a pre-build gate.

## Deployment

One-time setup (per GCP project):

\`\`\`bash
cp deploy/.env.deploy.example deploy/.env.deploy
# fill in GCP_PROJECT_ID, GCS_BUCKET, all VITE_FIREBASE_* values, optionally CES vars
./deploy/deploy.sh setup     # enables APIs, creates bucket, secret, IAM, Firestore rules
\`\`\`

Subsequent deploys:

\`\`\`bash
./deploy/deploy.sh deploy    # runs tests, builds in Cloud Build, deploys to Cloud Run
\`\`\`

Other commands:

- `./deploy/deploy.sh rotate-key` — rotate the Gemini API key in Secret Manager.
- `./deploy/deploy.sh logs` — tail Cloud Run logs.

## Configuration

All env vars documented in `.env.example` (local + server) and `deploy/.env.deploy.example` (deploy automation).

## Project layout

- `src/` — React client (Vite-built)
- `server/` — Express server (TypeScript-built to `dist-server/`)
- `deploy/` — Cloud Build + deploy script
- `docs/` — architecture, security, brainstormed designs and plans
- `firestore.rules` — Firestore security rules

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for design and threat-model notes.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: replace AI-Studio scaffold README with project-specific overview"
```

---

## Task 32: `docs/ARCHITECTURE.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Create `docs/ARCHITECTURE.md`**

```markdown
# Architecture

## Overview

OVG Casino is a single-tenant Cloud Run service. The runtime container serves both the React static build and the Express API at `/api/*`. AI-generated assets live in a private GCS bucket; browsers receive V4 signed URLs.

## Request flow — `GET /api/asset/:key`

1. Browser sends request with `Authorization: Bearer <Firebase-ID-token>`.
2. `verifyFirebaseToken` middleware decodes the token via `firebase-admin`. Sets `req.uid`. 401 on invalid/expired/missing.
3. Per-uid rate limit (`express-rate-limit`, default 30 req/min). 429 on overage.
4. Route handler validates `:key` against `Object.keys(ASSET_PROMPTS)`. 400 on unknown.
5. **Shadow lookup:** HEAD `assets/v1/users/<uid>/<key>.png` in GCS. If exists, sign and return.
6. **Global fallback:** `readOrGenerateGlobal(assets/v1/global/<key>.png)`:
   - HEAD; if exists, sign and return.
   - Else, acquire per-key in-memory lock. Coalesces concurrent same-key requests on this instance.
   - Call `generateImage(prompt, aspectRatio)` against Gemini. On success, upload to GCS with `Cache-Control: public, max-age=31536000, immutable`. Sign the URL.
   - Release the lock.
7. Respond `200 { url, expiresAt }`.

The browser fetches the asset bytes directly from GCS via the signed URL. Bandwidth doesn't pass through Cloud Run.

## Request flow — `POST /api/asset/:key/regenerate`

1. Auth (same as GET).
2. `regenLimit` middleware: read-modify-write `regen_quota/<uid>` Firestore document keyed on today's UTC date. If counter `>= REGEN_RATE_LIMIT_PER_DAY` (default 200), reject with 429. Otherwise increment and continue.
3. Route validates `:key`.
4. `regenerateShadow(assets/v1/users/<uid>/<key>.png)`: always invokes the generator, uploads to the user-shadow path with `Cache-Control: private, max-age=31536000, immutable`.
5. Respond `200 { url, expiresAt }`.

The user's next GET will see the shadow object and serve from there. Other users are unaffected.

## Shadow asset model

| Object | Created by | Cache-Control | Visible to |
|---|---|---|---|
| `assets/v1/global/<key>.png` | First user's GET miss | `public, immutable` | Everyone (via GET fallback) |
| `assets/v1/users/<uid>/<key>.png` | This user's POST regen | `private, immutable` | Only `<uid>` (preferred over global on GET) |

To invalidate everything (e.g., after a prompt change): bump `v1` → `v2` in code. Old `v1/users/...` objects linger in GCS but become unreachable; clean up with `gcloud storage rm` or a lifecycle rule if desired.

## State map

| State | Lives in | Lifecycle |
|---|---|---|
| Per-key in-flight generation lock | Cloud Run instance memory | Cleared after generation completes; per-instance |
| Asset / music bytes | GCS, immutable objects | Until prompt-version bump |
| Per-uid daily regen counter | Firestore `regen_quota/<uid>` | Reset when document's `date` field doesn't match today's UTC date |
| Signed URL | Browser memory (memo in AssetManager) | TTL 1 h, refetched within 60 s of expiry |
| User profile / balance | Firestore (existing schema, not touched) | Forever |

## Why signed URLs over a public bucket?

Signed URLs let us keep the bucket fully private — no public ACLs, no risk of misconfigured anonymous reads — while still letting browsers stream assets directly without proxying bytes through Cloud Run. The 1-hour TTL means a leaked URL has bounded blast radius. The Cloud Run service account signs URLs via `iamcredentials.signBlob` (the `roles/iam.serviceAccountTokenCreator` self-grant) — no service-account key file lives in the repo.

## Adding a new game or theme

1. Add prompt entries to `server/lib/prompts.ts` for each `<asset>_<theme>` (3 game pictograms + 4 symbols + 3 backgrounds = 10 keys per theme) and 3 music keys (`<theme>_<gametype>`).
2. Add the theme to `src/utils/themeStyles.ts` (light or dark group).
3. Add the game (or theme) entry to `src/config/games.ts`.
4. Bump `v1` → `v2` in cache prefixes in code if the prompt change should invalidate existing cached assets globally.
5. Deploy.

## What happens when a user clicks Regenerate?

`Profile.tsx` fires a parallel batch of `regenerateAsset(key)` and `regenerateMusic(theme, gameType)` calls — one per known asset and music pair. Each one POSTs to its `/regenerate` endpoint, gets quota-checked, generates fresh bytes via Gemini, uploads to the user's shadow path, and returns the new signed URL. Failures are surfaced per-key; a 429 short-circuits the batch with a friendly toast. The global cache is untouched; only this user's shadow copies change.
```

- [ ] **Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture overview with request flow, shadow model, state map"
```

---

## Task 33: `docs/SECURITY.md`

**Files:**
- Create: `docs/SECURITY.md`

- [ ] **Step 1: Create `docs/SECURITY.md`**

```markdown
# Security Notes

Short threat-model summary. Not a comprehensive audit.

## Secrets

- **`GEMINI_API_KEY`** lives in Secret Manager (`gemini-api-key`), mounted into Cloud Run via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`. Never commit it. `.env.example` annotates it as Secret-Manager-only in prod.
- **No service-account key file in the repo.** Cloud Run uses Application Default Credentials. Signed URLs are produced via `iamcredentials.signBlob` (the `roles/iam.serviceAccountTokenCreator` self-grant), not a private key.
- **Firebase web config** (`VITE_FIREBASE_*`) is *not secret* — it's safe to ship in the client bundle. Auth is enforced by Firebase Auth, not by hiding these strings.

## Asset access

- GCS bucket has uniform bucket-level access; no public ACLs. Browsers receive V4 signed URLs with a 1-hour TTL.
- All `/api/*` routes (except `/healthz`) require a valid Firebase ID token. Anonymous traffic cannot reach the Gemini-backed endpoints.

## Rate limiting

- **`/api/*` GETs**: per-uid 30 req/min via `express-rate-limit` (configurable via `RATE_LIMIT_RPM`). Returns 429.
- **`/api/*/regenerate` POSTs**: per-uid daily counter (Firestore `regen_quota/<uid>`), default 200/day (configurable via `REGEN_RATE_LIMIT_PER_DAY`). Bounds the Gemini cost a single user can drive.

## SSRF / prompt injection

- The server-side prompts (`ASSET_PROMPTS`, `MUSIC_PROMPTS`) are static, defined in `server/lib/prompts.ts`. **No user-supplied text ever reaches Gemini.** Routes validate `:key` / `:theme/:gameType` against `Object.keys(...)` of the prompt maps and reject unknown values with 400.

## HTTP headers

- **Helmet** with default CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`.
- **CORS** disabled by default (same-origin). Enable per env var if a split deploy needs it.

## Firestore rules

- Existing rules govern user profiles and balances (unchanged in this work).
- New `regen_quota/<uid>` collection is **deny-all to clients**. Only the server's Admin SDK writes to it (Admin SDK bypasses rules). Prevents a malicious client from resetting their own counter.

## Logging

- Structured JSON logs per request: `{method, path, uid, status, durationMs}`. Picked up by Cloud Logging automatically. Server-side errors are logged with full detail; client responses are sanitised (`502 { error: 'generation_failed' }`) — no stack traces or upstream messages leaked.

## Out of scope

- DDoS protection beyond Cloud Run's defaults and the per-uid rate limits.
- Tightening Firestore rules toward server-authoritative game outcomes (current rules trust client writes; acceptable for virtual-currency social play).
- Penetration testing; this is a prototype.
```

- [ ] **Step 2: Commit**

```bash
git add docs/SECURITY.md
git commit -m "docs: add SECURITY.md with secrets, rate-limit, SSRF, and rules summary"
```

---

## Task 34: Final verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (server + client). If any fail, fix them — the suite is the deploy gate.

- [ ] **Step 2: Run lint on both projects**

```bash
npm run lint
```

Expected: zero TypeScript errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: `dist/` and `dist-server/` both populated.

- [ ] **Step 4: Local smoke (optional, requires `.env`)**

```bash
npm run dev:server &
SERVER_PID=$!
sleep 2
curl -s http://localhost:8080/healthz
kill $SERVER_PID
```

Expected: `ok`.

- [ ] **Step 5: Confirm git tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 6: Push to origin (when ready)**

```bash
git push origin main
```

(Only when the user explicitly asks.)

---

## Done

Plan finished. The branch should now have ~30 commits covering server, client refactor, deploy, and docs. Run `./deploy/deploy.sh setup` once per GCP project, then `./deploy/deploy.sh deploy` for each release.
