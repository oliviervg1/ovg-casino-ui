# Themed-Immersive Redesign — Plan 4 Status as of 2026-05-11

**Pause point** for picking up later. Captures: what shipped, where to find it, what's next, known limitations.

## TL;DR

Plan 4 of 6 (Roulette surface) complete on a feature-branch worktree. 12 implementation commits + this progress note (13 total since `origin/main`), 307/307 tests across 52 files (baseline pre-Plan-4 was 257/46), lint clean, build green (911.56 KB JS / 52.93 KB CSS — net **+4.74 KB JS / +2.90 KB CSS** over the Plan 3 baseline of 906.82 / 50.03, well under the 30 KB Plan 4 budget). **Branch not yet pushed (worktree is local). Not yet merged to main. Not yet deployed.** **Browser click-through verification (Task 13 Step 4) still pending — user should walk through.** Next session can: manual browser pass → push branch (renaming first; see Branch state) → open PR → merge + deploy → start Plan 5.

## Branch state

- **Branch (local):** `worktree-plan-4-roulette-surface` — the `EnterWorktree` tool created this name automatically. The plan called for `feat/plan-4-roulette-surface`. There is also a stale local branch `feat/plan-4-roulette-surface` that was created earlier (parallel to the plan-doc commit) but contains no commits beyond `origin/main`. **Before pushing, rename:** `git branch -m worktree-plan-4-roulette-surface feat/plan-4-roulette-surface` (and `git branch -D feat/plan-4-roulette-surface` first if needed to free the name) — or push under the worktree name and rename later.
- **Worktree:** `/home/admin_/ovg-casino-ui/.claude/worktrees/plan-4-roulette-surface` (created via the `EnterWorktree` tool)
- **Tip:** `a923118` — `feat(roulette): in-window win pulses — result pocket + cone scale-pulse` (will be the doc-commit SHA once this file is committed)
- **Diverges from origin/main:** 12 commits ahead, 0 behind (13 once this doc lands). The plan-doc commit `58ea267` was pushed to `origin/main` BEFORE the worktree was created, so it's the base.
- **Pushed:** the parent commit `58ea267` was pushed; the 12 implementation commits + this doc are local-only as of pause
- **PR URL:** not yet created
- **CI gates:** `npm run lint` exit 0, `npm test` 307/307 across 52 files, `npx vite build` succeeds in 7.05s (911.56 KB JS / 52.93 KB CSS)

## What landed in Plan 4

12 implementation commits via `superpowers:executing-plans` (single-session foreground execution; no subagent delegation this round). All 12 implementation tasks shipped; Task 13 was a verification gate (no commit); Task 14 is this doc.

### Foundation: pure helper + hook (Tasks 1-2)

- **`69b5d09`** `src/components/Games/gameLogic.ts` — appended `angleOfPocket(n: number): number` returning `n * (360 / 37)`. Existing `evaluateRouletteBet` and `RouletteColour` kept verbatim. Test: `gameLogic.test.ts` from 8 → 12 tests. (Task 1)
- **`8fe110f`** `src/hooks/useRouletteGame.ts` — extracted `bet` / `betType` / `spinning` / `resultNum` / `resultColour` / `win` / `message` state and the spin-loop body from old `Roulette.tsx`. Behaviour preserved: same payouts (35× number, 2× simple), same tier logic (`payout >= bet * 10` → jackpot), same sound calls. **One semantic addition:** exposes `wheelRotation` and `ballRotation` accumulators (degrees) updated synchronously inside `spin()` so the wheel has a known target to decelerate into during the 2.5s spin window. **Pre-determines the result pocket at spin start** but hides `resultNum` / `resultColour` until the settleTimeout fires, so the cone display still shows the result only at spin end (per spec). Exports `SETTLE_MS = 2500`, `UseRouletteGameOptions`, `UseRouletteGameReturn`. Hook tests use `vi.useFakeTimers()`. (Task 2)

### Static layout: segments + wheel chrome + ball (Tasks 3-6)

- **`dc6cab5`** `src/components/Games/Roulette/RouletteSegments.tsx` — pure helper exporting `getRouletteSegments()` returning 37 `{number, colour, path, labelX, labelY, labelAngle}` descriptors. SVG `d` strings target a 100×100 viewBox (centre 50,50; outer radius 50; label ring at radius 42). Memoised via top-level `const SEGMENTS = computeSegments();` so the math runs once at module import. (Task 3)
- **`8c14944`** `src/components/Games/Roulette/RouletteWheel.tsx` — initial static SVG. Renders 37 wedge `<path>`s with `data-pocket` + `data-colour` + `data-pocket-label`. Hard-coded `SEGMENT_FILL` (red `#dc2626`, black `#171717`, green `#16a34a`); the brittle hand-coded brand-y colours sit inside the wheel (which renders inside the bg art) and intentionally diverge from theme tokens to keep the casino-roulette colour vocabulary canonical. (Task 4)
- **`fa4d6cb`** `src/components/Games/Roulette/RouletteWheel.tsx` — added themed chrome: `data-testid="roulette-wheel-frame"` positioned wrapper hosts the SVG + an outer rim (`border-theme-primary`), an inner cone (`bg-theme-bg` + `border-theme-accent`, displays `resultNum` or `'—'` placeholder), and a fixed pointer at 12 o'clock (CSS triangle, `border-t-theme-accent`). Unified shape across all 8 themes; bespoke per-theme rims (sweets candy double-rim, gold-leaf hieroglyph, neon-tube glow, etc.) explicitly deferred. (Task 5)
- **`d67ec14`** `src/components/Games/Roulette/RouletteWheel.tsx` — added orbiting ball element. `<div data-testid="roulette-ball" data-pocket={resultNum ?? 0}>` with two-layer rotation pattern (outer rotates around wheel centre via `rotate(angle)`, inner translates outward to the rim). Static positioning only — no animation yet. (Task 6)

### Spin animation (Task 7)

- **`cceb731`** `src/components/Games/Roulette/RouletteWheel.tsx` — wrapped segments + labels in a Framer Motion `motion.g` (testid `roulette-wheel-segments`, animates `rotate: wheelRotation`); wrapped the ball wrapper in a `motion.div` (animates `rotate: ballRotation`). Both use `transition = spinning ? { duration: 2.5, ease: [0.15, 0, 0.25, 1] } : { duration: 0 }`. Required adding `wheelRotation` + `ballRotation` props (sourced from `useRouletteGame`). Test file's existing render calls all updated to pass the new props. The frame div now has `data-spinning="true"|"false"`. (Task 7)

### Bet table + result strip + orchestration (Tasks 8-10)

- **`54012f5`** `src/components/Games/Roulette/BetTable.tsx` — felt-cloth bg (diagonal-stripe `repeating-linear-gradient` in green) + 4 bet cells (RED / BLACK / EVEN / ODD) with cell-specific gradient treatments (red-to-red, black-to-gray, diagonal red/black for EVEN, mirrored for ODD). Active cell gets `data-active="true"`, yellow ring + scale 1.05 + box-shadow, plus a Framer Motion chip (`bet-chip` testid) that drops in with spring physics (stiffness 500 / damping 20). Cells `disabled={spinning}`. Exports `BetType = 'red' | 'black' | 'even' | 'odd'`. (Task 8)
- **`8f6b95f`** `src/components/Games/Roulette/ResultStrip.tsx` — pocket badge + result message strip below the bet table. Pocket badge gets `data-colour={resultColour}` and a colour-specific bg class (`bg-red-600` / `bg-black` / `bg-green-600`). Message text rendered next to badge. Slides in from below (`y: 30 → 0`) with `easeOut` over 0.4s. Returns `null` when `resultNum === null`, so it disappears between spins. (Task 9)
- **`58107be`** `src/components/Games/Roulette/RouletteSurface.tsx` — pure-presenter orchestrator. Composes RouletteWheel + BetTable + ResultStrip. Takes `theme`, `game` (UseRouletteGameReturn) as props. Mirror of Plan 3's SlotMachine pattern. (Task 10)

### Composition + integration (Task 11)

- **`9eb9ace`** `src/components/Games/Roulette.tsx` — shrunk from 140 lines to 36. Now orchestrates `useRouletteGame` and renders `<GameShell>...<RouletteSurface theme={theme} game={game} /></GameShell>`. Props interface unchanged so `App.tsx` import is untouched. **Side-fix:** ThemeType import path corrected from `'../../App'` to `'../../utils/themeManifesto'` (canonical post-Plan-1 source) — this is the same import-path cleanup item flagged in Plan 3's progress doc. The legacy App re-export still resolves, but new code should hit the source directly. `Roulette.test.tsx` rewritten with 4 integration tests (wheel-renders, 4-bet-cells, pick-label, spin-label-after-pick); the prior single test's coverage is preserved by tests 3 + 4. (Task 11)

### In-window win pulses (Task 12)

- **`a923118`** `src/components/Games/Roulette/RouletteWheel.tsx` — added optional `win?: 'jackpot' | 'small' | null` prop (defaults to `null` so existing call sites don't break). Two effects:
  - **Result pocket highlight:** when `win !== null` and `resultNum === seg.number`, the segment path swaps stroke `#fbbf24 → #facc15` and `strokeWidth 0.15 → 0.6`, and gets `data-winning="true"`.
  - **Cone scale-pulse:** the cone is now a `motion.div` that animates `scale: [1, 1.15, 1]` over 0.6s, repeated 2× when `win !== null`. Always carries `data-winning="true"|"false"`.
  
  `RouletteSurface.tsx` updated to pass `game.win` through to RouletteWheel. (Task 12)

## Deviations from the literal plan (intentional)

1. **Test selector scoping in Task 4 (caught at Task 5 implementation time).** The plan's Task 4 test used `container.querySelectorAll('[data-pocket]')` which assumed only the 37 segment paths would have `data-pocket`. Task 5's plan code adds `data-pocket={resultNum ?? ''}` to the cone div, which means the cone IS picked up by the unscoped selector — count becomes 38 instead of 37, breaking the Task 4 test the moment Task 5 lands. **Fix:** scoped both Task 4 selectors to `path[data-pocket]` / `path[data-pocket="0"]`. Test intent is clearly the segment paths, not the cone. The Task 12 winning-pocket assertion also uses `path[data-pocket="17"]` for the same reason. Documented in this doc; the plan author should update the literal text for any future re-execution.

2. **vitest-native matcher adaptation across all new tests** (Tasks 1-12). The plan was written using jest-dom matchers (`.toBeInTheDocument()`, `.toHaveAttribute()`, `.toHaveTextContent()`) but the codebase has no `@testing-library/jest-dom` installed/configured. Adapted to vanilla vitest matchers per the existing `BalancePill.test.tsx` convention: `expect(el.getAttribute('foo')).toBe('val')`, `expect(el).toBeTruthy()`, `expect(el.textContent).toContain('text')`. Also added `afterEach(() => cleanup())` to every new component test file. **Same carryover** flagged in Plan 3's progress doc. Future plans: either keep the adaptation pattern OR install `@testing-library/jest-dom` + add a setupFile to make plan code work as-written.

3. **Branch name does not match the plan.** Plan called for `feat/plan-4-roulette-surface`. The `EnterWorktree` tool auto-named the branch `worktree-plan-4-roulette-surface` (its naming convention for worktree-created branches). A stale local `feat/plan-4-roulette-surface` exists at origin/main with no commits — created before the worktree was set up. Rename or delete + push under the canonical name during the next-session push step (see Branch state above and Tasks for next session §2).

4. **Plan duplicate-step typo in Task 7.** The plan's Task 7 has Step 4 + Step 5 written twice (lines 1049–1075 in the plan doc). Treated the first set as canonical and ignored the duplicate — single test-then-commit cycle, single commit per task.

5. **Test file replaced wholesale, not appended.** Plan 11's "Step 1: Read the existing test file and decide whether to extend or replace" suggested either extending the prior single-test `Roulette.test.tsx` or replacing it. Chose **replace** because the new file's 4 integration tests fully cover the prior test's two assertions (test 3 = "Pick" label initially; test 4 = "SPIN" label after click). Rewriting was cleaner than reconciling two import-block layouts.

## Known limitations / things to revisit

1. **Browser click-through verification (Task 13 Step 4) is still pending.** The 10-item manual checklist requires a human at a browser. Walkthrough below in "Tasks for the next session §1."

2. **Bespoke per-theme rims / inner-cones / pointers / balls deferred.** Plan 4 ships a unified manifesto-driven shape across all 8 themes (theme-token-coloured: `border-theme-primary`, `bg-theme-bg`, `border-theme-accent`, `border-t-theme-accent`). The spec's per-theme variants (sweets candy double-rim with gumball, gold-leaf rim with eye-of-horus motif and scarab ball, neon tube rim with asteroid ball, wood-iron crate with branded ball, kelp frame with pearl ball, vine wrap with seed ball, gothic arch with bat ball, ink-brush rim with cherry-blossom ball) are explicit polish-pass deferrals. Future plan.

3. **Wheel-segment click sounds + ball-drop "thunk" deferred.** Spec mentions per-segment click as the wheel rotates past pockets and a ball-drop thunk on settle. Plan 4 keeps only the existing `soundEngine.playRouletteSpin` loop. Sourcing the broader sound set is its own future plan.

4. **ThemedCelebration deferred to Section 7 / Plan 6.** Plan 4 keeps the existing GameShell-level confetti/jackpot overlay and adds in-window pulses only (result-pocket highlight + cone scale-pulse). Per-theme celebration variants (candy-burst, sandstorm-gold, supernova, dust-storm, bioluminescent-burst, parrot-flock, bat-swarm, cherry-blossom-storm) come later.

5. **Idle ambient rotation per `themeManifesto.<theme>.motion.idle` not shipped.** Wheel sits perfectly static between spins. Spec mentions a slow ambient rotation for thematic life. Cheap polish-pass — can be added by binding `motion.g`'s `animate` to a slow background loop when `!spinning`.

6. **`prefers-reduced-motion` not applied to wheel rotation.** RouletteWheel's `motion.g` and `motion.div` (ball + cone-pulse) animate always (no reduced-motion guard). The existing GameShell win overlay still respects the pref (Plan 1 wired it). Same as Plan 3 limitation #7. Polish-pass deferral.

7. **Unmount-during-spin leaks setState calls.** If the user navigates away mid-spin (clicks Back during the 2.5s window), the `settleTimeout` fires after navigation, calling `setResultNum` / `setResultColour` / `setSpinning` / etc. on an unmounted component. React 18 silently no-ops; the bigger concern is `playWin` / `playLose` audibly firing ~2.5s after navigation. Bounded by typical user flow (rare navigation mid-spin). Lift the timeout handle into a useEffect cleanup if Plan 6 hardens this. Same shape as Plan 3 limitation #8.

8. **`SETTLE_MS` exported but only the hook uses it.** The constant is exported from `useRouletteGame.ts` for future reuse but currently only used internally. The hook test file uses the bare literal `2500`. If `SETTLE_MS` ever changes (calibration, future tuning), tests drift silently until re-run. Cheap to fix later.

9. **Cone uses generic `font-bold` not theme display font.** Spec section 5 says the cone shows the winning number "in the theme display font". Plan 4's cone uses `font-bold` (generic). Cheap follow-up: import `themeManifesto` in `RouletteWheel.tsx` and apply `themeManifesto[theme].font` to the cone's className. Not a blocker for v1.

10. **Ball-orbit visual offset hard-codes mobile breakpoint.** The ball's inner-div translateY is `-16.5vh`, which is `(35vh frame / 2) - 1vh` for the mobile breakpoint. At `md:45vh`, the ball orbits slightly inside the rim instead of right at it (`-16.5vh` is only ~37% of `45vh` instead of ~46% of `35vh`). Acceptable for v1; a polish pass could compute via `ResizeObserver` or use a percentage-of-frame calc. Plan-author flagged this in self-review §4.

11. **Wheel rotation accumulator math is per-spin-correct but not multi-spin-verified in tests.** `wheelRotation` tests (Task 2 hook test #7) check the per-spin delta is in `[1800-360, 1800+360]`. The math `1800 + (angleOfPocket(prevN) - angleOfPocket(newN))` always lands the result pocket at the top with always-forward rotation, but no automated test exercises 5+ consecutive spins. Visual verification is deferred to the manual browser pass (Task 13 Step 4 §9). Plan-author flagged this in self-review §1.

12. **CES env-var warnings during build are pre-existing, not Plan-4-caused.** `npx vite build` reports `%VITE_CES_DEPLOYMENT_ID%` etc. not defined. These are conditionally stripped from `index.html` by the `stripCesIfDisabled` Vite plugin when the env vars are empty (which they are in this dev environment). Same noise as the Plan 3 build.

13. **Plan 1 + Plan 2 + Plan 3 known limitations carry forward** verbatim: light/dark `profile.theme` reconciliation still out of scope; `screenshots/` dir still untracked and intentionally never committed; `data-route` first-paint flash not eliminated (defer to Plan 6 chrome polish); `useAssets` returns a fresh `assets` object on each render (Plan 3 §2); per-reel click sounds deferred (Plan 3 §5); SlotReel stack rebuilds on every render (Plan 3 §10).

## Tasks for the next session

In rough order of value:

1. **User does fresh manual browser pass** on the latest tip (the doc-commit SHA after this file is committed). Run dev servers locally:

   ```bash
   npm run dev:server   # terminal 1 — Express on :8080
   npm run dev          # terminal 2 — Vite on :3000
   ```

   Walk through (10-item checklist from the plan's Task 13 Step 4):
   - **Lobby → click any sweets roulette game** (or any theme).
   - **Roulette renders inside the Gemini bg art + backdrop blur.** Wheel SVG fills the centre area.
   - **Wheel shows 37 segments** (alternating red/black, green at 0). Numbers legible (white text on coloured wedges). Themed rim, pointer, and inner cone (showing "—") visible.
   - **Click a bet cell** (e.g. RED). Cell highlights with yellow ring + lift; bet chip animates in (drops from above with bounce). Hero button label changes from "Pick Red / Black / Even / Odd" to "SPIN THE WHEEL".
   - **Spin.** Wheel rotates clockwise ~5 turns over 2.5s with cubic decel. Ball orbits counter-clockwise ~7 turns over the same 2.5s. Sound plays.
   - **At end of spin:** wheel settles with result pocket at the top (under pointer); ball sits in that pocket; cone shows result number; result strip slides in from below with pocket badge + message.
   - **On a win:** cone scale-pulses; result pocket on wheel gets yellow stroke; balance pill counts up to new amount.
   - **Switch themes** in the lobby (sweets → space → vampire → ninja). Each theme's rim, cone, pointer, ball border, chip colour shift via theme tokens. Wheel layout shape stays the same (intended — bespoke shapes deferred).
   - **Spin again.** Wheel keeps rotating forward (no snap-back); new result lands correctly under pointer; previous result strip fades and new one slides in.
   - **Slots + Bingo regression check.** Click each from lobby. They should still work end-to-end — Plan 4 didn't touch them.

2. **Push the branch.** First, decide on the branch name:
   - **Option A (preferred):** rename to match the plan: `git branch -D feat/plan-4-roulette-surface 2>/dev/null; git branch -m worktree-plan-4-roulette-surface feat/plan-4-roulette-surface`, then `git push -u origin feat/plan-4-roulette-surface`.
   - **Option B:** push under the worktree name and rename later: `git push -u origin worktree-plan-4-roulette-surface`.
   
   The 12 implementation commits + this progress doc are local-only.

3. **Open PR.** Suggested title: `Plan 4: Roulette surface — themed wheel + bet table + result strip`.

4. **Merge to main.** Fast-forward; delete the feature branch local + origin.

5. **Deploy to prod** — `./deploy/deploy.sh deploy`. Plan 3 deploy revision was n/a (Plan 3 not yet deployed at time of writing — see memory `redesign-progress.md`). If Plan 3 still hasn't shipped, decide whether to bundle Plans 3+4 or ship sequentially.

6. **Start Plan 5 (Bingo surface — Section 6 of the spec).** Atoms ready include all Plan 4 work (RouletteSurface composition pattern, useRouletteGame hook shape, Framer-driven SVG-and-overlay layering) plus everything Plans 1+2+3 built. Plan 5 needs writing first via `superpowers:writing-plans`.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections; Plan 4 implements Section 5)
- **Plan 4 doc:** `docs/superpowers/plans/2026-05-11-roulette-surface.md` (14 tasks; all executed)
- **This progress doc:** `docs/superpowers/progress/2026-05-11-plan-4-status.md`
- **Plan 1 progress doc:** `docs/superpowers/progress/2026-05-07-plan-1-status.md`
- **Plan 2 progress doc:** `docs/superpowers/progress/2026-05-07-plan-2-status.md`
- **Plan 3 progress doc:** `docs/superpowers/progress/2026-05-09-plan-3-status.md`
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`

## Sanity checks to run on next session start

```bash
git fetch origin
git checkout feat/plan-4-roulette-surface     # or worktree-plan-4-roulette-surface if Option B was chosen
git status                                     # should be clean
git log --oneline origin/main..HEAD | wc -l    # should report 13 (12 impl + 1 doc; or more if more added)
npm install                                    # if not already installed
npm run lint && npm test                       # 307/307 + lint exit 0
npx vite build                                 # ~912 KB JS / ~53 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.
