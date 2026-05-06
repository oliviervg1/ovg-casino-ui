# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev:server   # terminal 1 — Express on :8080 (tsx watch, reads .env via --env-file)
npm run dev          # terminal 2 — Vite on :3000, proxies /api/* to :8080
npm run lint         # tsc --noEmit for both client (tsconfig.json) and server (tsconfig.server.json)
npm test             # vitest run — server (node) + client (jsdom) projects in parallel
npm run test:watch   # vitest --watch
npm run build        # vite build → dist/, then tsc -p tsconfig.server.json → dist-server/
npm run start        # node dist-server/index.js (serves both /api and dist/ from one process)
```

Run a single test file: `npx vitest run path/to/file.test.ts`
Run a single project: `npx vitest run --project server` or `--project client`

Deploy: `./deploy/deploy.sh {setup|deploy|rotate-key|logs}`. The `deploy` subcommand runs `npm test` as a hard pre-build gate before submitting to Cloud Build.

## Architecture

Single Cloud Run container that serves the built React SPA *and* the Express API on the same origin (`/api/*`). In dev they run as two processes and Vite proxies `/api/*` to `:8080`; in prod, `server/index.ts` mounts `dist/` as static when it exists. Don't add a sendFile fallback that runs without `dist/` present — the SPA-catch-all is intentionally guarded by `fs.existsSync(distPath)`.

### Asset / music generation: the shadow model

Every image/audio key has up to two GCS objects:

| Path | Created by | Cache-Control | Visibility |
|---|---|---|---|
| `assets/v1/global/<key>.png` | First user's GET miss | `public, immutable` | Everyone (GET fallback) |
| `assets/v1/users/<uid>/<key>.png` | That user's POST `/regenerate` | `private, immutable` | Only `<uid>` (preferred over global on GET) |

Music is identical with `music/v1/...` and `.wav`. Browsers always receive 1-hour V4 signed URLs — the bucket is private with uniform bucket-level access; nothing is publicly readable. Bandwidth flows browser ↔ GCS directly; Cloud Run is not a proxy.

Cache invalidation is by prefix bump: change `v1` → `v2` in `server/routes/{asset,music}.ts` to make every old object unreachable in one deploy. Old objects linger in GCS until you `gcloud storage rm` them or add a lifecycle rule.

`server/lib/cache.ts` coalesces concurrent same-key generations on a single instance via an in-memory `inFlight` Map. Cross-instance dedup is bounded by GCS HEAD-on-arrival — acceptable for the prototype.

### Auth + rate limit ordering

`server/index.ts` mounts middleware in this exact order, and the order is load-bearing:

```
verifyFirebaseToken  →  router  →  regenLimit (Firestore, POST only)
                                ↘  consumeGenerationToken (in-memory, only inside the generator wrapper — runs at the cache-miss / regenerate site, not on cache-hit GETs)
```

The per-minute generation limit is enforced **inside the generator function** passed to `cache.ts::readOrGenerateGlobal` / `regenerateShadow`, not as middleware. That way GETs that hit a cached GCS object never consume a token (HEAD + sign is cheap and shouldn't count against quota). Concurrent same-key cache misses share the leader's generation via `inFlight`, so they share the cost of one token.

### Two distinct 429s

There are two rate-limit layers and the client treats them differently:

- **`RATE_LIMIT_RPM`** (default 30) — `consumeGenerationToken` in `server/middleware/genLimit.ts`, **per-instance, in-memory**. Counts only Gemini/Lyria invocations: cache-miss GETs and POST `/regenerate` calls. Cache-hit GETs cost zero tokens. With N Cloud Run instances and no session affinity, the effective per-uid rate is up to `N × RATE_LIMIT_RPM`. Server throws `GenerationRateLimitError` → 429 with `Retry-After: <seconds>` and `{error: 'rate_limit'}`. Client throws `RateLimitError` ("try again in a minute"). To get a hard global cap, swap the in-memory `Map` for a Redis-backed store.
- **`REGEN_RATE_LIMIT_PER_DAY`** (default 200) — Firestore counter at `regen_quota/<uid>`, **global across instances**, resets at UTC midnight. Applies only to POST `/regenerate`. Server returns `Retry-After: <seconds-until-UTC-midnight>`. Client throws `RegenQuotaExceededError` ("try again tomorrow").

Both error classes live in `src/lib/errors.ts` and are re-exported from both `AssetManager.ts` and `MusicManager.ts` so a single `instanceof` check works regardless of which manager rejected — do not re-introduce per-module duplicate classes.

`Profile.tsx` runs the regenerate-everything batch through a worker pool capped at `REGEN_CONCURRENCY = 4`. Each regenerate POST is one token, so the burst is bounded by 4 inflight against the 30/min generation limit and drains 105 tasks (81 image + 24 music) in ~3.5 min without 429s. Don't raise it without raising `RATE_LIMIT_RPM`.

### Server-side prompts are the keyspace

`server/lib/prompts.ts` defines `ASSET_PROMPTS` and `MUSIC_PROMPTS` as static maps. Routes validate `:key` (and `:theme/:gameType`) with `Object.prototype.hasOwnProperty.call(map, key)` — the `.call` form is intentional, to avoid `__proto__` lookup abuse. **No user-supplied text ever reaches Gemini.** Object names (`assets/v1/users/<uid>/<key>.png`) are safe by construction: `<uid>` is from a verified Firebase token; `<key>` is from a closed map.

### Adding a theme = touch seven places

Themes appear in seven locations and missing one silently breaks the new theme (404s on the API, doesn't appear in the lobby, slots reels render `❓`). For each new theme add:

1. `server/lib/prompts.ts` — 10 `ASSET_PROMPTS` keys (3 game pictograms + 4 symbols + 3 backgrounds) and 3 `MUSIC_PROMPTS` keys.
2. `src/utils/themeStyles.ts` — push to `lightThemes` or `darkThemes`; add a `getThemeStyles()` entry.
3. `src/App.tsx` — extend the `ThemeType` string union.
4. `src/components/Lobby.tsx` — add to the `themes` array (id, name, color, fallback emojis).
5. `src/components/Games/Slots.tsx` — add to `FALLBACK_SYMBOLS_MAP` (loading-state emojis).
6. `src/components/Profile.tsx` — add to the hard-coded theme array driving `ASSET_KEYS`/`MUSIC_PAIRS` so Regenerate-Assets refreshes it.
7. `src/config/games.ts` — add roulette/slots/bingo entries so games are routable from `/game/:gameId`.

`bg_main` is a *non-theme-scoped* background key seeded once, used by lobby/profile chrome.

### Firebase wiring

- Server uses `firebase-admin` with Application Default Credentials. On Cloud Run, the project ID auto-detects via `GOOGLE_CLOUD_PROJECT`; locally, set `FIREBASE_PROJECT_ID` only if your ADC has no project.
- Client uses the modular `firebase` SDK initialised in `src/firebase.ts`. `VITE_FIREBASE_*` values are baked into the bundle at build time and are not secret — auth is enforced server-side by token verification and by `firestore.rules`.
- Signed URLs are produced via `iamcredentials.signBlob`. On Cloud Run the runtime SA signs as itself (`roles/iam.serviceAccountTokenCreator` self-grant). **For local dev with user ADC**, signing fails with `Not found; Gaia id not found for email <user>` because user creds have no SA identity — set `SIGNER_SA_EMAIL=<sa>` (typically the project's default Compute SA) and `server/lib/storage.ts` wraps the client in `google-auth-library`'s `Impersonated`. The user must hold `roles/iam.serviceAccountTokenCreator` on that SA (granted by `deploy.sh setup`). **No service-account key file lives in the repo.**
- `FIRESTORE_DATABASE_ID` (optional): when set, server uses `getFirestore(app, dbId)` instead of the default DB. Production targets `ovg-casino`; `firebase.json`'s `database` field must match for `firebase deploy --only firestore:rules` to land on the right DB.

### Local dev gotchas (Cloud Shell, Codespaces, etc.)

- **Auth header:** client sends `X-Firebase-Token` (custom header), not `Authorization: Bearer`. Cloud Shell's web-preview reverse proxy intercepts `Authorization` headers (treats them as Google IAM bearer tokens, fails to verify, and 302s to `ssh.cloud.google.com/cloudshell/jwt` — which has no CORS headers, so the browser surfaces it as a generic CORS error). `verifyFirebaseToken` accepts either header for ad-hoc curl/testing — don't drop the custom path.
- **Vite `allowedHosts`:** `vite.config.ts` allowlists `.cloudshell.dev`. Vite 5.4+ blocks unknown `Host` headers as DNS-rebinding mitigation. If you dev from another remote host (Codespaces, ngrok), add it here.
- **`bg_main` waits for auth:** `App.tsx` passes `enabled: !!user` to `useAssets([bgKey])`. Without that gate the effect fires before Firebase auth resolves, `AssetManager` throws `not_authenticated`, and the effect never retries (its dep is `memoKeys`, which doesn't change with auth state).

### Firestore rules

`firestore.rules` is the source of truth. Two collections:
- `users/{userId}` — owner read/write, `delete` denied. Validators in the rules file enforce required fields, length caps, and that `uid` cannot mutate post-create.
- `regen_quota/{uid}` — **deny-all to clients**. The Admin SDK (server) bypasses rules; this prevents a malicious client from `setDoc`-ing themselves a fresh counter. `deploy.sh setup` deploys these via the `firebase` CLI and hard-fails if the CLI is missing — do not silently skip.

### Error logging

`server/middleware/errors.ts` runs `err.message` and `err.stack` through `redact()` before `console.error`. Two patterns are masked: Google API keys (`AIza` + 35 base64url chars) and `Bearer <token>` strings. This matters because `roles/logging.viewer` is broader than Secret Manager access and key rotation does not invalidate already-logged entries. Add to `REDACT_PATTERNS` if you introduce another secret format.

`src/lib/firebase-utils.ts::handleFirestoreError` deliberately *does not* log the `authInfo` block (email, photoURL, providers) — only the upstream message — because the developer console is captured by extensions, screen-recorders, and support-ticket screenshots. The fields are still attached to the thrown `FirestoreOperationError` for callers that need them.

## Deploy flow

`./deploy/deploy.sh deploy` runs `npm test` locally → `gcloud builds submit` with `deploy/cloudbuild.yaml`. Cloud Build does a Docker multi-stage build (the `VITE_FIREBASE_*` and `VITE_CES_*` values are baked in via `--build-arg`), pushes to Artifact Registry, and deploys to Cloud Run with `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`.

Two `gcloud run deploy` flags are load-bearing for this org and project:
- `--no-invoker-iam-check`: the altostrat.com org has an `iam.allowedPolicyMemberDomains` constraint that blocks `allUsers` IAM grants, making `--allow-unauthenticated` a silent no-op. Without `--no-invoker-iam-check`, every request 403s at the GFE before reaching the container.
- `--condition=None` on every IAM binding in `deploy.sh setup`: required when the project's IAM policy already contains conditional bindings; gcloud refuses to add an unconditional binding implicitly in non-interactive mode.

The unauthenticated health check is `/_healthz` (underscore prefix). Cloud Run reserves `/healthz` as a Knative probe path under invoker-iam-disabled mode and 404s it at the GFE before reaching the container — don't rename it back.

`deploy/.env.deploy` (gitignored, copied from `deploy/.env.deploy.example`) holds the substitutions. CES Messenger vars are optional — `vite.config.ts` `stripCesIfDisabled` plugin removes the `<ces-messenger>` block from `index.html` at build time when `VITE_CES_DEPLOYMENT_ID` is empty.

## Test layout

`vitest.config.ts` defines two projects:
- `server` — `node` env, includes `server/**/*.test.ts`. Tests mock `firebase-admin` and `./lib/config.js` at the top of each file (see `server/index.test.ts`).
- `client` — `jsdom` env, includes `src/**/*.test.{ts,tsx}`, has `globals: true`.

Both run on `npm test`; both must pass for `deploy.sh deploy` to proceed.
