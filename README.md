# OVG Casino

A virtual-currency casino prototype with AI-generated themed assets and music. Three games (roulette, slots, bingo) across eight themes (sweets, egypt, space, west, ocean, jungle, vampire, ninja). Built on React + Vite, deployed on Google Cloud Run.

## Architecture

```
Browser ──► Cloud Run (Express + React static)
              │
              ├── GET /  + /game/* + /assets/* → static React build (dist/)
              │
              ├── GET /_healthz → 200
              │
              ├── GET /api/asset/:key
              │   GET /api/music/:theme/:gameType
              │        → Helmet → CORS → JSON parser
              │        → verifyFirebaseToken → per-uid rate-limit (30 req/min)
              │        → HEAD users/<uid>/<key>     → hit: sign URL
              │        → HEAD global/<key>          → hit: sign URL
              │        → miss: lock, call Gemini, upload to global, sign URL
              │
              └── POST /api/asset/:key/regenerate
                  POST /api/music/:theme/:gameType/regenerate
                       → verifyFirebaseToken → per-uid rate-limit
                       → per-uid daily regen quota (Firestore counter, 200/day)
                       → call Gemini, upload to users/<uid>/<key>, sign URL
```

GCS bucket is private. Browsers receive 1-hour V4 signed URLs and load assets directly from GCS. The Gemini key lives in Secret Manager and is mounted by Cloud Run as `$GEMINI_API_KEY`. See `docs/ARCHITECTURE.md` for the full request-flow walkthrough.

## Local development

Prerequisites: Node 22+, a Firebase project (Auth + Firestore enabled), a Gemini API key.

```bash
git clone <repo>
cd ovg-casino-ui
cp .env.example .env   # then fill in GCS_BUCKET, FIREBASE_PROJECT_ID, GEMINI_API_KEY, and all VITE_FIREBASE_* values
npm install
npm run dev:server    # terminal 1 — Express on :8080
npm run dev           # terminal 2 — Vite on :3000, proxies /api to :8080
```

Open <http://localhost:3000>. Vite's dev server proxies `/api/*` to the Express server.

## Tests

```bash
npm test
```

Vitest runs server (node env) and client (jsdom env) projects in parallel. Both must pass before deploy. The `deploy.sh deploy` command runs `npm test` as a pre-build gate.

## Deployment

One-time setup (per GCP project):

```bash
cp deploy/.env.deploy.example deploy/.env.deploy
# fill in GCP_PROJECT_ID, GCS_BUCKET, all VITE_FIREBASE_* values, optionally CES vars
./deploy/deploy.sh setup     # enables APIs, creates bucket, secret, IAM, Firestore rules
```

Subsequent deploys:

```bash
./deploy/deploy.sh deploy    # runs tests, builds in Cloud Build, deploys to Cloud Run
```

Other commands:

- `./deploy/deploy.sh rotate-key` — rotate the Gemini API key in Secret Manager.
- `./deploy/deploy.sh logs` — tail Cloud Run logs.

## Configuration

All env vars documented in `.env.example` (local + server) and `deploy/.env.deploy.example` (deploy automation).

## Project layout

- `src/` — React client (Vite-built)
- `server/` — Express server (TypeScript-built to `dist-server/`)
- `deploy/` — Cloud Build + deploy script
- `docs/` — architecture and security notes
- `firestore.rules` — Firestore security rules

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for design and threat-model notes.
