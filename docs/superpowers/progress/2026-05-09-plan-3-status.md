# Themed-Immersive Redesign — Plan 3 Status as of 2026-05-11

**Pause point** for picking up later. Captures: what shipped, where to find it, what's next, known limitations.

## TL;DR

Plan 3 of 6 (Slots surface) complete on a feature branch worktree. 14 implementation commits + this progress note (15 total since `origin/main`), 257/257 tests, lint clean, build green (906.82 KB JS / 50.03 KB CSS — net +3.36 KB JS over the Plan 2 baseline of 903.46, well under the 30 KB Plan 3 budget). **Branch not yet pushed (worktree is local). Not yet merged to main. Not yet deployed.** **Browser click-through verification (Task 14 Step 4) still pending — user should walk through.** Next session can: manual browser pass → push branch → open PR → merge + deploy → start Plan 4.

## Branch state

- **Branch:** `feat/plan-3-slots-surface`
- **Worktree:** `/home/admin_/ovg-casino-ui/.claude/worktrees/feat+plan-3-slots-surface` (created via the `EnterWorktree` tool; harness sanitized `/` to `+` in the directory name; the branch was renamed back from `worktree-feat+plan-3-slots-surface` to `feat/plan-3-slots-surface`)
- **Tip:** `05338b6` — `feat(slots): in-window win pulse — payline glow + winning middle-row ring` (will be the doc-commit SHA once this file is committed)
- **Diverges from origin/main:** 14 commits ahead, 0 behind (15 once the doc-commit lands). The plan-doc commit `672b95f` was pushed to `origin/main` BEFORE the worktree was created, so it's the base.
- **Pushed:** the parent commit `672b95f` was pushed; the 14 implementation commits + this doc are local-only as of pause
- **PR URL:** not yet created
- **CI gates:** `npm run lint` exit 0, `npm test` 257/257 across 46 files, `npx vite build` succeeds in 6.53s (906.82 KB JS / 50.03 KB CSS)

## What landed in Plan 3

14 implementation commits via `superpowers:subagent-driven-development` (implementer → spec reviewer → code quality reviewer per task; the C1 follow-up added one extra fix-cycle for Task 8). All 13 implementation tasks shipped; Task 14 was a verification gate (no commit); Task 15 is this doc.

### Foundation: hook + symbol cell (Tasks 1-2)

- **`c59e016`** `src/hooks/useSlotsGame.ts` — extracted `bet` / `reels` / `spinning` / `win` / `message` state and the spin-loop body from old `Slots.tsx`. Behaviour preserved byte-for-byte. Exports `UseSlotsGameOptions` + `UseSlotsGameReturn`. Reuses `evaluateSlotsResult` from `gameLogic.ts`. (Task 1)
- **`3832cf6`** `src/components/Games/Slots/SlotSymbol.tsx` — cell-level renderer. `URL_RE = /^https?:\/\//` routes to `<img>` (Gemini signed URLs) vs `<span>` (emoji/text). **Fixes the latent `data:`-prefix bug** at old `Slots.tsx:148` that rejected every Gemini signed URL because they're `https://storage.googleapis.com/...`, not data URIs. (Task 2)

### Static layout + chassis + chrome (Tasks 3-6)

- **`5ca48eb`** `src/components/Games/Slots/SlotReel.tsx` — three-cell static layout (top dim, middle bright, bottom dim). `data-cell` + `data-state` attributes on each cell wrapper. Exports `ReelCells` interface (re-imported by `useSlotsGame` in Task 7). (Task 3)
- **`2926d01`** `src/components/Games/Slots/SlotChassis.tsx` — themed wrapper. Reads `themeManifesto[theme]`, emits `data-surface` + `data-border` attributes from manifesto tokens, theme-coloured backdrop + inset shadow + gradient overlay. One shape across all 8 themes (bespoke per-theme shapes deferred). (Task 4)
- **`5e16cab`** `src/components/Games/Slots/PaylineStrip.tsx` — horizontal LED strip with `▶`/`◀` arrow markers across the middle row. `data-state="idle|win"` toggles a Framer Motion outward pulse. (Task 5)
- **`28e011e`** `src/components/Games/Slots/BottomLedBar.tsx` — bottom decorative bar with three discrete states: idle (gentle theme glow, opacity 0.5, no animation), small (1.0s linear chase), jackpot (0.6s linear sweep). (Task 6)

### Hook extension to 3-row state (Task 7)

- **`9293f1b`** `src/hooks/useSlotsGame.ts` — extended `reels: string[]` → `reelStates: [ReelCells, ReelCells, ReelCells]`. Middle row = payline (passed to `evaluateSlotsResult` via `finalReels.map(r => r.middle)`). Top + bottom drawn from the same symbol pool. Behaviour identical, only data shape changed. (Task 7)

### Bug fix #2: stuck-on-emoji + race-fix (Task 8 + C1 follow-up)

- **`e24bb8d`** `src/hooks/useSlotsGame.ts` — added `useEffect` that re-initialises `reelStates` when the symbol pool changes (but not while spinning). Replaces the one-shot guard at old `Slots.tsx:48-53` so reels recover from emoji fallbacks the moment Gemini URLs resolve. Uses a `lastSymbolsKey` useRef gate to prevent identity-only re-renders from re-firing the effect. (Task 8 initial)
- **`2d50a6f`** follow-up fix for **C1 race** caught by code-quality reviewer. The initial Task 8 fix handled the "no symbol change during spin" scenario but NOT "mid-spin URL change" (when `useAssets` resolved Gemini URLs WHILE spinning). Without the fix: post-spin effect re-fires and overwrites `finalReels` because `lastSymbolsKey.current` still pointed to the pre-rerender symbols key. **Fix:** hoist `lastSymbolsKey.current = key` ABOVE the `if (spinning) return` so mid-spin pool changes still update the tracked key — the post-spin re-run then finds matching keys and early-returns, preserving the `finalReels` and the win state. The replaced test 3 actually exercises this scenario via mid-spin `rerender({ symbols: urls })`. (Task 8 C1 fix)

### Spin animation + timing alignment (Tasks 9-10)

- **`8780d66`** `src/components/Games/Slots/SlotReel.tsx` — added `spinning ? <stack> : <static>` branch. Stack = finalReels at positions 0-2, 12 random fillers at positions 3-14. Animates from `y: '-80%'` (initial: only fillers visible) to `y: 0` (final: finalReels visible) with `cubic-bezier(0.15, 0, 0.25, 1)` easing. Stagger durations 1.5s / 2.0s / 2.5s by reel index via `STAGGER_MS` constant. Motion blur `filter: blur(2px)` during scroll. **Math-fix deviation** — see Deviations §5. (Task 9)
- **`0f3c6ba`** `src/hooks/useSlotsGame.ts` — refactored single `setInterval` (terminating at 21 ticks ~ 2100ms via `spins > 20`) into `cycleInterval` (every 100ms for visual cycling) + `setTimeout` (2500ms for resolution). `playSlotSpin(theme, SETTLE_MS)` (was 2000). Added `SETTLE_MS = 2500` module constant. Spinning state stays `true` until reel index 2's visual stop completes. (Task 10)

### Composition + integration (Tasks 11-12)

- **`8032a18`** `src/components/Games/Slots/SlotMachine.tsx` — pure-presenter orchestrator. Composes SlotChassis + PaylineStrip + 3 SlotReels + BottomLedBar. Takes `theme`, `game` (UseSlotsGameReturn), `symbols` (string[]) as props. The plan's intermediate render-prop API was correctly skipped per controller instruction (it would have put the chassis outside GameShell, breaking the bg art). (Task 11)
- **`fb01b34`** `src/components/Games/Slots.tsx` — shrunk from 167 lines to 60. Now orchestrates `useAssets` + `useSlotsGame` and renders `<GameShell>...<SlotMachine theme={theme} game={game} symbols={symbols} /></GameShell>`. Props interface unchanged so `App.tsx` import is untouched. (Task 12)

### In-window win pulses verification (Task 13)

- **`05338b6`** `src/components/Games/Slots/SlotMachine.test.tsx` — added assertion that all 3 reels' middle cells get `data-winning="true"` when `game.win` is non-null. **No production code change** — the wiring through SlotMachine → SlotReel → SlotSymbol was already correctly threaded by Tasks 2, 9, and 11. The test locks in the contract for future regression protection. (Task 13)

## Deviations from the literal plan (intentional)

1. **Task 1's timer math.** Plan's `vi.advanceTimersByTime(20 * 100 + 50)` (2050ms) is short — the spin loop's `spins > 20` actually terminates on tick 21 at 2100ms. Test bumped to `21 * 100 + 50` to match production behaviour (which the plan explicitly mandated to keep unchanged). The same correction propagated to Tasks 7 + 8's payline tests until Task 10 reset all timer math to `2500 + 50` (the new `SETTLE_MS`).

2. **vitest-native matcher adaptation across all tests** (Tasks 2, 3, 4, 5, 6, 11, 12, 13). The plan was written using jest-dom matchers (`.toBeInTheDocument()`, `.toHaveAttribute()`, `.toHaveTextContent()`) but the codebase has no `@testing-library/jest-dom` installed/configured. Implementer adapted to vanilla vitest matchers per the existing `BalancePill.test.tsx` convention: `expect(el.getAttribute('foo')).toBe('val')`, `expect(el).toBeTruthy()`, `expect(el.textContent).toContain('text')`. Also added `afterEach(() => cleanup())` to every new test file because the codebase doesn't auto-cleanup. **Future plans:** either keep the adaptation pattern OR install `@testing-library/jest-dom` + add a setupFile to make plan code work as-written.

3. **Task 6 dropped `as const` from the `variants` object** (`BottomLedBar.tsx`). Framer Motion's `TargetAndTransition` type rejects `readonly` keyframe arrays (`error TS2322`). Removing `as const` makes keyframes mutable; type narrowing via `state: keyof typeof variants` still resolves to `'idle' | 'small' | 'jackpot'` because TS infers literal-key unions from object literals regardless of `as const`. Behaviour identical. Verified independently by re-adding `as const` and reproducing the lint error.

4. **Task 8 race-fix gate (the C1 follow-up).** The plan's literal effect deps `[symbols.join('|'), spinning]` would cause the effect to re-fire at end-of-spin (when `spinning` flips true→false) and re-pick reelStates, wiping the just-set winning payline. Two-layer fix:
   - Initial fix (commit `e24bb8d`): added `lastSymbolsKey` useRef + key-comparison guard. Handled "no symbol change during spin" (key matches at end-of-spin → early return).
   - C1 fix (commit `2d50a6f`): hoisted `lastSymbolsKey.current = key` ABOVE the `if (spinning) return` so mid-spin pool changes still update the tracked key. Now also handles "mid-spin URL change" (key tracked during spin → matches at end-of-spin → early return).
   The plan's literal tests didn't catch this because their assertions (`expect(urls).toContain(r.middle)`) were satisfied by both the buggy and the correct paths. Replaced test 3 in `useSlotsGame.test.ts` with a snapshot test that exercises scenario 4 explicitly.

5. **Task 9 spin-animation math fix.** Plan's literal `initial={{ y: \`-${STACK_DEPTH * 100}%\` }}` is `-1200%` of the motion.div's own height — moves stack ~12× its height upward, way off-screen. At `y: 0` (final state), only positions 0-2 (random fillers in plan's stack order) would be visible, NOT finalReels (positions 12-14). Two-part fix:
   - Reverse stack order so finalReels are at positions 0-2 and 12 random fillers at positions 3-14.
   - Use `SPIN_INITIAL_Y_PCT = -((STACK_DEPTH / (STACK_DEPTH + 3)) * 100) = -80` (12 cells out of 15; ~0.2% off ignoring 4px gap-1 gaps, invisible).
   Visual direction preserved (scroll-DOWN: symbols enter from top, exit at bottom, settle on finalReels at top of stack at `y=0`). Inline comment in `SlotReel.tsx:26-31` documents the math.

6. **Task 10 dropped the `const settleTimeout =` binding name.** Plan's `const settleTimeout = setTimeout(...)` triggers `noUnusedLocals` because the handle is never cleared (the spin function is imperative; the timeout self-completes within 2500ms). Implementer dropped the binding; behaviour identical. Also added `SETTLE_MS = 2500` module constant per the plan's optional suggestion (and the prior reviewer's recommendation), used in both `playSlotSpin(theme, SETTLE_MS)` and `setTimeout(..., SETTLE_MS)`.

7. **Task 10 updated 4 tests, not 1.** The plan only specifies replacing the Task 1 test, but Tasks 7 and 8 each had timer math (`21 * 100 + 50`) that breaks when the settle moves to 2500ms. Implementer updated all 4 sites: replaced Task 1's resolve test with the new 2500ms test; bumped Task 7's payline test, Task 8's mid-spin test, and Task 8's race-fix lock-in test to use `2500 + 50`. (The plan-author's intent was clearly to update everything, just under-specified.)

8. **Task 11 skipped the intermediate render-prop API.** The plan has SlotMachine start with a `children: (game) => ReactNode` render-prop in Step 1, then mid-task realizes this would put the chassis OUTSIDE GameShell (breaking the bg art + backdrop blur), and pivots to a pure-presenter API in Steps 3a/3b/3c. Implementer skipped the intermediate version and went directly to the final pure-presenter design (`{theme, game, symbols}` props). Saved one round of throwaway code.

## Known limitations / things to revisit

1. **Browser click-through verification (Task 14 Step 4) is still pending.** The 10-item manual checklist requires a human at a browser. Walkthrough below in "Tasks for the next session."

2. **`useAssets` returns a fresh `assets` object on each render.** The Task 12 reviewer flagged that `Slots.tsx`'s `symbols` memo deps include `assets`, which invalidates whenever `useAssets` re-renders the parent. In practice not a runtime issue: `setAssets` only fires on initial fetch + regenerate, never mid-spin. Documented for Plans 4-5 in case those surfaces re-render more aggressively. Cheap mitigation: wrap useAssets to memoize its assets-object output.

3. **Slots.tsx integration test doesn't cover the asset-loading-state path.** The mock returns all asset keys present. The `assets[k] || fallbacks[i]` pattern (line 35) falls back to emoji when an individual key is missing — Task 8's stuck-on-emoji bug fix lives in this exact pathway, but no integration test exercises it. Worth adding before Plan 4 work.

4. **Bespoke per-theme chassis shapes deferred.** Plan 3 ships a unified manifesto-driven shape across all 8 themes. The spec's "sarcophagus / neon grid / wood-iron crate / coral arch / mossy stone / gothic arch / ink-brush" per-theme variants are explicit polish-pass deferrals (per the answered scoping question on 2026-05-09). Future plan.

5. **Per-reel click sounds deferred.** Spec mentions per-theme click + reel-stop + marker-stamp + fanfare audio (32 samples). Plan 3 keeps only the existing `soundEngine.playSlotSpin` loop. Sourcing the broader sound set is its own future plan.

6. **ThemedCelebration deferred to Section 7 plan (Plans 4-6 territory).** Plan 3 keeps the existing GameShell-level confetti/jackpot overlay and adds in-window pulses only (payline strip glow + winning middle-row symbol ring + bottom LED chase).

7. **`prefers-reduced-motion` not applied to reel scroll animation.** SlotReel's `<motion.div>` stack scrolls always (no reduced-motion guard). The existing GameShell win overlay still respects the pref (Plan 1 wired it). Polish-pass deferral.

8. **Unmount-during-spin leaks setState calls.** If the user navigates away mid-spin (clicks Back during the 2.5s window), the `cycleInterval` ticks ~25 more times and the `settleTimeout` fires, calling `setReelStates` / `setSpinning` on an unmounted component. React 18 silently no-ops; the bigger concern is `playWin` / `playLose` audibly firing ~2.5s after navigation. Bounded by typical user flow (rare navigation mid-spin, GameShell typically stays mounted). Lift the interval/timeout handles into a useEffect cleanup if Plan 6 hardens this.

9. **`SETTLE_MS` not exported.** The 4 test sites use the bare literal `2500`. If `SETTLE_MS` ever changes (Plan 4-5 calibration, future tuning), tests drift silently until re-run. Cheap to fix later.

10. **SlotReel stack rebuilds on every render.** The IIFE at `SlotReel.tsx:40-45` allocates a fresh 15-element array each render via `Math.random()`. While `pool` is stable across the spin (memoized in Slots.tsx), parent re-renders during the spin (none happen today) would shuffle the visible filler symbols. Cheap fix later: wrap in `useMemo([spinning, pool, cells.top, cells.middle, cells.bottom])`.

11. **Plan 1 + Plan 2 known limitations carry forward** verbatim: light/dark `profile.theme` reconciliation still out of scope; `screenshots/` dir still untracked and intentionally never committed; `data-route` first-paint flash not eliminated (defer to Plan 6 chrome polish).

## Tasks for the next session

In rough order of value:

1. **User does fresh manual browser pass** on the latest tip (`05338b6` or whatever the doc-commit SHA becomes). Run dev servers locally:

   ```bash
   npm run dev:server   # terminal 1 — Express on :8080
   npm run dev          # terminal 2 — Vite on :3000
   ```

   Walk through:
   - **Lobby → click any sweets game** (or any theme; sweets is fastest because symbol assets are usually cached in GCS from prior sessions).
   - **Slot machine renders inside the Gemini bg art + backdrop blur.** The chassis has `data-surface="pillowy-glass"` for sweets — visible in DevTools.
   - **3 reels × 3 visible cells.** Top + bottom dim, middle bright. Payline strip across the middle.
   - **Symbols are Gemini images** (open one `<img>` → `src` should be `https://storage.googleapis.com/...`). **Critical: this is the bug fix from Task 2 — verify visually.**
   - **Spin** with default bet 10. Reels scroll vertically with motion blur, stop in stagger at ~1.5s / 2.0s / 2.5s. Sound plays.
   - **Repeat** until a win lands (or set bet to 100 for impact). On win:
     - Payline strip pulses outward.
     - Middle-row symbols on all 3 reels get yellow ring + scale pulse.
     - Bottom LED runs chase pattern (small) or stronger sweep (jackpot).
     - Existing GameShell-level overlay still fires (kept until Plan 6).
   - **Switch themes** in the lobby (sweets → space → vampire → ninja). Each chassis colour + border shifts; layout shape stays the same (intended — bespoke shapes deferred).
   - **Spin while assets still loading** (DevTools → Network → throttle to "Slow 3G", reload). Reels start with emoji fallbacks; once Gemini URLs land, reels switch to images **without you having to spin first**. **Critical: this is the bug fix from Task 8 — verify automatic swap.**
   - **Reduced motion check.** DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Spin: GameShell win overlay should be subdued; reel scroll still happens (no Plan 3 guards added — see Limitation #7).
   - **Roulette + Bingo regression check.** Click each from the lobby. Should still work end-to-end — Plan 3 didn't touch them, but verify nothing leaked.

2. **Push the branch:** `git push -u origin feat/plan-3-slots-surface`. The 14 implementation commits + this progress doc are local-only.

3. **Open PR.** Suggested title: `Plan 3: Slots surface — chassis, 3-row reels, payline strip, fixes data:-prefix bug + stuck-on-emoji bug`.

4. **Merge to main.** Fast-forward; delete the feature branch local + origin.

5. **Deploy to prod** — `./deploy/deploy.sh deploy`. Plan 2 deploy was `ovg-casino-00008-pm5`; Plan 3 would land as the next revision.

6. **Start Plan 4 (Roulette surface — Section 5 of the spec).** Atoms ready include all Plan 3 work (the SlotChassis/SlotMachine pattern is reusable; the static-layout + manifesto-driven approach scales) plus everything Plans 1+2 built. Plan 4 needs writing first via `superpowers:writing-plans`.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections; Plan 3 implements Section 4)
- **Plan 3 doc:** `docs/superpowers/plans/2026-05-09-slots-surface.md` (15 tasks; all executed)
- **This progress doc:** `docs/superpowers/progress/2026-05-09-plan-3-status.md`
- **Plan 1 progress doc:** `docs/superpowers/progress/2026-05-07-plan-1-status.md`
- **Plan 2 progress doc:** `docs/superpowers/progress/2026-05-07-plan-2-status.md`
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`

## Sanity checks to run on next session start

```bash
git fetch origin
git checkout feat/plan-3-slots-surface
git status                                          # should be clean
git log --oneline origin/main..HEAD | wc -l         # should report 15 (14 impl + 1 doc; or more if more added)
npm install                                         # if not already installed
npm run lint && npm test                            # 257/257 + lint exit 0
npx vite build                                      # ~907 KB JS / ~50 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.
