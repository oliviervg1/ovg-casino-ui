# Themed-Immersive Redesign — Plan 5 Status as of 2026-05-11

**Pause point** for picking up later. Captures: what shipped, where to find it, what's next, known limitations.

## TL;DR

Plan 5 of 6 (Bingo surface) implementation complete on a feature-branch worktree. 12 implementation commits + this progress note (13 total since plan-doc commit `09aa61f`), 371/371 tests across 60 files (Plan 4 baseline was 307/52), lint clean, build green (916.09 KB JS / 56.28 KB CSS — net **+3.78 KB JS / -0.54 KB CSS** vs the Plan 4 baseline of 911.56 / 52.93, well under the 30 KB JS Plan 5 budget). **Branch not yet pushed (worktree is local). Not yet merged to main. Not yet deployed.** **Browser click-through verification (Task 12 Step 4) still pending — user should walk through.** **Subagent-driven-development was used this round** (Plan 4 was inline `executing-plans`). Each task got an implementer + spec reviewer + code quality reviewer subagent; a final cross-cutting code review was also dispatched. Next session can: manual browser pass → push branch → open PR → merge + deploy → start Plan 6.

## Branch state

- **Branch (local):** `worktree-feat+plan-5-bingo-surface` — the `EnterWorktree` tool created this name automatically. The plan called for `feat/plan-5-bingo-surface`. **Before pushing, rename:** `git branch -m worktree-feat+plan-5-bingo-surface feat/plan-5-bingo-surface` — or push under the worktree name and rename later.
- **Worktree:** `/home/admin_/ovg-casino-ui/.claude/worktrees/feat+plan-5-bingo-surface` (created via the `EnterWorktree` tool).
- **Tip:** the doc-commit SHA once this file is committed. Run `git log -1` to get the prior tip; the doc commit will be the new tip after you commit.
- **Diverges from origin/main:** 12 commits ahead, 0 behind (13 once this doc lands). The plan-doc commit `09aa61f` was pushed to `origin/main` BEFORE the worktree was created, so it's the base.
- **Pushed:** `09aa61f` was pushed; the 12 implementation commits + this doc are local-only as of pause.
- **PR URL:** not yet created.
- **CI gates:** `npm run lint` exit 0, `npm test` 371/371 across 60 files, `npx vite build` succeeds in ~7s (916.09 KB JS / 56.28 KB CSS).

## What landed in Plan 5

12 implementation commits via `superpowers:subagent-driven-development` (delegated implementer/spec-reviewer/code-quality-reviewer triplets per task; a final cross-cutting code review subagent ran after Task 12). All 12 implementation tasks shipped; Task 13 is this doc.

| SHA | Subject | Notes |
|---|---|---|
| `c0935b0` | feat(bingo): evaluateBingoLines helper for per-line completion mask | Pure helper appended to `src/components/Games/gameLogic.ts`, returns `{rows, cols, diags}` for 3×3 board + drawn list. Existing `evaluateBingoBoard` left verbatim. `gameLogic.test.ts` gains 10 new tests. (Task 1) |
| `9170a3d` | feat(bingo): useBingoGame hook lifts state out of Bingo.tsx | New `src/hooks/useBingoGame.ts`. Lift-and-shift of `bet` / `board` / `drawn` / `drawing` / `win` / `message` + `handlePlay` from old `Bingo.tsx`. Same 600ms cadence, `MAX_DRAWS = 12`, `bet * 5` payout. **One semantic addition:** exposes `lastDrawn` (the most recent draw, used by BingoCell for the wiggle highlight). Exports `MAX_DRAWS` and `DRAW_INTERVAL_MS` for downstream reuse. Hook tests use `vi.useFakeTimers()`; 8 new tests. (Task 2) |
| `3af0bc7` | feat(bingo): BingoMarker — themed disk with stamp animation | New `src/components/Games/Bingo/BingoMarker.tsx`. Unified `bg-theme-accent` disk; Framer Motion spring-physics stamp (scale 0 → 1 with overshoot, opacity 0 → 1) on mount. 3 tests. Bespoke per-theme markers (gummy-bear / scarab / alien-blob / etc.) explicitly deferred. (Task 3) |
| `12a2f9f` | feat(bingo): BingoCell — number + marker + last-drawn wiggle + winning-line ring | New `src/components/Games/Bingo/BingoCell.tsx`. Renders the cell number in white-on-theme; conditionally stamps `<BingoMarker>` when `marked=true`; wiggles (scale + tiny rotate) when this cell's number equals `lastDrawn`; gets a yellow ring when on a completed line. Carries `data-marked` and `data-winning-line` for tests/styles. 5 tests. (Task 4) |
| `880c31b` | feat(bingo): BingoCard — themed frame + 3x3 grid + per-cell winning-line ring | New `src/components/Games/Bingo/BingoCard.tsx`. Themed wrapper around 9 BingoCells with unified `border-theme-primary` chrome (bespoke per-theme card frames deferred). Local `isWinningCell(i, j, lines)` helper translates a `BingoLines` mask into per-cell `winningLine` flags. 7 tests. (Task 5) |
| `a3c8781` | feat(bingo): CalledPanel — JUST CALLED badge with bouncy entry per draw | New `src/components/Games/Bingo/CalledPanel.tsx`. AnimatePresence-driven badge with a spring-physics entry per new `lastDrawn`. **Deviation: `mode="popLayout"` (plan said `mode="wait"`) because `mode="wait"` deadlocks the rerender test in jsdom — exit animations never advance.** Visual difference at 600ms cadence is minor. Layout corollary: badge container is `relative` and the inner `motion.div` is `absolute inset-0`. 5 tests. (Task 6) |
| `249247d` | feat(bingo): CalledPanel — LINES tracker (Row1/Row2/Row3/Cols&Diagonals) | Extended CalledPanel. Adds required `lines: BingoLines` prop. 4-row tracker with `data-complete="true"|"false"` attrs per line. Width bumped to `md:w-[22vh]` to fit the labels. Backfilled all 6 existing render/rerender call sites in `CalledPanel.test.tsx` with `lines={noLines}` (Step 1 of the task explicitly instructed this — TS errors would have surfaced at the RED step otherwise). 5 new tests. **Preserves Task 6's `mode="popLayout"` deviation** even though Task 7's spec body shows `mode="wait"` (a copy-paste from Task 6's spec). (Task 7) |
| `a95be98` | feat(bingo): CalledTrack — 1–30 strip with N/12 caption | New `src/components/Games/Bingo/CalledTrack.tsx`. 15×2 grid of 30 cells, each dim/lit on `drawn.has(n)`. Caption uses `MAX_DRAWS` from the hook so the literal `12` doesn't drift if cadence is retuned. 5 tests. (Task 8) |
| `0866118` | fix(bingo): scope CalledTrack caption tests to the caption div | Code-quality fix immediately after Task 8: the original tests asserted `getByTestId('called-track').textContent.toContain('3')` etc., which would pass against any of the 30 cell text nodes (not the caption). Added `data-testid="called-track-caption"` to the caption div and re-scoped the 2 caption assertions. **Empirically verified during the fix: deleting the caption block now FAILS those tests.** (Task 8 follow-up) |
| `9c0c1de` | feat(bingo): BingoSurface orchestrator (card + called panel + called track) | New `src/components/Games/Bingo/BingoSurface.tsx`. Pure-presenter mirroring Plan 4's RouletteSurface and Plan 3's SlotMachine. Composes BingoCard + CalledPanel + CalledTrack. Memoises `drawnSet` (`Set<number>` from `game.drawn`) and `lines` (via `evaluateBingoLines`). Applies `themeManifesto[theme].font` to the outer wrapper so cell numbers / badge / track / banner inherit the theme display font via cascade. 6 tests. (Task 10) |
| `8da1134` | refactor(bingo): Bingo.tsx is now a thin GameShell + BingoSurface wrapper | `src/components/Games/Bingo.tsx` shrunk from 159 lines to 37. Now orchestrates `useBingoGame` and renders `<GameShell>...<BingoSurface theme={theme} game={game} /></GameShell>`. **Side-fix:** ThemeType import path corrected from `'../../App'` to `'../../utils/themeManifesto'` (canonical post-Plan-1 source) — same import-path cleanup item flagged in Plan 3's and Plan 4's progress docs. `useTheme` import dropped (theme now flows in via `Props.theme`, set by App.tsx). `Props` interface unchanged so `App.tsx` import is untouched. New `Bingo.test.tsx` with 5 GameShell-integration tests. (Task 11) |
| `7f4712e` | feat(bingo): in-window win pulse — BINGO! banner sweep across the card | Restructured BingoCard: outer became a `relative` positioning context, the themed grid moved into an inner sibling, and a BINGO! `motion.div` banner is conditionally rendered when `win !== null`. Added optional `win?: 'jackpot' | 'small' | null` prop (defaults to `null`). Banner sweeps `x: -120% → 120%` over 1.8s with opacity keyframes for fade-in/out. BingoSurface passes `game.win` through. 5 new tests (3 BingoCard, 2 BingoSurface). (Task 12) |

## Deviations from the literal plan (intentional)

1. **Task 6 `mode="popLayout"` instead of `mode="wait"`.** `AnimatePresence` `mode="wait"` deadlocks in jsdom because exit animations never advance, so the rerender test in the spec would never see the new badge mount. Switched to `mode="popLayout"` (with `relative` parent + `absolute inset-0` child as the layout corollary). Spec reviewer empirically verified the deadlock. Visual impact in real browsers: with `popLayout`, the new badge mounts immediately while the old animates out (~0.5s overlap); with `wait`, the slot would be empty during the transition. At 600ms draw cadence and a 0.5s exit animation, both modes look like a single rotating badge. Task 7's spec body shows `mode="wait"` (a copy-paste from Task 6's spec); Task 7's implementer correctly preserved Task 6's deviation rather than reverting.

2. **Task 8 caption test scoping bug fix (commit `0866118`).** The plan's Task 8 tests assert `getByTestId('called-track').textContent.toContain('3')` etc., but `called-track` is the root div whose `textContent` includes all 30 cell numbers. The assertions would pass even if the caption block were deleted. Caught by the code-quality reviewer; fixed by adding `data-testid="called-track-caption"` to the caption div and re-scoping the 2 caption assertions. **Plan author should update the literal text in `2026-05-11-bingo-surface.md` lines 1158-1172 if the plan ever gets re-executed.**

3. **Task 7 backfill of Task 6's render sites.** Task 7 makes `lines` a required prop on CalledPanel. Plan's Task 7 Step 1 explicitly instructs the implementer to backfill all 6 existing `render` / `rerender` calls in `CalledPanel.test.tsx` with `lines={noLines}`. The implementer did this correctly. Worth noting because TS errors would have surfaced during the Task 7 RED step otherwise.

## Known limitations / things to revisit

Carry-over from Plan-4-style scoping decisions and from per-task reviews:

1. **Bespoke per-theme markers** (gummy-bear / scarab / alien-blob / bullet-hole / pearl / carved-stone / bat-mark / shuriken) — DEFERRED to a future polish pass. Task 3 ships unified `bg-theme-accent` disk only.

2. **Bespoke per-theme card frames** (candy-bar / papyrus-scroll / wanted-poster / coral-frame / vine-frame / gothic-frame / etc.) — DEFERRED. Task 5 ships unified `border-theme-primary` chrome.

3. **Bespoke per-theme called-badge variants** (candy ball / hieroglyph cartouche / holographic orb / kanji-stamp / etc.) — DEFERRED. Task 6 ships unified `bg-theme-primary` badge.

4. **Per-cell stamp sound + BINGO! fanfare audio beyond `playBingoDraw`** — DEFERRED. Plan 5 keeps the existing draw cadence sound only.

5. **Themed celebration on win** — DEFERRED to Plan 6 (Section 7). Plan 5 keeps the existing GameShell-level overlay and adds in-window pulses (BINGO! banner sweep).

6. **`prefers-reduced-motion` behaviour** defaulted to "animate always; only the existing GameShell overlay respects the pref". Project-wide concern, not a Plan 5 regression.

7. **`MAX_DRAWS` exported from `useBingoGame` is also imported by `CalledTrack`.** Code-quality reviewer flagged the cross-package import as a single-source-of-truth choice; future refactor could extract to `src/components/Games/Bingo/constants.ts` or `src/lib/constants.ts`.

8. **`useBingoGame` `setInterval` is not cleared on unmount.** Pre-existing in legacy `Bingo.tsx`. If the user navigates away mid-draw, the interval continues for ≤7.2s, calling `setState` on an unmounted component (React 18+ silently no-ops + warns in dev). NOT introduced by this branch. Suggested fix: `useRef<number|null>` for the interval id + `useEffect(() => () => clearInterval(...), [])`. Worth a follow-up before Plan 6 since Plan 6 may add more state callbacks the closure could trip.

9. **`useBingoGame` calls `evaluateBingoBoard` twice in the terminal-tick branch.** Pre-existing in legacy `Bingo.tsx`. Cosmetic dedup deferred.

10. **`BingoCell` positional `key={\`${i}-${j}\`}` in BingoCard** means cells persist across rounds. If `motion.div.animate.scale` is mid-cycle when the new round resets `marked=false`, a stray scale-down could render briefly. Plan author chose this explicitly. Visual concern only; verify in browser pass.

11. **`isComplete(id, lines)` in CalledPanel** uses string-id dispatch — type-safety nit. The fall-through default is `colsOrDiags`, which would silently catch a typo'd new id. Defer.

12. **BINGO! banner has no `aria-hidden`.** Decorative; the GameShell already announces wins via existing celebration overlays. `aria-hidden="true"` would be a clean explicit addition. Defer.

13. **Theme-font cascade applies to LINES tracker labels and "Just called" header text.** Some themes' display fonts may read awkwardly at 1.5–1.7vh sizes. Acceptable for v1 per planner notes; override with `font-sans` on individual elements if it bites in the browser pass.

14. **Plan 1 + Plan 2 + Plan 3 + Plan 4 known limitations carry forward** verbatim: light/dark `profile.theme` reconciliation still out of scope; `screenshots/` dir still untracked and intentionally never committed; `data-route` first-paint flash not eliminated (defer to Plan 6 chrome polish); `useAssets` returns a fresh `assets` object on each render; per-reel click sounds deferred; SlotReel stack rebuilds on every render; bespoke per-theme rims/inner-cones/pointers/balls deferred for Roulette; wheel-segment click sounds + ball-drop "thunk" deferred; idle ambient rotation per `themeManifesto.<theme>.motion.idle` not shipped; `prefers-reduced-motion` not applied to wheel rotation; unmount-during-spin leaks `setState` calls; cone uses generic `font-bold` not theme display font; ball-orbit visual offset hard-codes mobile breakpoint; wheel rotation accumulator math not multi-spin-verified in tests; CES env-var warnings during build are pre-existing.

## Tasks for the next session

In rough order of value:

1. **User does fresh manual browser pass** on the latest tip (the doc-commit SHA after this file is committed). Run dev servers locally:

   ```bash
   npm run dev:server   # terminal 1 — Express on :8080
   npm run dev          # terminal 2 — Vite on :3000
   ```

   Walk through (12-item checklist from the plan's Task 12 Step 4):
   - **Lobby → click any sweets bingo game** (or any theme).
   - **Bingo renders inside the Gemini bg art + backdrop blur.** Card + CalledPanel side-by-side, CalledTrack below.
   - **Card shows 9 cells** (3×3) with random numbers from the legacy generator. Themed rim around the card.
   - **Click PLAY.** Hero button disables; first draw lands within ~600ms; "Just called" badge bounces in with the drawn number; that number's track cell lights up; if the number matches a card cell, the cell stamps with the marker (theme-accent disk) and wiggles.
   - **Subsequent draws every 600ms** for up to 12 total. Each draw: badge re-bounces, track cell lights, matched card cells stamp + wiggle.
   - **On a completed line** (row / col / diag): every cell on that line gets a yellow ring; LINES tracker (Row1/Row2/Row3/Cols&Diagonals) marks the corresponding line as complete.
   - **On a win:** BINGO! banner sweeps across the card from left to right with a fade in/out; balance pill counts up to new amount; existing GameShell celebration overlay still fires.
   - **At end of round:** result message visible; PLAY button re-enables; click PLAY again — board / drawn / lines all reset; round runs cleanly again.
   - **Switch themes** in the lobby (sweets → space → vampire → ninja → cowboy → underwater → jungle → egypt). Each theme's card rim, marker disk, badge bg, track lit-cell colour, BINGO! banner colour shift via theme tokens. Card layout shape stays the same (intended — bespoke shapes deferred).
   - **Theme display font** flows through to cell numbers, badge number, "Just called" header, LINES tracker labels, track caption. Verify legibility per theme (see Known limitation #13).
   - **Slots + Roulette regression check.** Click each from lobby. They should still work end-to-end — Plan 5 didn't touch them.
   - **No console errors** during the full flow (note: `setInterval` not-cleared-on-unmount warning may surface only if you navigate away mid-draw — see Known limitation #8).

2. **Push the branch.** First, decide on the branch name:
   - **Option A (preferred):** rename to match the plan: `git branch -m worktree-feat+plan-5-bingo-surface feat/plan-5-bingo-surface`, then `git push -u origin feat/plan-5-bingo-surface`.
   - **Option B:** push under the worktree name and rename later: `git push -u origin worktree-feat+plan-5-bingo-surface`.

   The 12 implementation commits + this progress doc are local-only.

3. **Open PR.** Suggested title: `Plan 5: Bingo surface — themed card + called panel + called track`.

4. **Merge to main.** Fast-forward; delete the feature branch local + origin.

5. **Deploy to prod** — `./deploy/deploy.sh deploy`. Update memory `redesign-progress.md` with the new revision number after deploy. If Plans 3 and/or 4 still haven't shipped, decide whether to bundle Plans 3+4+5 or ship sequentially.

6. **Start Plan 6 (themed win/loss celebration system — Section 7 of the spec, the last plan in the redesign).** Atoms ready then will include all Plan 5 work (BingoSurface composition pattern, useBingoGame hook shape, evaluateBingoLines helper, BingoMarker/BingoCard/CalledPanel/CalledTrack atoms, win-banner sweep pattern) plus everything Plans 1+2+3+4 built. Plan 6 touches all 3 game surfaces (Slots / Roulette / Bingo) by upgrading the GameShell-level overlay into per-theme celebrations (candy-burst, sandstorm-gold, supernova, dust-storm, bioluminescent-burst, parrot-flock, bat-swarm, cherry-blossom-storm). Plan 6 needs writing first via `superpowers:writing-plans`.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections; Plan 5 implements Section 6).
- **Plan 5 doc:** `docs/superpowers/plans/2026-05-11-bingo-surface.md` (1868 lines, 13 tasks).
- **This progress doc:** `docs/superpowers/progress/2026-05-11-plan-5-status.md`.
- **Plan 1 progress doc:** `docs/superpowers/progress/2026-05-07-plan-1-status.md`.
- **Plan 2 progress doc:** `docs/superpowers/progress/2026-05-07-plan-2-status.md`.
- **Plan 3 progress doc:** `docs/superpowers/progress/2026-05-09-plan-3-status.md`.
- **Plan 4 progress doc:** `docs/superpowers/progress/2026-05-11-plan-4-status.md`.
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md` — needs updating to reflect Plan 5 in-progress / done state.

## Sanity checks to run on next session start

```bash
cd /home/admin_/ovg-casino-ui/.claude/worktrees/feat+plan-5-bingo-surface
git status                                     # clean working tree
git branch --show-current                      # worktree-feat+plan-5-bingo-surface (or renamed)
git log --oneline 09aa61f..HEAD                # 13 commits since plan-doc base
npm install                                    # if needed
npm run lint                                   # exit 0
npm test                                       # 371/371 across 60 files
npx vite build                                 # ~7s, 916 KB JS / 56 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.
