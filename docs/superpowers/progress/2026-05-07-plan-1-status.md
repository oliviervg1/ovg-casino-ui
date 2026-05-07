# Themed-Immersive Redesign — Status as of 2026-05-07

**Pause point** for picking up later. Captures: what shipped, where to find it, what's next, known limitations.

## TL;DR

Plan 1 of 6 is complete and on a feature branch. 25 commits, 177 tests, lint clean, build green. **Not yet merged to `main`. Not yet deployed.** Next session can: merge + deploy, then move to Plan 2.

## Branch state

- **Branch:** `feat/plan-1-foundation-lobby`
- **Tip:** `f4d74a0` (latest as of pause) — `fix(lobby): AIPitchStrip surfaces regen progress, completion, and errors`
- **Diverges from main:** 25 commits ahead, 0 behind
- **Pushed:** yes — `origin/feat/plan-1-foundation-lobby`
- **PR URL:** `https://github.com/oliviervg1/ovg-casino-ui/pull/new/feat/plan-1-foundation-lobby`
- **CI gates:** `npm run lint` (exit 0) + `npm test` (177/177) + `npx vite build` (succeeds, ~885 KB JS / ~45 KB CSS — actually ~5 KB smaller than main despite the additions)

## What landed in Plan 1

### Foundation (Sections 1 + 8 of the spec)

- `src/utils/themeManifesto.ts` — typed manifesto map, single source of truth for `ThemeType` and the 7 per-theme design discriminators (surface / button / border / motionIdle / celebration / skeleton / audioClick) + display name + font class
- `src/index.css` — extended `@theme` with typography, spacing (`--spacing-*`, Tailwind v4 namespace), motion durations + easings; replaced binary `[data-theme="light|dark"]` rules with 8 per-theme `:root[data-theme="<name>"]` blocks (each setting `--theme-bg`, `--theme-bg-rgb`, `--theme-card`, `--theme-primary`, `--theme-secondary`, `--theme-accent`, `--theme-text`)
- `src/App.tsx` — `data-theme` attribute now set to the actual theme name (was binary light/dark); cascades through `/world/:theme` too
- `src/hooks/useTheme.ts` — reads `<html data-theme>`, `MutationObserver` for re-render on theme switch, falls back to `'sweets'` for unknown/missing
- `src/hooks/useMotion.ts` — `prefers-reduced-motion` listener; returns `{ shouldAnimate, durations: { instant/quick/standard/slow/spin in ms }, motionVariant<T>(full, reduced) }`
- Themed atoms: `ThemedCard`, `ThemedSkeleton`, `ThemedButton` — each with 8 variants switching on the manifesto. ThemedSkeleton accepts an optional `theme` prop to override the document-level read for per-element scoping (used in the lobby grid).

### Lobby (Section 2 of the spec)

- Old 24-card grid + welcome 🎰 hero + Group-by toggle removed (Lobby.tsx went 182 → 22 lines)
- `src/components/Lobby/AIPitchStrip.tsx` — pitch banner with Gemini 3.1 + Lyria 3 attribution + "♻ Regenerate everything" CTA. Shows live regen progress, final status, and error banners (quota/rate-limit/partial)
- `src/components/Lobby/WorldCard.tsx` — 1 card per theme with hero `bg_slots_<theme>` image, themed display font, 3 mini game-icons. Clicking the card body navigates to `/world/<theme>`; clicking an icon navigates directly to the right `GAME_REGISTRY` id
- `src/components/Lobby/LobbyGrid.tsx` — 4×2 grid of WorldCards. Themed skeletons during loading (per-card variants — sweets unwrap, ninja ink-bleed, etc.)
- `src/hooks/useBatchRegenerate.ts` — extracted from `Profile.tsx`. Orchestrates the full 113-task regenerate (81 images + 32 music) with concurrency 4. Used by both Profile and the new AIPitchStrip

### Beyond the original Plan 1 spec — added during execution

- **World page** at `/world/:theme` — hero bg at 21:9 + theme name in display font + 3 themed game cards + auto-playing themed Lyria track. Spec originally said "card click → default to slots"; user pushed back during testing and we added the in-between page instead.
- **Per-theme world music** — 8 new `<theme>_world` Lyria prompts (ambient/exploratory tracks distinct from the upbeat per-game tracks). Batch regenerate now goes through 113 tasks (was 105: 81 image + 24 music; now 81 image + 32 music).
- **Bug fixes found in browser testing:**
  - WorldCard was constructing fake `<gametype>-<theme>` IDs that didn't match `GAME_REGISTRY` (real IDs are unique names like `candy-crushers`). Fixed via `GAME_REGISTRY.find(g => g.type === gt && g.theme === theme)`.
  - WorldPage's "← Lobby" button was non-clickable because the title overlay div (`absolute inset-0 z-10`) sat over it in the same z-index but later in DOM order. Fixed via `pointer-events-none` on overlays + bumped button to `z-20`.
  - AIPitchStrip's "Regenerate everything" UI looked unresponsive: subline was gated on `isRegenerating && status` BOTH being truthy, so the first 5-30s after click (status still null) showed the idle pitch text. Plus no error display, no completion message, no spinner. Fixed by mirroring Profile's pattern (RefreshCw icon, label change, error banners).

## What's NOT in Plan 1 (deferred to Plans 2-6)

Per the spec at `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md`:

- **Plan 2 — Game-page chrome.** Single unified header (replace today's two stacked bars), `BetControl` with preset chips + stepper, themed hero buttons (`<ThemedButton size="hero">`), `MusicPill` with 4-bar waveform animating in time with playback, themed loading skeleton for game pages.
- **Plan 3 — Slots surface.** Real slot machine: themed chassis, 3 reels × 3 visible symbols with payline highlight, vertical-scroll spin with staggered reel stops. Folds in the existing slot-symbol-rendering bug (the `data:`-prefix-only check that broke Gemini URLs — still present in `Slots.tsx`).
- **Plan 4 — Roulette surface.** Real European 0-36 SVG wheel with rotating segment ring + counter-rotating themed ball. Felt-cloth bet table.
- **Plan 5 — Bingo surface.** Themed card frame, themed marker stamps on matched cells, side panel (JUST CALLED + LINES tracker), 1-30 called-so-far track.
- **Plan 6 — Win/loss feedback.** Three tiers (small win anchored, jackpot full-screen takeover, loss themed plate) with per-theme particle systems. Replaces `react-confetti`.

The spec also flags out-of-scope items: 5×5 bingo (would change game logic), roulette number/dozens/columns bets, tournaments, operator-mode toggle, PWA, i18n.

## Known limitations / things to revisit

1. **Manual browser testing not exhaustively done.** I (Claude) verified everything via lint + tests + build but cannot click in a real browser. The user has been doing the visual check and surfacing bugs (most recent: regen button feedback). Worth a fresh pass before merging.
2. **Plan 2's `AppHeader`** will eventually replace the old App.tsx header. Right now the new lobby still has the old App-level header above it (with the duplicated balance pill mentioned in the spec audit). That stays until Plan 2.
3. **`useTheme` `MutationObserver` test was added late** (commit `a5b283b`) — gold for catching regressions to the theme-switch path. Worth keeping in mind when later plans touch the theme system.
4. **`ThemeType` deduplication** (commit `4a60ebe`) — `App.tsx` now re-exports from `themeManifesto`. Any future ad-hoc local declaration would re-introduce the duplication footgun.
5. **CES messenger styling** is unchanged — sweet bottom-right bubble. Spec says rework in Plan 2 follow-up (theme-aware position + bubble color).
6. **Profile page still uses old binary `light|dark` user theme** preference. The new theme system is route-driven, not user-preference-driven. Reconciling these is out of scope for the redesign but worth a thought.
7. **The `screenshots/` dir** in the working tree is untracked and intentionally never committed (per user instruction during the CSP work).

## Tasks for the next session

In rough order of value:

1. **User does fresh manual browser pass** on the latest tip (`f4d74a0`). Confirm:
   - Lobby renders 8 world cards with themed bg art + display fonts + per-card themed skeletons during load
   - Clicking a world card navigates to `/world/<theme>` and music starts
   - Back-to-lobby button on the world page works (the recent fix)
   - Clicking a game card on the world page goes to the correct game (e.g. sweets slots → `/game/candy-crushers`)
   - Clicking a game-icon directly on a world card skips the world page
   - "♻ Regenerate everything" button shows feedback (spinner, status, completion message, error banner if requests fail)
   - Existing game pages still work unchanged (visual no-op claim from T7)
2. **Open PR**, review, merge to `main`.
3. **Deploy to prod** — `./deploy/deploy.sh deploy`. (User will need to do this; I can run the command but we should re-confirm the prod environment is ready.)
4. **Start Plan 2 (Game-page chrome)**. The spec is ready; the next plan can be written directly from it. Sequencing tip: foundation atoms from Plan 1 are in place (ThemedButton with size='hero', useTheme, useMotion), so Plan 2 mostly composes them.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections covering the full vision; Plan 1 implements Sections 1, 2, parts of 8)
- **Plan 1 doc:** `docs/superpowers/plans/2026-05-07-foundation-and-lobby.md` (17 tasks; all executed)
- **This progress doc:** `docs/superpowers/progress/2026-05-07-plan-1-status.md`
- **Memory pointer:** see `MEMORY.md` in the user's `.claude/projects/-home-admin--ovg-casino-ui/memory/` dir for a cross-reference

## Sanity checks to run on next session start

```bash
git fetch origin
git checkout feat/plan-1-foundation-lobby
git status                                          # should be clean
git log --oneline main..HEAD | wc -l                # should report 25 (or higher if more added)
npm run lint && npm test                            # 177/177 + lint exit 0
```

If the test count or lint status doesn't match, something landed since pause — investigate before continuing.
