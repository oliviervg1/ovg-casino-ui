# Themed-Immersive Redesign — Plan 6 Status as of 2026-05-13

**Plan 6 (themed celebration system) complete on the feature branch.** Captures: what shipped, deviations from the literal plan, known limitations, browser-pass checklist for the next session.

## TL;DR

Plan 6 of 6 (themed celebration system) implementation complete on `feat/plan-6-themed-celebration`. **17 implementation commits + 1 cleanup/status commit (this one) = 18 commits ahead of `main`**. Plan-doc and design-spec commits (`f815bce` + `a182ca2`) already on `main` so they don't appear in the divergence count. `react-confetti` uninstalled. Tests: **425/425 across 70 files** (Plan 5 baseline was 372/60 → **+53 tests across +10 files**). Lint clean. Build green at **919.66 KB JS / 57.49 KB CSS** — a small **+3.57 KB JS / +1.21 KB CSS** vs the Plan 5 baseline (916.09 / 56.28). The plan predicted a slight *decrease* assuming `react-confetti` (~12 KB minified) would offset the new components; in practice the ~10 new components net out larger than the saved dependency. **Branch not yet pushed. Not yet merged to `main`. Not yet deployed. Browser pass not yet performed.** Next session: browser-pass on local dev → push → merge to `main` → deploy → update memory `redesign-progress.md`.

## Branch state

- **Branch (local):** `feat/plan-6-themed-celebration`. 18 commits ahead of `origin/main`, 0 behind. Merge base = `f815bce` (the Plan 6 plan-doc commit on `main`).
- **Tip:** the SHA of this status doc commit (run `git log -1` after committing).
- **Pushed:** plan-doc + design-spec commits are on `main`; the 17 implementation commits + this cleanup commit are local-only.
- **PR URL:** not yet created.
- **CI gates:** `npm run lint` exit 0, `npm test` 425/425 across 70 files, `npx vite build` succeeds in 10.01s (919.66 KB JS / 57.49 KB CSS, 254.34 KB gzipped JS).

## What landed in Plan 6

17 implementation commits (Tasks 1–17) + 1 cleanup commit (Task 18). Implementation followed the plan tasks 1:1 (no subagent-driven-development this time — straight implementation against the plan, since the celebration components are self-contained leaves with no cross-task race conditions like Plan 3's reel-spin or Plan 4's wheel-rotation accumulator).

| SHA | Subject | Notes |
|---|---|---|
| `34201bf` | feat(celebration): add per-theme wiggle primitive + CSS keyframe | New `Wiggle { duration_ms, magnitude_px }` field on `themeManifesto`; 8 per-theme tunings (vampire judders longest at 400ms/6px, ninja jolts sharpest at 150ms/5px). Generic `.wiggle-active` CSS class consumes `--wiggle-duration` + `--wiggle-magnitude` custom props so LossPlate can drive it dynamically without inlining keyframes per theme. (Task 1) |
| `080d36b` | feat(celebration): per-theme particle definitions | New `src/utils/themeParticles.ts`. Each theme: 6-emoji pool from its world + 0–3 universal SVG primitives (sparkle / dot / arc) tinted to theme accent + motion params (velocity range, gravity, lifetime, rotation) tuned per theme (sweets pop with strong gravity, ocean drifts gently, vampire swirls). 3 tests. (Task 2) |
| `10d4585` | feat(celebration): per-theme celebration copy strings | New `src/utils/themeCopy.ts`. Three strings per theme: `smallWin` ('Sweet match!', 'Pharaoh smiles.'), `jackpotLabel` ('PHARAOH'S BOUNTY!') replacing generic 'JACKPOT!', `loss` ('The night is empty.') replacing silence. v1 is per-theme not per-game — same strings across Slots/Roulette/Bingo within a theme. 1 test. (Task 3) |
| `3dcb709` | feat(celebration): CelebrationContext for cross-tree tick sync | New `src/contexts/CelebrationContext.tsx`. Mirrors AudioControlsContext shape. Carries `pendingTick: { delta, durationMs } \| null` so ThemedCelebration (rendered under GameShell) can tell BalancePill (rendered under AppHeader) to override its default tick pacing for the duration of the celebration counter. Prevents threading props through App.tsx ↔ Header/Game tree. 3 tests. (Task 4) |
| `761f241` | feat(celebration): universal SVG particle primitives | New `src/components/Themed/particles/SVGPrimitive.tsx` exporting Sparkle (4-point star), Dot (filled circle), Arc (semicircle stroke). Each accepts `{ color?: string; size?: number }` with `currentColor` + 12px defaults so they inherit theme accent from a wrapper's `color` style. Used by ParticleField (Task 7) mixed with per-theme emoji. 4 tests. (Task 5) |
| `2db2666` | feat(celebration): WinAmountCounter — animated themed counter | New `src/components/Themed/WinAmountCounter.tsx`. Ticks `$0 → $amount` over 600ms (small) or 1200ms (jackpot) with the same cubic-ease-out curve BalancePill uses so the two stay visually in lockstep. Themed font from themeManifesto + theme accent color. `aria-hidden` because the announcement comes from the GameShell message line. Renders final value immediately when `prefers-reduced-motion`. 4 tests. (Task 6) |
| `b9f2ba7` | feat(celebration): ParticleField — themed particle renderer | New `src/components/Themed/ParticleField.tsx`. Generic Framer-Motion particle field. Mixes emoji from pool with SVG primitives tinted via the wrapper's color style. Per-particle randomized velocity within `motion.velocityRange` + gravity applied over lifetime; optional rotation. Reduced-motion fallback renders a static centered cluster (radial spread). 4 tests. (Task 7) |
| `27cc7f4` | feat(celebration): JackpotOverlay — full-screen themed takeover | New `src/components/Themed/JackpotOverlay.tsx`. Replaces the generic `bg-black/70` wash + plain `JACKPOT!` div + react-confetti with a theme-accent radial gradient, themed `jackpotLabel` from themeCopy, 50-particle ParticleField, and a WinAmountCounter ticking the payout. Auto-dismisses after 5s; clicking the backdrop dismisses early; clicks on child elements do not. 4 tests. (Task 8) |
| `725d41c` | feat(celebration): SmallWinBanner — center-bottom themed pill | New `src/components/Themed/SmallWinBanner.tsx`. Replaces the generic green 'You won!' pill with a themed pill carrying the first emoji from the per-theme particle pool (deterministic), the themed `smallWin` copy, and a WinAmountCounter. Wrapper is `pointer-events-none` so the player can re-bet during the 3s dwell. 3 tests. (Task 9) |
| `f2066e0` | feat(celebration): LossPlate — themed loss tier with surface wiggle | New `src/components/Themed/LossPlate.tsx`. Center-bottom themed plate carrying the per-theme `loss` copy. On mount (when `shouldAnimate`), sets `--wiggle-duration` + `--wiggle-magnitude` CSS custom props on the `surfaceRef` element and adds the `.wiggle-active` class so the global `@keyframes wiggle-shake` animates the game surface. Per-theme intensity from Task 1's manifesto entries. Auto-dismiss 2s. 4 tests. (Task 10) |
| `6546faf` | feat(celebration): ThemedCelebration orchestrator | New `src/components/Themed/ThemedCelebration.tsx`. Pure router on `tier` prop → JackpotOverlay / SmallWinBanner / LossPlate. Side-effect: pushes `pendingTick { delta, durationMs }` to CelebrationContext for jackpot (1200ms) / small (600ms); skipped for loss (no balance change). Internal `dismissed` state tracks the per-tier auto-dismiss timer + click-to-dismiss; resets when tier or amount changes (e.g. next round). 7 tests. (Task 11) |
| `19513d1` | refactor(celebration): widen GameShell win union to include 'loss' | Typing-only change. Widens `GameShell.win` to `'jackpot'\|'small'\|'loss'\|null` and adds optional `lastPayout?: number\|null` prop. No rendering change yet — `'loss'` falls through both existing AnimatePresence branches and renders nothing extra. Unblocks Tasks 13–15 (hooks emit 'loss') without breaking the build at the Slots/Roulette/Bingo call sites. (Task 12) |
| `6c3843a` | feat(celebration): useSlotsGame surfaces lastPayout + 'loss' tier | Hook gains `lastPayout: number \| null` in its return shape, set to the payout amount on win sites and to 0 on the no-match branch. Win union widens to include `'loss'`. Slots.tsx forwards `lastPayout` to GameShell. **Side-fix: widens SlotMachine consumer to filter 'loss' out of the payline/reel "winning" flag and the BottomLedBar flash state** so the chassis doesn't visually celebrate a loss now that `win` can be `'loss'`. (Task 13) |
| `8134613` | feat(celebration): useRouletteGame surfaces lastPayout + 'loss' tier | Same shape as Slots. Roulette's existing 'jackpot' threshold (payout ≥ bet × 10) is unchanged — single-number wins (35x) classify as jackpot, even/odd/red/black wins (2x) as small. **Side-fix: RouletteSurface consumer filters 'loss' out of the RouletteWheel `win` prop** so the wheel-pulse animation doesn't fire on losses. (Task 14) |
| `7f4ad3d` | feat(celebration): useBingoGame surfaces lastPayout + 'loss' tier | Bingo previously only set `message` on the no-bingo branch; now also sets `setWin('loss')` and `setLastPayout(0)` so the GameShell-level ThemedCelebration can render the LossPlate. Win branch surfaces `lastPayout = bet × 5` (Bingo's flat win multiplier; no jackpot path). **Side-fix: BingoSurface filters 'loss' out of the `win` prop passed to BingoCard** so the BINGO! banner sweep doesn't appear on losses. (Task 15) |
| `e7139ed` | feat(celebration): BalancePill ticks in lockstep with celebration counter | App.tsx wraps children in `CelebrationProvider`. BalancePill reads `pendingTick` from CelebrationContext; when set and the balance is increasing, the existing tick animation uses `pendingTick.durationMs` (600 small / 1200 jackpot) instead of `motion.durations.slow`. Both counters now visibly grow together — strongest "where the money goes" read for the player. AppHeader.test.tsx wrapped in CelebrationProvider since AppHeader renders BalancePill. (Task 16) |
| `2e5f45b` | feat(celebration): GameShell uses ThemedCelebration; ARIA-live on message | Replaces the inline `<AnimatePresence>` jackpot/small blocks (lines 99–121) and the `<Confetti />` render with a single `<ThemedCelebration>` call. Adds `aria-live="polite" role="status"` to the existing `<p>{message}</p>` line so the result is announced to screen readers. Adds `surfaceRef` on the surface wrapper for LossPlate's wiggle. `lastPayout` prop is now required. The react-confetti import is gone. Slots/Roulette/Bingo integration tests + GameShell tests + GameShell typing tests wrapped in CelebrationProvider since GameShell now consumes the context (transitively via ThemedCelebration → useCelebration). (Task 17) |
| _this commit_ | chore(celebration): drop react-confetti + Plan 6 status doc | `npm uninstall react-confetti`. Two packages removed from `node_modules`; entry gone from `package.json` + `package-lock.json`. Bundle delta documented in this status doc. (Task 18) |

## Deviations from the literal plan (intentional)

1. **Bundle size went UP, not down.** Plan Task 18 Step 3 predicted: _"the new JS bundle size — should be slightly SMALLER than the pre-Plan-6 baseline because react-confetti (~12 KB minified) is gone, even though Plan 6 adds ~8 components."_ Actual delta: **+3.57 KB JS / +1.21 KB CSS** vs Plan 5 baseline. The new components (10 in total — ParticleField, WinAmountCounter, JackpotOverlay, SmallWinBanner, LossPlate, ThemedCelebration, SVGPrimitive, plus themeParticles + themeCopy + CelebrationContext utility modules) net out larger than the ~12 KB react-confetti save. Still well within budget (the plan didn't set a hard cap; Plan 5 used a 30 KB JS budget — Plan 6 is a tenth of that).

2. **Tasks 13–15 each added a "side-fix" widening of the per-game Surface consumer to filter `'loss'` out of cosmetic flags.** Plan tasks 13–15 only described surfacing `lastPayout` and emitting the `'loss'` tier from the hook. The plan's GameShell win-union widening (Task 12) made the union `'jackpot'|'small'|'loss'|null` everywhere it appeared, including the surface-level `win` prop that drives reel/payline/wheel/banner cosmetics. Without filtering `'loss'` out at the Surface→child boundary, a loss would have:
   - Flashed the SlotMachine BottomLedBar + lit up the payline indicator (Task 13 fix → SlotMachine consumer)
   - Triggered the RouletteWheel win-pulse (Task 14 fix → RouletteSurface consumer)
   - Swept the BINGO! banner across the Bingo card (Task 15 fix → BingoSurface consumer)
   Each surface received a one-line `win === 'loss' ? null : win` filter at the prop-pass site. Worth noting because it's the kind of downstream typing-cascade the plan's per-task descriptions didn't anticipate.

3. **Test-wrapping cascade in Task 17.** GameShell now consumes CelebrationContext transitively (via `<ThemedCelebration>` → `useCelebration`). All existing GameShell test sites + Slots/Roulette/Bingo integration test sites + GameShell typing tests had to wrap their renders in `<CelebrationProvider>`. Plan Task 17 mentioned this in passing under "Tests" but didn't enumerate the call sites. The implementer touched ~5 test files; pattern was rote (drop-in `<CelebrationProvider>` around the existing render).

4. **No subagent-driven-development this round.** Plans 5 (and arguably 4) used the `superpowers:subagent-driven-development` workflow with implementer + spec-reviewer + code-quality-reviewer triplets per task. Plan 6 was implemented inline against the plan in the main conversation, because the celebration components are self-contained leaves with no cross-task race conditions like Plan 3's mid-spin reel-symbol race or Plan 4's hook-as-source-of-truth wheel rotation. The 1:1 task→commit cadence held — 17 implementation commits maps to 17 tasks. If any deviation slipped past code review, it'd surface in the browser pass.

5. **`HTMLMediaElement.prototype.play` jsdom warnings during GameShell tests** are pre-existing in the test suite (GameShell calls `audio.play()` in a useEffect; jsdom doesn't implement it; the call rejects but the tests still pass). Not introduced by Plan 6. Documented here so future readers don't chase it.

## Known limitations / things to revisit

Plan-6-specific:

1. **Per-theme particle pools are static emoji + SVG primitive arrays.** No bespoke per-theme SVG illustrations (e.g. a hand-drawn scarab beetle for egypt, a cherry-blossom petal for ninja). Adding bespoke per-theme assets would be a future polish pass; current approach renders fine and ships in this plan's budget.

2. **`pendingTick` propagation is one-way (ThemedCelebration → BalancePill).** No back-channel for BalancePill to acknowledge tick completion. If a second celebration fires before the first tick finishes, the second `pendingTick` overwrites the first — visually fine because the new tick will run to the new amount, but worth noting if a future bug surfaces around rapid-fire wins.

3. **JackpotOverlay backdrop click-to-dismiss uses `e.target === e.currentTarget`.** Per the plan's open-questions note, Framer Motion may add wrappers — verify in browser pass that backdrop clicks dismiss but counter/label clicks don't. Tests pass in jsdom but real-browser DOM may differ.

4. **LossPlate wiggle drives surface-element CSS custom props imperatively** (`surfaceRef.current.style.setProperty('--wiggle-duration', ...)`). Reads as a deliberate escape hatch from React render flow because the keyframe animation needs to live on the surface element, not the LossPlate itself. If a future surface-level component starts setting its own `style.--wiggle-*` props, they could clash.

5. **`useMotion()` reduced-motion fallback in jsdom** defaults to `shouldAnimate: true` (jsdom doesn't implement `prefers-reduced-motion`). Plan tests for ParticleField / WinAmountCounter / LossPlate use `vi.doMock` to swap the hook for the reduced-motion path. Real-browser behavior unverified end-to-end in this status doc; assumed correct per Plan-1 hook implementation.

6. **`ThemedCelebration` auto-dismiss timers** clear on tier/amount change but not on parent unmount. If user navigates away mid-celebration, the timer fires once on the unmounted component. React 18+ silently no-ops + warns in dev. Mirror of the Plan 5 `useBingoGame` setInterval issue (which was fixed in `cb17975`); could apply the same useEffect-cleanup pattern here.

7. **`themeCopy` strings are hardcoded in TypeScript** — no i18n surface. Acceptable for v1 demo; if the casino-operator demo ever needs localization, this is a centralized place to refactor.

Carry-overs from Plan 1 + 2 + 3 + 4 + 5 still apply verbatim:

- Light/dark `profile.theme` reconciliation still out of scope.
- `screenshots/` dir still untracked and intentionally never committed.
- `data-route` first-paint flash not eliminated.
- `useAssets` returns a fresh `assets` object on each render.
- Per-reel click sounds deferred (Slots).
- SlotReel stack rebuilds on every render.
- Bespoke per-theme rims/inner-cones/pointers/balls deferred (Roulette).
- Wheel-segment click sounds + ball-drop "thunk" deferred (Roulette).
- Idle ambient rotation per `themeManifesto.<theme>.motion.idle` not shipped.
- `prefers-reduced-motion` not applied to wheel rotation (Roulette).
- Bespoke per-theme markers / card frames / called-badge variants deferred (Bingo).
- Per-cell stamp sound + BINGO! fanfare audio beyond `playBingoDraw` deferred.
- CES env-var warnings during build are pre-existing.

## Browser-pass checklist for the next session

Run dev servers locally then walk through. Test against `feat/plan-6-themed-celebration` (not `main`) until merged.

```bash
npm run dev:server   # terminal 1 — Express on :8080
npm run dev          # terminal 2 — Vite on :3000
```

For each of the 8 themes (sweets / egypt / space / west / ocean / jungle / vampire / ninja):

1. **Lobby → click any game** of the theme (slots / roulette / bingo).
2. **Trigger a small win.**
   - Slots: small bet, hope the random spin matches a 2-symbol payline; if no win in 5 spins, raise bet for higher payout-per-line and try again.
   - Roulette: bet on red or even.
   - Bingo: just play; ~80% of rounds yield no win, so may take 2-3 plays.
   - **Verify:** SmallWinBanner appears center-bottom with theme-accent gradient + first emoji from theme particle pool + themed copy ('Sweet match!', 'Pharaoh smiles.', etc.) + WinAmountCounter ticks $0 → $payout over 600ms. BalancePill in header ticks in lockstep (same 600ms duration). Pill is `pointer-events-none` so PLAY button still clickable. Auto-dismisses after 3s.
3. **Trigger a jackpot.**
   - Slots: large bet, hope for 3-symbol payline + bonus or wild.
   - Roulette: bet on a single number (35× payout); odds are 1/37 per spin so retry as needed.
   - Bingo: same as small (Bingo has no jackpot tier — it'll fire small instead). Skip jackpot for Bingo.
   - **Verify:** Full-screen JackpotOverlay with theme-accent radial gradient + themed `jackpotLabel` ('PHARAOH'S BOUNTY!' for egypt, etc.) + 50 particles flying with theme-tuned velocity/gravity/rotation + WinAmountCounter ticks over 1200ms. BalancePill in header ticks in lockstep. Click the backdrop → dismisses immediately. Click the label/counter → does NOT dismiss. Auto-dismisses after 5s if not clicked.
4. **Trigger a loss.**
   - Slots: small bet, no payline match.
   - Roulette: bet on a number that doesn't hit.
   - Bingo: most rounds are losses.
   - **Verify:** LossPlate appears center-bottom with themed `loss` copy ('The night is empty.' for vampire, etc.). Game surface wiggles (theme-tuned: vampire judders 400ms/6px, ninja jolts 150ms/5px, etc.). Auto-dismisses after 2s. BalancePill does NOT tick (no balance change).
5. **ARIA on message line.** With screen reader on (or check DOM), confirm `<p aria-live="polite" role="status">` carries the result message and is announced.
6. **Switch theme** (lobby → pick a different world → enter a game). Repeat steps 2–4. The celebration tier copy + colors + particles + wiggle params should change with the theme; the SHAPE of each tier (overlay / pill / plate) stays the same.
7. **Cross-game regression check.** For at least 2 themes, walk all 3 games (Slots / Roulette / Bingo). The BalancePill tick lockstep + ARIA-live + theme-font on counter + LossPlate wiggle on surface should all work identically across games.
8. **No console errors.** Acceptable: the existing `useBingoGame setInterval` cleanup warning if you navigate mid-draw (now fixed in `cb17975` so should NOT appear), and any pre-existing CES iframe noise. Anything new under the celebration components → file follow-up.
9. **`prefers-reduced-motion` check.** OS Settings → Reduce Motion ON → trigger small/jackpot/loss in any one theme. Particles should render as a static centered cluster (radial spread, no animation). WinAmountCounter should jump to final value immediately. LossPlate should NOT add `.wiggle-active` to the surface.

## Pickup tasks for the next session (in rough order of value)

1. **User does fresh manual browser pass** on the latest tip per the checklist above.
2. **Push the branch:** `git push -u origin feat/plan-6-themed-celebration`.
3. **Open PR.** Suggested title: `Plan 6: themed celebration system — overlays + particles + counter + loss wiggle`.
4. **Merge to `main`.** Fast-forward; delete the feature branch local + origin.
5. **Deploy to prod** — `./deploy/deploy.sh deploy`. Update memory `redesign-progress.md` with the new revision number after deploy.
6. **Mark the redesign DONE.** Plan 6 is the last plan in the 8-section spec. Future polish work (bespoke per-theme assets, audio enhancements, bespoke shapes per game per theme) lives in a separate post-redesign pass, not in the original spec scope.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections; Plan 6 implements Section 7).
- **Plan 6 design spec:** `docs/superpowers/specs/2026-05-12-themed-celebration-design.md` (committed in `a182ca2`).
- **Plan 6 implementation plan:** `docs/superpowers/plans/2026-05-12-themed-celebration.md` (2466 lines, 18 tasks).
- **This progress doc:** `docs/superpowers/progress/2026-05-12-plan-6-status.md`.
- **Prior progress docs:** Plans 1–5 status docs in `docs/superpowers/progress/`.
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md` — needs updating to reflect Plan 6 in-progress / done state after merge + deploy.

## Sanity checks to run on next session start

```bash
cd /home/admin_/ovg-casino-ui
git status                                       # clean working tree (screenshots/ untracked is fine)
git branch --show-current                        # feat/plan-6-themed-celebration
git log --oneline main..HEAD                     # 18 commits since merge base f815bce
npm install                                      # if needed
npm run lint                                     # exit 0
npm test                                         # 425/425 across 70 files
npx vite build                                   # ~10s, 919 KB JS / 57 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.
