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
  - **Caveat — per-instance, in-memory.** `express-rate-limit` v7 stores counters in process memory. With *N* Cloud Run instances, the effective per-uid rate is `N × RATE_LIMIT_RPM`. Cloud Run session affinity pins one user to one instance for short bursts, so this is mostly bounded in practice, but a long-running attack across instance boundaries can exceed the nominal limit. If this matters, swap in a `rate-limit-redis`/Memorystore store.
- **`/api/*/regenerate` POSTs**: per-uid daily counter (Firestore `regen_quota/<uid>`), default 200/day (configurable via `REGEN_RATE_LIMIT_PER_DAY`). Bounds the Gemini cost a single user can drive. Firestore-backed, so the limit is **global across all instances** — no `N×` multiplier.
  - 429 responses include a `Retry-After: <seconds-until-UTC-midnight>` header so clients can render an accurate "try again at midnight UTC" countdown.
- **Auth failures** (missing/expired/forged ID token): logged server-side with the Firebase error code (e.g. `auth/id-token-expired`), 401-returned to client without leaking which failure mode it was. Lets oncall distinguish "expired token wave" (transient) from "wrong project" (misconfiguration) without exposing it to attackers.

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
