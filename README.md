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

## The redesign story

The pitch is "AI-generated themed casino worlds powered by Gemini 3.1 + Lyria 3" — Gemini draws per-theme image assets and Lyria composes per-theme music for **eight worlds** (sweets, egypt, space, west, ocean, jungle, vampire, ninja) across **three games** (slots, roulette, bingo). The original chrome was generic — every theme reused the same surfaces with a colour swap. A six-plan rework brought every game surface, header, motion, and celebration into the same per-theme bespoke vocabulary as the AI assets:

1. **Foundation + Lobby** — design tokens (`themeManifesto`), themed atoms (button / card / skeleton), `LobbyGrid` with per-world cards.
2. **Game-page chrome** — `AppHeader` + `BalancePill` + `MusicPill` + `MenuDropdown` + `BetControl` + `GameShell`.
3. **Slots surface** — themed chassis + reels + payline + LED bar + symbol-asset wiring with emoji fallback.
4. **Roulette surface** — themed wheel with hook-driven rotation accumulator + segments + bet table + result strip.
5. **Bingo surface** — themed card + cells + markers + JUST CALLED panel + LINES tracker + BINGO! sweep banner.
6. **Themed celebration system** — per-theme particle pools + copy strings + a shared `ThemedCelebrationCard` base driving `JackpotOverlay` (full-screen takeover), `SmallWinCard` (mid-surface card with backdrop-blur), and `LossPlate` (subtle bottom plate + per-theme surface wiggle); BalancePill ticks in lockstep with the win counter.

Plus a post-deploy cleanup batch that collapsed win-message duplication and ten follow-up commits for browser-pass-discovered bugs.

For the engineering history (atoms catalog, what shipped per plan, deferred items, lessons) see `docs/REDESIGN_HISTORY.md`.

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
- `public/` — static assets served as-is (CES messenger init, etc.)
- `deploy/` — Cloud Build + deploy script
- `docs/` — architecture, security, redesign-history notes
- `firestore.rules` — Firestore security rules

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for design and threat-model notes; `docs/REDESIGN_HISTORY.md` for the themed-immersive redesign history (6-plan rework + cleanup).
