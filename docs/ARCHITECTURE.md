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
