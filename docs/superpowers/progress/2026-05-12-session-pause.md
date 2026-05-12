# Session pause — 2026-05-12

**Pause point** for picking up later. Captures: what shipped today, where Plan 6 brainstorming stands, how to resume.

## TL;DR

Two things happened today:

1. **Plan 5 follow-up shipped.** `useBingoGame` `setInterval` unmount-cleanup landed as commit `cb17975` on `main`, pushed, and deployed → revision `ovg-casino-00012-52h` (live at https://ovg-casino-y4zvagwaqa-uc.a.run.app). Resolves the "Worth fixing before Plan 6" item from the Plan 5 deviations list. Tests now 372/372 across 60 files (was 371/60). Lint clean. Build 916.79 KB JS / 56.28 KB CSS.

2. **Plan 6 brainstorming started but paused before any user choice was made.** Visual companion was offered + accepted; landing screen pushed; first scope question was asked (4-option `AskUserQuestion`) but the user paused before answering. Visual companion server has been stopped (preserved files in `.superpowers/brainstorm/6183-1778573382/`). No spec written. No plan file written. No code touched.

Next session: resume the scope question (or restart brainstorm fresh), then proceed through the remaining brainstorming steps (approaches → design → spec → user review → writing-plans).

## What landed today

| SHA | Subject | Notes |
|---|---|---|
| `cb17975` | fix(bingo): clear useBingoGame setInterval on unmount | TDD cycle: RED test asserted `vi.getTimerCount()` drops to 0 after `unmount()` while `drawing===true`. RED proven (`expected 1 to be +0`). GREEN: `useRef<ReturnType<typeof setInterval> \| null>(null)` + `useEffect(()=>()=>{...})` cleanup; terminal-tick path also nulls the ref so cleanup is a no-op when round finished cleanly. +9 lines hook, +12 lines test. All 9 hook tests + full 372/372 suite green. Pushed to `origin/main`. |

**Deploy:** `./deploy/deploy.sh deploy` — Cloud Build SUCCESS in 1m 49s (build id `a9349e5c-f03f-4808-a8da-6b4b72cee589`); Cloud Run rev `ovg-casino-00012-52h`. Build invocation: standard `npm test` pre-build gate passed (372/372), Docker multi-stage build, push to Artifact Registry, deploy.

**Live URL:** https://ovg-casino-y4zvagwaqa-uc.a.run.app — serving `ovg-casino-00012-52h`.

## Plan 6 brainstorming — state at pause

**Brainstorming skill checklist progress:**

| # | Step | Status |
|---|------|--------|
| 1 | Explore project context | done — Section 7 of spec read, current `GameShell.tsx` celebration code captured (see "Context captured" below) |
| 2 | Offer visual companion | done — offered as standalone message, user accepted, server started + landing screen pushed + server stopped clean |
| 3 | Ask clarifying questions (one at a time) | started — first scope question asked but user paused before answering |
| 4 | Propose 2-3 approaches | not started |
| 5 | Present design sections | not started |
| 6 | Write design doc | not started |
| 7 | Spec self-review | not started |
| 8 | User reviews written spec | not started |
| 9 | Transition to writing-plans | not started |

### The scope question that's pending

The user was asked (via `AskUserQuestion`):

> Plan 6 spec is large (3 tiers × 8 themes × 4 sub-systems: visual / particles / audio / copy). What's the v1 ambition?

Options presented:

- **A) Visual + counter (recommended)** — themed UI for all 3 tiers (small/jackpot/loss) + custom particle field replacing `react-confetti` + win amount counter + balance-pill simultaneous animation + reduced-motion support. **Reuse existing `playWin` / `playLose`** for audio (no new fanfare/voice samples to generate). **Center-bottom small-win** (not anchored above payline / line / pocket). **No contextual loss hints.** ~Plan 5 surface area (estimated 10-12 commits), all-code, no asset-generation work needed.

- **B) Full spec as written** — everything in (A) PLUS: anchored small-win positioning (requires surfaces to expose anchor refs through GameShell — breaks the tidy GameShell-as-orchestrator pattern), per-theme jackpot fanfare audio (8 samples to generate), per-theme jackpot voice samples (8 samples), bingo "closest line" + roulette "landed on N (red), bet odd" contextual loss hints. ~3× the surface of Plan 5; some work is asset generation, not pure code.

- **C) Smallest useful slice** — replace `react-confetti` only + theme the jackpot overlay (gradient + label font) + add win amount counter to jackpot. Keep tiny green pill for small-win. Keep no-UI for loss. ~4-5 commits, tight quick-polish plan. **Delivers less visual lift than Plan 5's in-window pulses** — Plan 5's BINGO! banner sweep already raised the bar.

- **D) Other scope.**

Resume by re-asking this question, or by inviting the user to volunteer a scope cut directly.

### Context captured during step 1 (worth knowing for resume)

**Current celebration code (`src/components/Games/GameShell.tsx` lines 99-121):**

- `import Confetti from 'react-confetti'` — to be removed per spec.
- Jackpot tier: full-screen `bg-black/70` wash + `<Confetti />` + plain `<div class="text-7xl font-casino text-yellow-300">JACKPOT!</div>`. No theming, no counter, no theme-driven motion.
- Small-win tier: bottom-center green pill (`bg-green-500`) with literal `"You won!"` text. No amount, no theming.
- Loss tier: nothing. The hooks set `message` to e.g. `"No bingo this round."` but no overlay UI exists for losses.
- Both jackpot + small-win driven by single `props.win: 'jackpot' | 'small' | null`.
- `react-confetti ^6.4.0` is in `package.json` — to be uninstalled when celebration component lands.

**`themeManifesto.celebration` is already a typed string discriminator** (`src/utils/themeManifesto.ts`), with these 8 values: `candy-burst`, `sandstorm-gold`, `supernova`, `dust-storm`, `bioluminescent-burst`, `parrot-flock`, `bat-swarm`, `cherry-blossom-storm`. **Just a discriminator** — no particle pool, no audio mapping, no copy templates yet. Plan 6 will need to either extend the manifesto with particle/audio/copy substructure OR add a sibling `themeParticles.ts` (the spec calls for the latter).

**Game hooks all expose `win: 'jackpot' | 'small' | null`** — useSlotsGame, useRouletteGame, useBingoGame all converge here. Worth checking whether any actually set `'jackpot'` (Bingo only sets `'small'` even on a win — Bingo's payout is `bet * 5` flat). For a v1 jackpot tier to fire anywhere, the hooks may need a payout-threshold rule that maps to `'jackpot'`.

**Loss path is currently a hole.** No hook exposes `'loss'`. Adding a loss tier means either (a) extending the union to `'jackpot' | 'small' | 'loss' | null` and wiring each hook to set `'loss'` when `won===false` after a settle, or (b) deriving loss in GameShell from `win===null && message!=null` after the round ends. Option (a) is cleaner; option (b) is fewer hook touches but couples on `message` being set-then-cleared.

### Spec section that drives Plan 6

`docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` — Section 7 "Win & loss feedback", lines 303-361 (sub-sections: Small win, Jackpot, Loss, Particle system, Win amount counter, Audio, New components). Plan 6 should implement Section 7 to whatever scope cut the user picks.

### Useful sub-questions to lead with after scope is settled

In rough order of value (lead with these in sequence after scope answer lands):

1. **Loss-tier hook wiring** (a or b above): clean union extension `'jackpot' | 'small' | 'loss' | null` vs. GameShell-derived. Recommend (a).
2. **Jackpot threshold definition**: when does a win become a "jackpot" vs. "small"? The spec implies jackpots are rare. Suggest a payout-multiplier threshold (e.g., ≥ `bet * 20`) configurable per game.
3. **Particle system**: SVG vs. emoji vs. mixed. Spec says "8-12 SVG / emoji shapes" per theme. Emoji-only would ship today; SVG-only would generate beautifully but is more design work; mixed is probably the answer.
4. **Counter pacing**: spec says ~600ms small / ~1200ms jackpot. Locking in or making it manifesto-driven?
5. **Reduced-motion fallback**: spec is opinionated already (static themed icon burst + counter). Just confirm.
6. **`aria-live` strategy**: spec says final value, not per-tick. Confirm.

### Visual companion

- Server was running at `http://localhost:52847` (session id `6183-1778573382`).
- Stopped cleanly via `stop-server.sh`. Status `"stopped"`.
- Session content directory **preserved**: `/home/admin_/ovg-casino-ui/.superpowers/brainstorm/6183-1778573382/content/` (currently has `ready.html` only — the landing screen).
- `.superpowers/` is in `.gitignore` so files won't be committed.
- Next session: restart with the same command (`scripts/start-server.sh --project-dir /home/admin_/ovg-casino-ui`) — it'll create a NEW session directory under `.superpowers/brainstorm/`. The old `ready.html` is reference material only.

## Tasks for the next session

In rough order:

1. **Re-ask the scope question** above (or accept a user-volunteered cut) — this gates everything else. The recommended option (A — visual + counter) is sized to Plan 5's commit count and avoids asset-generation work.
2. **Walk the remaining clarifying sub-questions** in the order listed (loss wiring → jackpot threshold → particle medium → counter pacing → reduced-motion → aria-live).
3. **Propose 2-3 approaches** for the chosen scope (architecture-level: where the celebration component lives, how it integrates with GameShell, whether `themeParticles.ts` is sibling or sub-module of `themeManifesto.ts`).
4. **Present design sections** (architecture, components, data flow, error handling, testing). Iterate per section.
5. **Write design doc** to `docs/superpowers/specs/YYYY-MM-DD-themed-celebration-design.md`. Spec self-review (placeholder / consistency / scope / ambiguity).
6. **User reviews spec.** Wait for explicit approval before transitioning.
7. **Invoke `superpowers:writing-plans`** to produce the implementation plan. Per the Plan 5 win, plan execution should then go via `superpowers:subagent-driven-development` (implementer + spec-reviewer + code-quality-reviewer triplet per task, plus a final cross-cutting review).

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (Section 7, lines 303-361).
- **Plan 5 progress doc:** `docs/superpowers/progress/2026-05-11-plan-5-status.md` (the source of the "fix unmount cleanup" item that landed today).
- **Plan 4 / 3 / 2 / 1 progress docs:** sibling files in `docs/superpowers/progress/`.
- **This session-pause doc:** `docs/superpowers/progress/2026-05-12-session-pause.md`.
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md` — already updated to reflect today's deploy + Plan 6 brainstorm-in-progress state.

## Sanity checks to run on next session start

```bash
cd /home/admin_/ovg-casino-ui
git status                                     # clean working tree on main
git log --oneline -3                           # tip should be the progress-doc commit
git rev-parse HEAD == git rev-parse origin/main  # local main vs origin (this session committed locally only — see "Push state" below)
npm run lint                                   # exit 0
npm test                                       # 372/372 across 60 files
npx vite build                                 # ~7-8s, ~917 KB JS / ~56 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.

### Push state

`cb17975` (the unmount-cleanup fix) was pushed to `origin/main` today and is already deployed. **This progress doc commit is local-only at pause** — run `git push` next session if you want it mirrored to origin (the previous Plan 1-5 progress docs all live on origin, so pushing matches the established pattern).
