# Cloud Run Hardening — Design Spec

**Date:** 2026-05-05
**Status:** Approved (awaiting implementation plan)
**Scope:** Make the OVG Casino prototype (currently AI-Studio-generated, browser-only) deployable on Cloud Run with proper security, simplified code, and complete documentation.

---

## 1. Goals & non-goals

### Goals

- **Security.** No API keys in the client bundle. Asset access gated by Firebase Auth. Bucket private with signed URLs. Helmet security headers. Per-user rate limiting on AI endpoints.
- **Cloud Run deployable.** Proper Express server, multi-stage Dockerfile, `PORT` binding, health check, single-script deploy that handles the IAM and Secret Manager wiring.
- **Code simplicity.** Remove duplication in the AI Manager modules. Extract a shared `<GameShell>` component the three games can build on. Fix the fabricated dependency versions and the `as any` theme casts.
- **Documentation.** Replace the AI Studio default README with a real one. Add architecture and security docs. Document every env var.
- **Tests.** Lock in the new server boundaries (auth, cache, key validation) and the new client memo logic with focused Vitest suites that gate the deploy.

### Non-goals (explicitly out of scope)

- CI/CD pipeline. Deployment is from a developer machine via `./deploy/deploy.sh`.
- Tightening Firestore rules toward server-authoritative game outcomes. Current rules are acceptable for virtual-currency social play.
- Reworking game logic for correctness (e.g., real European roulette colour mapping, real bingo payout tables).
- Asset pre-warming on deploy. The first user of each (theme × game) combination warms the cache.
- Cloud Run autoscaling/multi-region tuning. Defaults stand.
- Provisioning a CES Messenger backend. The widget is made *configurable*; standing up its server side is a separate console workflow.

---

## 2. Architecture

```
Browser ──► Cloud Run (Express + React static)
              │
              ├── GET /  + /game/* + /assets/* → static React build (dist/)
              │
              ├── GET /healthz → 200
              │
              ├── GET /api/asset/:key
              │   GET /api/music/:theme/:gameType
              │        │
              │        ├── Helmet + CORS + rate-limit (per uid)
              │        ├── verify Firebase ID token (firebase-admin)
              │        ├── validate :key/:theme/:gameType against allow-list
              │        ├── HEAD users/<uid>/<key>  → hit: sign URL → 200
              │        ├── HEAD global/<key>       → hit: sign URL → 200
              │        └── miss: per-key in-flight lock
              │                 → call Gemini
              │                 → upload to GCS global/ (immutable, content-type)
              │                 → sign URL → 200 {url, expiresAt}
              │
              └── POST /api/asset/:key/regenerate
                  POST /api/music/:theme/:gameType/regenerate
                       │
                       ├── auth + key validation
                       ├── per-uid daily regen quota (Firestore counter)
                       ├── call Gemini (always; no cache check)
                       ├── upload to GCS users/<uid>/<key> (private, immutable)
                       └── sign URL → 200 {url, expiresAt}

GCS bucket (private, uniform bucket-level access) ◄── browser fetches asset directly via signed URL
Secret Manager (gemini-api-key) ──► mounted as $GEMINI_API_KEY env var on Cloud Run
Firestore regen_quota/<uid> ◄── per-uid daily counter for regen calls
```

### Request flow consequences

- Gemini key never leaves Cloud Run. Lives in Secret Manager, mounted by Cloud Run as `$GEMINI_API_KEY`.
- Bucket is private. Browsers receive V4 signed GET URLs with 1-hour TTL and load assets directly from GCS.
- All asset/music access goes through Firebase Auth verification. Anonymous traffic cannot burn the AI quota.
- Each (theme × game) asset is generated **once globally** by default. The first user warms the shared cache at `assets/v1/global/<key>.png`; everyone else hits it. Users who want a different roll can call the regenerate endpoint, which produces a personalized copy at `assets/v1/users/<uid>/<key>.png` and serves it only to them on subsequent GETs.
- The browser-side queue/retry/IndexedDB-cache machinery (~370 lines across `AssetManager.ts` and `MusicManager.ts`) is deleted. Those modules become ~40-line clients that fetch from the API.

---

## 3. Server design

### Layout

```
server/
  index.ts            # Express bootstrap, static, /healthz, /api mount, port binding
  middleware/
    auth.ts           # verifyFirebaseToken → req.uid; 401 on failure
    regenLimit.ts     # per-uid daily regen counter (Firestore); 429 on overage
    errors.ts         # central error handler; sanitised JSON; structured logging
  routes/
    asset.ts          # GET /api/asset/:key, POST /api/asset/:key/regenerate
    music.ts          # GET /api/music/:theme/:gameType, POST /api/music/:theme/:gameType/regenerate
  lib/
    gemini.ts         # generateImage(prompt, aspect), generateMusic(prompt)
    cache.ts          # readOrGenerateGlobal(), regenerateShadow(): HEAD/generate, in-flight lock, sign URL
    storage.ts        # GCS client wrapper: head, upload, getSignedUrl
    prompts.ts        # ASSET_PROMPTS and MUSIC_PROMPTS (moved out of client)
    config.ts         # typed env-var reader; throws at boot if a required var is missing
```

### Endpoint contract — `GET /api/asset/:key`

1. Auth middleware verifies `Authorization: Bearer <id-token>` via `firebase-admin.auth().verifyIdToken()`. Sets `req.uid`. Rejects with 401 on missing/malformed/expired.
2. Validate `:key` against `Object.keys(ASSET_PROMPTS)`. Reject unknown with 400. **No user-supplied prompt text ever reaches Gemini.**
3. Compute candidate object names: `assets/v1/users/<req.uid>/<key>.png` (user shadow) and `assets/v1/global/<key>.png` (shared default).
4. HEAD the user-shadow object. If exists → sign URL, return. (Cheap; no lock needed since shadow is only ever written by this user's own POST.)
5. `readOrGenerateGlobal({ bucket, objectName: <global>, contentType: 'image/png', generator })`:
   - HEAD the global object. If exists → sign URL, return.
   - Else, acquire per-key in-memory lock (`Map<string, Promise>`). Coalesces concurrent requests for the same global key on the same instance.
   - Call generator (Gemini image API). On success: upload to global path with `Cache-Control: public, max-age=31536000, immutable` and the right content-type, then sign URL.
   - On failure: release lock, propagate typed error.
6. Respond `200 { url: <signed-url>, expiresAt: <epoch> }`.
7. Errors handled centrally → `502 { error: 'generation_failed' }` with no stack or upstream message.

### Endpoint contract — `GET /api/music/:theme/:gameType`

Same shape as asset routes against `MUSIC_PROMPTS`, with `audio/wav` content type. Candidate names `music/v1/users/<req.uid>/<theme>_<gameType>.wav` (shadow) and `music/v1/global/<theme>_<gameType>.wav` (shared default).

### Endpoint contract — `POST /api/asset/:key/regenerate`

1. Auth middleware: same as GET.
2. `regenLimit` middleware: read-modify-write `regen_quota/<req.uid>` Firestore document keyed on today's UTC date. If counter `>= REGEN_RATE_LIMIT_PER_DAY` (default 200), reject with `429 { error: 'regen_quota_exceeded' }` and do not invoke the generator. Otherwise increment and continue. Counter resets on UTC date rollover.
3. Validate `:key` against `Object.keys(ASSET_PROMPTS)`. Reject unknown with 400.
4. `regenerateShadow({ bucket, objectName: 'assets/v1/users/<req.uid>/<key>.png', contentType: 'image/png', generator })`:
   - Always call generator (Gemini image API), bypassing any HEAD check.
   - On success: upload to user-shadow path with `Cache-Control: private, max-age=31536000, immutable`, then sign URL.
   - On failure: propagate typed error. Quota counter is **not** decremented (keeps the limit a hard cap; protects against retry storms).
5. Respond `200 { url: <signed-url>, expiresAt: <epoch> }`.
6. Errors handled centrally → `502 { error: 'generation_failed' }` with no stack or upstream message.

### Endpoint contract — `POST /api/music/:theme/:gameType/regenerate`

Same shape, against `MUSIC_PROMPTS`, with `audio/wav` content type, object name `music/v1/users/<req.uid>/<theme>_<gameType>.wav`.

### Auth, rate limiting, headers

- **Firebase Auth ID tokens** in `Authorization: Bearer <token>` header on all `/api/*` routes (except `/healthz`).
- **`express-rate-limit`** keyed by `req.uid`, 30 requests per minute (configurable via `RATE_LIMIT_RPM`). Returns 429. Applies to `GET /api/*` only — regen endpoints have their own quota.
- **Regen quota** — `POST /api/*/regenerate` enforces a per-uid per-day cap (default 200, configurable via `REGEN_RATE_LIMIT_PER_DAY`). Counter persisted in Firestore at `regen_quota/<uid>` (document holds today's UTC date and the count). Bounds the Gemini cost any single user can drive. A full "regenerate all my assets" click costs ~30 (image keys) + ~10 (music tracks) ≈ 40 quota units; default 200/day allows ~5 full cycles.
- **Helmet** with default CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`.
- **CORS** disabled by default (same-origin); enabled per env var if needed for split deploys.

### Caching strategy

- **GCS bucket** `${GCP_PROJECT_ID}-ovg-casino-assets` (configurable via `GCS_BUCKET`). Uniform bucket-level access; no public ACLs.
- **Object layout** —
  - `assets/v1/global/<key>.png`, `music/v1/global/<theme>_<gameType>.wav` — shared default. Generated once globally on first GET miss. `Cache-Control: public, max-age=31536000, immutable`.
  - `assets/v1/users/<uid>/<key>.png`, `music/v1/users/<uid>/<theme>_<gameType>.wav` — per-user shadow. Created only by an explicit POST regen call. `Cache-Control: private, max-age=31536000, immutable`. GET checks user-shadow first, falls back to global.
- **Versioning via path prefix** — bump `v1` → `v2` in code to invalidate both global and shadow caches simultaneously after a prompt change. Old `v1/users/...` objects linger in GCS unreachable; clean up via lifecycle rule or manual `gcloud storage rm` if needed.
- **Signed URLs** V4, 1-hour TTL (configurable via `SIGNED_URL_TTL_SEC`). Maximum allowed by GCS is 7 days; we default low for defence-in-depth.
- **Per-instance dedup** via `Map<string, Promise>` lock keyed on the global object name. Across instances, GCS HEAD-on-arrival is cheap so duplicate generation is bounded. Shadow writes are not lock-coalesced — a user spamming regen for the same key produces sequential overwrites, bounded by their daily quota.
- **Shadow lifecycle** — shadow objects persist indefinitely in v1. No TTL eviction. Storage cost discussed in §10.

### Health & ops

- `GET /healthz` returns 200 unauthenticated. Used by Cloud Run startup probe.
- Structured JSON logging per request: `{method, path, uid, status, durationMs, cacheHit}`. Picked up by Cloud Logging automatically.
- Server `index.ts` reads `process.env.PORT` (Cloud Run sets it dynamically) and binds `0.0.0.0:$PORT`. Defaults to 8080 locally.

---

## 4. Client refactor

### Slim AI clients

`src/lib/AssetManager.ts` and `src/lib/MusicManager.ts` become ~50-line clients each:

- In-memory `Map<key, {url, expiresAt}>`.
- `getAsset(key)`: if memo hit and not within 60s of expiry → return cached URL. Else `GET /api/asset/:key` with `Authorization: Bearer <id-token>` (obtained via `auth.currentUser.getIdToken()`). Store `{url, expiresAt}` from the JSON response. Return URL.
- `regenerateAsset(key)`: `POST /api/asset/:key/regenerate` with the same auth header. Replace the memo entry with the returned `{url, expiresAt}`. Return URL. 429 surfaces as a typed `RegenQuotaExceededError` so the UI can render a friendly toast.
- Fetch errors reject the promise without poisoning memo (so retries work).

`MusicManager` mirrors the same shape with `regenerateMusic(theme, gameType)`.

The `ASSET_PROMPTS` and `MUSIC_PROMPTS` maps move to `server/lib/prompts.ts`. Client no longer references them.

### Hook simplification

`useAssets` and `useMusic` keep their public signatures so call sites don't change. Internal progress accounting drops the per-asset breakdown — fetches are now O(50ms) HEAD-or-sign rather than minute-long Gemini calls. The "Generating unique game assets…" loading copy still applies on a true cold cache (server miss); the spinner stays correct without ceremony.

### `<GameShell>` extraction

New `src/components/Games/GameShell.tsx` owns the boilerplate currently duplicated across `Roulette.tsx`, `Slots.tsx`, `Bingo.tsx`:

- Asset + music wiring with combined progress
- Loading screen
- Header (back-to-lobby button)
- `<audio>` element wired to music URL
- Win/jackpot overlay AnimatePresence + confetti
- Bet input + play button row
- Theme styling

Each game shrinks from ~250 lines to ~80–120, containing only its game-specific play surface and state machine.

```tsx
<GameShell
  name={name}
  theme={theme}
  bgKey={`bg_roulette_${theme}`}
  extraAssetKeys={[]}
  gameType="roulette"
  win={winState}
  bet={betAmount}
  onBet={setBetAmount}
  onPlay={handleSpin}
  playLabel="SPIN THE WHEEL"
  playDisabled={spinning || !betType}
  message={message}
  balance={balance}
>
  {/* the wheel itself — Roulette's only unique JSX */}
</GameShell>
```

### Pure game-logic helpers

New `src/components/Games/gameLogic.ts` extracts win-determination from the components so it can be unit-tested:

- `evaluateRouletteBet(num, color, betType) → won?`
- `evaluateSlotsResult(reels) → 'jackpot' | 'small' | 'none'`
- `evaluateBingoBoard(board, drawn) → won?`

(Existing logic is preserved as-is, including the simplified roulette colour rule. Correctness is non-goal §1.)

### Smaller fixes

- `App.tsx:69-79`: drop `as any` theme casts. Profile `theme` field uses the same `ThemeType` union as everywhere else (`'light' | 'dark' | 'sweets' | 'egypt' | ...`). `'light'` and `'dark'` are user-selectable global themes; per-game themes derive from `getGameById`. The `lightThemes`/`darkThemes` mapping moves to a `themeStyles` sibling.
- `firebase-utils.ts`: throw real `Error` objects with structured fields as own properties. Stop throwing `new Error(JSON.stringify(...))`.
- `useAssets`: replace `keys.join(',')` effect dep with explicit memoization at call sites.
- Drop unused imports across the games (`useEffect`, `useRef` in some files).
- `Profile.tsx`: keep the "Regenerate Assets" button, rewire it to the new `regenerateAsset` / `regenerateMusic` client methods. On click: fire all known asset and music keys in parallel through the regen endpoints (`Promise.allSettled` so one failure doesn't abort the rest), then refresh the in-memory memo so subsequent renders pick up the new shadow URLs. Disable the button while in flight; show progress (e.g. `Regenerating 12/40…`). On `RegenQuotaExceededError`, surface a friendly toast (`"You've hit today's regenerate limit — try again tomorrow."`) and stop firing further requests in this batch. The shared global cache is unaffected; only this user's shadow copies are written.

### CES Messenger — make it optional

`index.html` keeps the `<ces-messenger>` block but Vite-substitutes `deployment-id`, `token-broker-url`, and (optionally) `chat-title`/`theme-id` from build-time `VITE_CES_*` env vars. If `VITE_CES_DEPLOYMENT_ID` is unset at build, the entire `<ces-messenger>` element and its supporting `<script>` blocks are stripped via dead-code elimination guarded by an `import.meta.env.VITE_CES_DEPLOYMENT_ID` boolean. The `App.tsx` CES sync `useEffect` already no-ops when the element isn't present.

---

## 5. Configuration

### Three sources, by audience

| Where | Used by | How loaded | Examples |
|---|---|---|---|
| `.env` (local) / Cloud Run env vars (prod) — server | Express server | `process.env` via `server/lib/config.ts`; throws at boot if a required var is missing | `GCS_BUCKET`, `FIREBASE_PROJECT_ID`, `PORT`, `RATE_LIMIT_RPM`, `REGEN_RATE_LIMIT_PER_DAY`, `SIGNED_URL_TTL_SEC` |
| `.env` (local) / build args (prod) — client | React build | `import.meta.env.VITE_*` baked into bundle at `vite build` time | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_DATABASE_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_CES_DEPLOYMENT_ID` (optional), `VITE_CES_TOKEN_BROKER_URL` (optional) |
| Secret Manager — server only | Express server | Mounted by Cloud Run as env var via `--set-secrets`; never in `.env.example`, never in source | `GEMINI_API_KEY` |

### `server/lib/config.ts`

```ts
export const config = {
  port: optionalInt('PORT', 8080),
  geminiApiKey: requireStr('GEMINI_API_KEY'),
  gcsBucket: requireStr('GCS_BUCKET'),
  firebaseProjectId: requireStr('FIREBASE_PROJECT_ID'),
  signedUrlTtlSec: optionalInt('SIGNED_URL_TTL_SEC', 3600),
  rateLimitRpm: optionalInt('RATE_LIMIT_RPM', 30),
  regenLimitPerDay: optionalInt('REGEN_RATE_LIMIT_PER_DAY', 200),
};
```

A missing required var throws on boot — Cloud Run fails fast on the startup probe rather than 500ing later.

### Files removed from git

- `firebase-applet-config.json` — replaced by `VITE_FIREBASE_*` env vars. Added to `.gitignore` as a guard so it can't be re-committed accidentally.
- `firebase-blueprint.json` — Firebase Studio scaffolding artifact, not used at runtime.
- `metadata.json` — AI Studio applet metadata, not used at runtime.

### Firebase Admin on the server

Uses Application Default Credentials. On Cloud Run that's the attached service account; locally it's `gcloud auth application-default login`. No service account JSON file in the repo.

### IAM (Cloud Run runtime service account)

- `roles/iam.serviceAccountTokenCreator` on **itself** — for V4 signed URL signing without an SA key file (uses metadata server `iamcredentials.signBlob`).
- `roles/storage.objectAdmin` scoped to `${GCS_BUCKET}` only — read/write/sign on the asset bucket.
- `roles/secretmanager.secretAccessor` on the `gemini-api-key` secret only.
- `roles/datastore.user` on the project — Firestore read/write for the `regen_quota/<uid>` counter (firebase-admin Application Default Credentials). Existing app already uses Firestore for player data; this just makes the runtime SA's access explicit.

### Firestore rules

Existing `firestore.rules` deploys cleanly against any project (no project-specific references). The `setup` step in `deploy.sh` deploys it via `firebase deploy --only firestore:rules` if the `firebase` CLI is installed; otherwise prints the manual command.

The `regen_quota` collection is added to the rules with **deny-all** to client SDKs — only the server's Admin SDK (which bypasses rules) writes to it. This prevents a malicious client from resetting their own counter.

---

## 6. Packaging & deployment

### Dockerfile

Multi-stage, runtime image ~150MB:

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

`.dockerignore` excludes `node_modules`, `dist`, `dist-server`, `.env*`, `.git`, `docs`, `*.md`.

### `deploy/` directory

```
deploy/
  deploy.sh              # entry: ./deploy/deploy.sh {setup|deploy|rotate-key|logs}
  cloudbuild.yaml        # docker build + push + Cloud Run deploy in one Cloud Build run
  .env.deploy.example    # template — user copies to .env.deploy and fills in
```

### `deploy.sh` subcommands

| Command | Idempotent | What it does |
|---|---|---|
| `setup` | yes | Enables APIs (`run`, `cloudbuild`, `secretmanager`, `storage`, `artifactregistry`, `generativelanguage`, `iamcredentials`). Creates the GCS bucket with uniform bucket-level access. Creates the `gemini-api-key` secret in Secret Manager (prompts via `read -s` if not piped). Grants the IAM roles listed in §5. Optionally `firebase deploy --only firestore:rules` if `firebase` CLI present. |
| `deploy` | yes | Runs `npm test` first as a pre-build gate. Sources `deploy/.env.deploy`. Calls `gcloud builds submit --config deploy/cloudbuild.yaml --substitutions=...`. Cloud Build does docker build (with `VITE_*` as `--build-arg`), pushes to Artifact Registry, runs `gcloud run deploy`. Docker not required on dev machine. |
| `rotate-key` | yes | `gcloud secrets versions add gemini-api-key --data-file=-` (reads new value from stdin via `read -s`). Service picks up `:latest` on next request. |
| `logs` | yes | `gcloud run services logs tail $SERVICE_NAME --region=$GCP_REGION`. |

`set -euo pipefail`. Each step prints what it's about to run. Check-before-create patterns make `setup` safe to re-run.

### `cloudbuild.yaml`

Three steps in one Cloud Build invocation: `docker build` (forwards every `VITE_*` substitution as `--build-arg`), `docker push` to Artifact Registry, then `gcloud run deploy` with `--set-env-vars` (server config) and `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest` (Secret Manager binding).

### `.env.deploy.example`

Lists every variable needed by setup, build, and deploy: GCP location (`GCP_PROJECT_ID`, `GCP_REGION`, `SERVICE_NAME`, `GCS_BUCKET`), Firebase web config (the seven `VITE_FIREBASE_*` from Firebase Console → Project Settings → General), and optional CES (`VITE_CES_DEPLOYMENT_ID`, `VITE_CES_TOKEN_BROKER_URL` — leave blank to disable widget). One-line comment per var. Never committed (`.env.deploy` is in `.gitignore`).

### `package.json` rewrite

- **Scripts:** `dev` (vite), `dev:server` (`tsx watch --env-file=.env server/index.ts` — uses Node's native `--env-file` support, no `dotenv` package needed), `build` (vite build && tsc -p tsconfig.server.json), `start` (node dist-server/index.js), `lint` (tsc --noEmit on both configs), `test` (vitest run), `test:watch` (vitest). In production, Cloud Run sets env vars directly — no `.env` file is read.
- **Dependency version pins** — fabricated versions corrected to actually-existing releases:
  - `vite ^5.4` (was `^8.0.3`)
  - `@vitejs/plugin-react ^4.3` (was `^6.0.1`)
  - `typescript ~5.6` (was `~6.0.2`)
  - `lucide-react ^0.469` (was `^1.7.0`)
  - `@types/node ^22` (was `^25.5.0`)
  - `react ^19`, `react-dom ^19`, `tailwindcss ^4`, `@tailwindcss/vite ^4` retained (real, current).
- **New server deps:** `@google-cloud/storage`, `firebase-admin`, `helmet`, `express-rate-limit`, `cors`.
- **New devDeps:** `vitest`, `@vitest/coverage-v8`, `supertest`, `@testing-library/react`, `@testing-library/dom`, `jsdom`.
- `vite` moves to `devDependencies` (was duplicated).
- `tsx` moves to `devDependencies`.
- `dotenv` removed — Vite handles `.env` natively; production reads real env vars.

### `tsconfig` split

- `tsconfig.json` — client-side, mostly unchanged.
- `tsconfig.server.json` — server-side (`outDir: dist-server`, `noEmit: false`, `include: ["server/**/*"]`).

---

## 7. Tests

### Stack

- **Vitest** for both server and client (zero-config in a Vite project, fast).
- **`supertest`** for HTTP-level route tests against the Express app.
- **`@testing-library/react` + `jsdom`** for hook/component tests.
- **All Firebase Admin, Google Cloud Storage, and `@google/genai` calls mocked with `vi.fn()` doubles. No real GCP traffic from tests.**

### Server-side tests

| File under test | Coverage |
|---|---|
| `server/lib/config.ts` | Required-var read returns value; missing required throws with the var name; optional-var defaults applied; type coercion for ints. |
| `server/lib/cache.ts` | `readOrGenerateGlobal`: cache hit returns existing signed URL without invoking generator. Cache miss invokes generator, uploads to global path with correct content-type + cache-control: public, then signs. Per-key in-flight lock: two concurrent calls invoke generator once and resolve to the same URL. Generator failure propagates typed error and does not write to GCS. `regenerateShadow`: always invokes generator (even when shadow exists), uploads to user-shadow path with cache-control: private, then signs. Generator failure propagates without writing. |
| `server/middleware/auth.ts` | Valid Bearer token → `req.uid` set, `next()` called. Missing header → 401. Malformed token → 401. Expired token → 401. firebase-admin called once per request. |
| `server/middleware/regenLimit.ts` | First call of the day for a uid → counter set to 1, `next()` called. Subsequent same-day calls increment. Call N+1 (where N = `REGEN_RATE_LIMIT_PER_DAY`) → 429 `{ error: 'regen_quota_exceeded' }` and downstream handler NOT invoked. Counter resets at next UTC date rollover (verified by stubbing `Date`). Failed downstream still consumes quota (no decrement). |
| `server/routes/asset.ts` | Unknown `:key` → 400 with no generator call. Known key + auth + global cache hit → 200 `{url, expiresAt}`. Cache miss → generator invoked exactly once → 200. Generator throws → 502 with sanitised body (no stack, no upstream message). GET prefers user-shadow over global when both exist (verified by stubbing HEAD to return shadow). POST `/regenerate` always calls generator regardless of cache state, writes to user-shadow path under the caller's uid, returns the new signed URL. Two different uids regenerating the same key produce isolated objects under their respective `users/<uid>/` prefixes (cross-user isolation). |
| `server/routes/music.ts` | Same shape as asset routes against the music prompts allow-list, including shadow lookup, regen behavior, and cross-user isolation. |
| `server/index.ts` | `/healthz` returns 200 unauthenticated. Helmet headers present on responses. Rate limiter rejects 31st request in a minute from same uid with 429. |

### Client-side tests

| File under test | Coverage |
|---|---|
| `src/lib/AssetManager.ts`, `src/lib/MusicManager.ts` | First `getAsset`/`getMusic` call fetches from API with `Authorization: Bearer <token>`. Second call within TTL returns memoised URL without refetching. Call within 60s of expiry refetches. Fetch error rejects without poisoning memo. `regenerateAsset`/`regenerateMusic` POSTs to the regen endpoint, replaces memo entry on success, throws typed `RegenQuotaExceededError` on 429 response. |
| `src/components/Games/gameLogic.ts` | Pure helpers: `evaluateRouletteBet`, `evaluateSlotsResult`, `evaluateBingoBoard`. Direct unit tests on each. |
| `src/components/Games/GameShell.tsx` | Renders children, calls `onPlay` on play button click, disables button when `playDisabled`, shows loading state when assets/music are loading. Light render-only — no animation assertions. |
| `src/lib/firebase-utils.ts` | `handleFirestoreError` throws an `Error` (not stringified JSON) with structured fields as own properties. |
| `src/hooks/useAssets.ts`, `src/hooks/useMusic.ts` | One smoke test each: mounts with mock manager, transitions from loading → loaded with the right URL. |

### Explicitly NOT tested

- Animation timings, motion-library output, exact CSS class strings.
- Static prompt-map contents.
- Third-party SDK internals (Firebase Auth, Gemini, GCS).
- Visual / golden-image regressions.
- Cold deploys or real Cloud Run integration.

### Layout & wiring

- `*.test.ts` files sit next to their subject.
- One `vitest.config.ts` at repo root with two projects: `server` (node env) and `client` (jsdom env).
- `npm test` runs both. `./deploy/deploy.sh deploy` runs `npm test` as a pre-build gate; failing tests block the deploy.
- Total suite size: ~25–35 tests. Goal is to lock in new boundaries, not chase a coverage number.

---

## 8. Documentation

### `README.md` rewrite

End-to-end replacement of the AI-Studio default. Six sections:
1. **What this is** (one paragraph).
2. **Architecture** (the ASCII diagram from §2).
3. **Local dev** (4 commands: clone, `cp .env.example .env`, `npm install`, `npm run dev`).
4. **Deployment** (the 4-step `deploy.sh` flow from §6).
5. **Configuration reference** (link to `.env.example` and `deploy/.env.deploy.example`).
6. **Project layout** (one-line per top-level folder).

### `docs/ARCHITECTURE.md`

Request-flow walkthrough for both `/api/asset` and `/api/music` endpoints (GET + POST regen). Two-tier shadow asset model — global default vs per-user override. Where each piece of state lives (in-memory lock, GCS, Firestore counters, browser memo). Why signed URLs over public bucket. "Where do I add a new game/theme?" howto. "What happens when a user clicks Regenerate?" walkthrough.

### `docs/SECURITY.md`

Short threat-model note: no secrets in client bundle, signed URLs expire, Firebase Auth on API, rate-limit per uid, regen quota per uid (caps Gemini-cost a single user can drive), Helmet headers, no SSRF (prompts not user-supplied), Firestore rules summary including server-only access to `regen_quota`.

### `.env.example` rewrite

Lists every variable the app reads, grouped by audience (server / client / optional CES), with a one-line comment per var. `GEMINI_API_KEY` annotated *"set via Secret Manager in prod, .env locally — never commit"*.

### In-code comments

Kept minimal per existing convention. Added only where non-obvious:
- The per-key in-memory lock in `cache.ts` (why it exists, why per-instance is fine across containers).
- The `iamcredentials` API requirement for signed URLs (otherwise silent 403 at runtime).

---

## 9. File-level change manifest

### Added

- `server/index.ts`
- `server/middleware/auth.ts`, `server/middleware/regenLimit.ts`, `server/middleware/errors.ts`
- `server/routes/asset.ts`, `server/routes/music.ts`
- `server/lib/gemini.ts`, `server/lib/cache.ts`, `server/lib/storage.ts`, `server/lib/prompts.ts`, `server/lib/config.ts`
- `server/**/*.test.ts` (per §7)
- `src/components/Games/GameShell.tsx`
- `src/components/Games/gameLogic.ts`
- `src/**/*.test.ts(x)` (per §7)
- `Dockerfile`, `.dockerignore`
- `tsconfig.server.json`
- `vitest.config.ts`
- `deploy/deploy.sh`, `deploy/cloudbuild.yaml`, `deploy/.env.deploy.example`
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`

### Modified

- `package.json` (scripts, deps, version pins per §6)
- `tsconfig.json` (minor)
- `vite.config.ts` (drop `define` of `process.env.GEMINI_API_KEY`)
- `index.html` (CES vars made build-time-conditional)
- `src/firebase.ts` (env-var-driven config)
- `src/App.tsx` (drop `as any` theme casts; clean up theme resolution)
- `src/lib/AssetManager.ts` (slim to ~40 lines)
- `src/lib/MusicManager.ts` (slim to ~40 lines)
- `src/lib/firebase-utils.ts` (throw real `Error`)
- `src/hooks/useAssets.ts`, `src/hooks/useMusic.ts` (drop progress fan-out)
- `src/components/Games/Roulette.tsx`, `src/components/Games/Slots.tsx`, `src/components/Games/Bingo.tsx` (use `GameShell` + extracted `gameLogic`)
- `src/components/Profile.tsx` (rewire "Regenerate Assets" button to call new POST /api/*/regenerate endpoints; show in-flight progress; handle quota-exceeded toast)
- `.env.example` (rewritten per §8)
- `.gitignore` (add `firebase-applet-config.json`, `deploy/.env.deploy`)
- `README.md` (rewritten per §8)
- `firestore.rules` (add deny-all rule for `regen_quota` collection so client SDKs cannot tamper; deploy step added to `deploy.sh setup`)

### Removed (deleted from repo)

- `firebase-applet-config.json`
- `firebase-blueprint.json`
- `metadata.json`

---

## 10. Open questions

### Resolved during brainstorming

- **AI generation:** server-side proxy at runtime (not pre-generation, not removal).
- **Bucket access:** private + V4 signed URLs (not public).
- **React cleanup depth:** deeper refactor including `<GameShell>` extraction.
- **CES Messenger:** make optional via env vars (not strip, not hardcode).
- **Deployment:** wrapped in `./deploy/deploy.sh setup|deploy|rotate-key|logs` script.
- **Tests:** in scope — Vitest, ~25–35 tests, gates the deploy.
- **User-triggered regeneration:** hybrid shadow model — global default + per-user override created on opt-in via POST regen, gated by per-uid daily quota (default 200/day ≈ 5 full-asset cycles).

### Outstanding

- **Shadow storage scaling.** With ~30 image keys (~500 KB each) + ~10 music tracks (~5 MB each) per user, a fully-regenerated user occupies ~65 MB of GCS. 1000 users who regenerate everything ≈ 65 GB; standard GCS storage at ~$0.02/GB·month ≈ $1.30/mo per 1000 active regenerators. Acceptable at prototype scale. If active-user count or regen frequency grows, options are: (a) GCS lifecycle rule to delete `users/<uid>/...` after N days of no read; (b) per-user object cap that evicts oldest on overflow; (c) a "reset to defaults" UX action that purges the user's shadow.
- **Regen quota counter cost.** Firestore reads/writes on every regen call. At 200/day × N active users that's modest, but if growth is high, options are: in-process counter + Cloud Run `min-instances=1` (loses correctness on instance churn), or Memorystore for Redis (adds infra). Document the tradeoff but don't address in v1.
