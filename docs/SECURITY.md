# Security Notes

Short threat-model summary. Not a comprehensive audit.

## Secrets

- **`GEMINI_API_KEY`** lives in Secret Manager (`gemini-api-key`), mounted into Cloud Run via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`. Never commit it. `.env.example` annotates it as Secret-Manager-only in prod.
- **No service-account key file in the repo.** Cloud Run uses Application Default Credentials. Signed URLs are produced via `iamcredentials.signBlob` (the `roles/iam.serviceAccountTokenCreator` self-grant), not a private key.
- **Firebase web config** (`VITE_FIREBASE_*`) is *not secret* — it's safe to ship in the client bundle. Auth is enforced by Firebase Auth, not by hiding these strings.

## Asset access

- GCS bucket has uniform bucket-level access; no public ACLs. Browsers receive V4 signed URLs with a 1-hour TTL.
- All `/api/*` routes (except `/healthz`) require a valid Firebase ID token. Anonymous traffic cannot reach the Gemini-backed endpoints.
- Unmatched `/api/*` paths return JSON 404 (`{error: 'not_found'}`), not the SPA shell — so typos can't be CDN-cached as 200 HTML under arbitrary paths.

## Rate limiting

- **`/api/*` GETs and POSTs**: per-uid 30 req/min via `express-rate-limit` (configurable via `RATE_LIMIT_RPM`). Mounted at app level **after** `verifyFirebaseToken`, so `req.uid` is set when the limiter's keyGenerator runs. Returns `429 {error: 'rate_limit'}`. The `app.set('trust proxy', 1)` line in `server/index.ts` ensures `req.ip` reflects the real client (not the GFE peer address) as a fallback key.
  - **Caveat — per-instance, in-memory.** `express-rate-limit` v7 stores counters in process memory. With *N* Cloud Run instances and **no session affinity** (Cloud Run's default), the effective per-uid rate is up to `N × RATE_LIMIT_RPM`. Acceptable for the prototype; if you want a hard global cap, swap in a `rate-limit-redis`/Memorystore store.
- **`/api/*/regenerate` POSTs**: per-uid daily counter (Firestore `regen_quota/<uid>`), default 200/day (configurable via `REGEN_RATE_LIMIT_PER_DAY`). Bounds the Gemini cost a single user can drive. Firestore-backed, so the limit is **global across all instances** — no `N×` multiplier. Returns `429 {error: 'regen_quota_exceeded'}` with a `Retry-After: <seconds-until-UTC-midnight>` header.
- **Client distinguishes the two 429s** via the response body: `RegenQuotaExceededError` vs `RateLimitError` (see `src/lib/errors.ts`). Profile.tsx surfaces a different message for each.
- **Auth failures** (missing/expired/forged ID token): logged server-side with the Firebase error code (e.g. `auth/id-token-expired`), 401-returned to client without leaking which failure mode it was.

## SSRF / prompt injection

- The server-side prompts (`ASSET_PROMPTS`, `MUSIC_PROMPTS`) are static, defined in `server/lib/prompts.ts`. **No user-supplied text ever reaches Gemini.** Routes validate `:key` / `:theme/:gameType` against `Object.prototype.hasOwnProperty.call(...)` of the prompt maps (using `hasOwnProperty.call` to avoid `__proto__`-style abuse) and reject unknown values with 400.
- Object-name construction (`assets/v1/users/<uid>/<key>.png`) is safe: `<uid>` comes from a Firebase-verified ID token; `<key>` is constrained to the static prompt-map keyspace. No path-traversal vector.

## HTTP headers

- **Helmet** with explicit CSP allowlists for the cross-origin resources the app actually needs:
  - `imgSrc`: `'self'`, `data:`, `storage.googleapis.com` (signed asset URLs), `lh3.googleusercontent.com` (Google avatars)
  - `mediaSrc`: `'self'`, `storage.googleapis.com` (signed audio URLs)
  - `connectSrc`: `'self'`, `*.googleapis.com`, `*.firebaseapp.com`, `identitytoolkit.googleapis.com` (Firebase Auth + Firestore)
  - `frameSrc`: `'self'`, `*.firebaseapp.com` (Firebase popup login iframe)
  - `scriptSrc`: `'self'`, `www.gstatic.com`, `cdn.jsdelivr.net` (CES Messenger when enabled)
  - `frameAncestors`: `'none'`
  - `objectSrc`: `'none'`
- **`Referrer-Policy: no-referrer`** and **`X-Content-Type-Options: nosniff`** (helmet defaults).
- **`Cross-Origin-Opener-Policy: same-origin-allow-popups`** so the Firebase popup login can post results back via `window.opener`.
- **`Cross-Origin-Resource-Policy: cross-origin`** so signed-URL `<img>`/`<audio>` don't trip CORP.
- **CORS** disabled by default (`cors({ origin: false })`, same-origin only). To enable a split deploy you'd edit `server/index.ts` directly — there is no env-var toggle.

## Firestore rules

- Existing rules govern user profiles and balances (unchanged in this work).
- `regen_quota/<uid>` collection is **deny-all to clients**. Only the server's Admin SDK writes to it (Admin SDK bypasses rules). Prevents a malicious client from `setDoc(doc(db,'regen_quota',uid),{date:'2099-01-01',count:0})` to reset their own counter.
- **Rules are deployed by `deploy/deploy.sh setup`** via the `firebase` CLI (driven by `firebase.json`); the script hard-fails if the CLI is missing rather than silently skipping the rules deploy.

## Logging

- Errors funnel through `server/middleware/errors.ts`. The handler logs `{msg:'request_failed', method, path, err, stack}` JSON to stdout (picked up by Cloud Logging) and responds `502 {error:'generation_failed'}` to the client — no stack traces or upstream messages echoed.
- Before logging, `err.message` and `err.stack` pass through `redact()`:
  - `/AIza[0-9A-Za-z_-]{35}/g` → `[REDACTED_API_KEY]` (Gemini SDK errors regularly echo the API key in URLs)
  - `/Bearer\s+[A-Za-z0-9._~+/=-]+/g` → `Bearer [REDACTED_TOKEN]` (verifier-failure stacks may quote the offending Bearer token)
  This matters because Cloud Logging access (`roles/logging.viewer`) is broader than Secret Manager access, and key rotation does not invalidate already-logged entries.
- **Successful requests are not logged by application code.** Cloud Run access logs cover request-rate / latency totals; per-request error context lives in the structured `request_failed` log.

## Out of scope

- DDoS protection beyond Cloud Run's defaults and the per-uid rate limits.
- Tightening Firestore rules toward server-authoritative game outcomes (current rules trust client writes for balances; acceptable for virtual-currency social play).
- Penetration testing; this is a prototype.
- Subresource Integrity (SRI) on the CES Messenger CDN scripts (`gstatic.com`, `cdn.jsdelivr.net/npm/handlebars@latest`); a CDN compromise could ship arbitrary JS in your origin. Pin the handlebars version + add `integrity=sha384-...` if you ship CES.
