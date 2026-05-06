# Architecture

## Overview

OVG Casino is a single-tenant Cloud Run service. The runtime container serves both the React static build and the Express API at `/api/*`. AI-generated assets live in a private GCS bucket; browsers receive V4 signed URLs.

## Request flow — `GET /api/asset/:key`

1. Browser sends request with `X-Firebase-Token: <Firebase-ID-token>` (Cloud Shell's web-preview reverse proxy intercepts `Authorization: Bearer` headers and redirects them to its JWT auth flow; the server still accepts both for ad-hoc curl/testing).
2. `verifyFirebaseToken` middleware decodes the token via `firebase-admin`. Sets `req.uid`. 401 on invalid/expired/missing.
3. Route handler validates `:key` against `Object.keys(ASSET_PROMPTS)`. 400 on unknown.
4. **Shadow lookup:** HEAD `assets/v1/users/<uid>/<key>.png` in GCS. If exists, sign and return — no rate-limit token consumed.
5. **Global fallback:** `readOrGenerateGlobal(assets/v1/global/<key>.png)`:
   - HEAD; if exists, sign and return — no rate-limit token consumed.
   - Else, acquire per-key in-memory lock. Coalesces concurrent same-key requests on this instance.
   - `consumeGenerationToken(uid, RATE_LIMIT_RPM)` — throws `GenerationRateLimitError` (→ 429) if the per-uid 30/min generation budget is exhausted.
   - Call `generateImage(prompt, aspectRatio)` against Gemini. On success, upload to GCS with `Cache-Control: public, max-age=31536000, immutable`. Sign the URL.
   - Release the lock.
6. Respond `200 { url, expiresAt }`.

The browser fetches the asset bytes directly from GCS via the signed URL. Bandwidth doesn't pass through Cloud Run.

## Request flow — `POST /api/asset/:key/regenerate`

1. Auth (same as GET).
2. `regenLimit` middleware: read-modify-write `regen_quota/<uid>` Firestore document keyed on today's UTC date. If counter `>= REGEN_RATE_LIMIT_PER_DAY` (default 200), reject with 429. Otherwise increment and continue.
3. Route validates `:key`.
4. `consumeGenerationToken(uid, RATE_LIMIT_RPM)` — same per-minute budget shared with cache-miss GETs; throws → 429 on overage.
5. `regenerateShadow(assets/v1/users/<uid>/<key>.png)`: always invokes the generator, uploads to the user-shadow path with `Cache-Control: private, max-age=31536000, immutable`.
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

The theme name appears in **six** places — miss one and the new theme silently 400s on requests or doesn't render in the lobby. There's a single global `bg_main` key (lobby/profile chrome) that is **not** theme-scoped and only gets added once.

1. **Prompts (`server/lib/prompts.ts`):** add `ASSET_PROMPTS` entries for each `<asset>_<theme>` (3 game pictograms + 4 symbols + 3 backgrounds = 10 keys per theme) and 3 `MUSIC_PROMPTS` keys (`<theme>_<gametype>`). Total per theme: 10 image + 3 music = 13 keys. (Plus the one-off `bg_main` if you're seeding the project from scratch.)
2. **Theme styling (`src/utils/themeStyles.ts`):** add to `lightThemes` or `darkThemes` array; add a per-theme accent class to `getThemeStyles()`.
3. **Type union (`src/App.tsx`):** add the theme id to the `ThemeType` union.
4. **Lobby (`src/components/Lobby.tsx`):** add an entry to the `themes` array (id, name, color, fallback emoji).
5. **Slots fallback (`src/components/Games/Slots.tsx`):** add to `FALLBACK_SYMBOLS_MAP` (the emoji shown while generated symbols are still loading).
6. **Profile regen list (`src/components/Profile.tsx`):** add to the hard-coded theme array used by `ASSET_KEYS` + `MUSIC_PAIRS` so the Regenerate-Assets button refreshes the new theme.
7. **Game registry (`src/config/games.ts`):** add a roulette/slots/bingo entry per new theme.
8. (Optional) Bump `v1` → `v2` in cache prefixes in `server/routes/{asset,music}.ts` if a prompt change should invalidate existing cached assets globally.
9. Deploy.

## What happens when a user clicks Regenerate?

`Profile.tsx` builds 105 tasks (81 asset keys + 24 music pairs), then runs them through a worker pool with concurrency capped at **4**. Each task POSTs to `/api/asset/:key/regenerate` (or the music equivalent), gets auth-then-rate-limited then quota-checked, generates fresh bytes via Gemini, uploads to the user's shadow path, and returns the new signed URL. The pool drains in ~3-4 minutes at the default 30 req/min limiter — concurrency is the throttle, not parallel-everything. The global cache is untouched; only this user's shadow copies change.

After the pool finishes, `Profile.tsx` reports one of three end states:
- **`RegenQuotaExceededError` seen** (per-day quota): "try again tomorrow"
- **`RateLimitError` seen** (per-minute throttle): "try again in a minute"
- **Generic failures**: "N/total failed"

The two error classes are shared via `src/lib/errors.ts` so `instanceof` works regardless of whether the rejection came from `AssetManager` or `MusicManager`.

## Operator: refreshing global assets

`POST /regenerate` only touches a user's shadow path. If the first user's GET miss baked a poor-quality global asset into `assets/v1/global/<key>.png`, every NEW user keeps seeing it until you intervene. Two operator workflows:

- **Delete and let the next GET re-warm:** `gcloud storage rm gs://<bucket>/assets/v1/global/<key>.png` (or the music equivalent under `music/v1/global/<key>.wav`). The next GET cache-misses → `readOrGenerateGlobal` → fresh upload.
- **Bump the prefix version** in `server/routes/{asset,music}.ts` (`v1` → `v2`) and redeploy. Old objects linger in GCS but become unreachable. Add a GCS lifecycle rule to garbage-collect them if you care.
