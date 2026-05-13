# Celebration Cleanup — Status as of 2026-05-13

**Post-Plan-6 cleanup batch ready to deploy.** Bundles the audio mute desync fix (already committed) with the 11 cleanup tasks from the plan + 1 cross-cutting fix surfaced by the final review.

## TL;DR

Post-Plan-6 browser pass surfaced 5 visual issues + 1 audio bug. Cleanup batch resolves all of them via subagent-driven-development:

- Win-message duplication eliminated (4 visible sources → 1 themed celebration card per win, BalancePill ticks in lockstep).
- SmallWinBanner (bottom-pinned pill) replaced by SmallWinCard (mid-surface card with backdrop-blur, mirrors JackpotOverlay structure at smaller scale via shared `ThemedCelebrationCard` base).
- BetTable BLACK label clipping fixed (drop tracking-wider, ease font sizes).
- BINGO! sweep clipped to card bounds (overflow-hidden on outer wrapper).
- Egypt theme display font legibility on body text fixed (WinAmountCounter drops themeManifesto font; counter renders in sans + bold + tabular-nums + text-[4vh] for prominence + legibility across all 8 themes).
- Slots winning-state chassis border dialed down (border-[0.8vh] → border-[0.5vh]).
- Audio mute desync fixed (AudioControlsContext now propagates muted to soundEngine.setMuted).

13 commits ahead of `origin/main` ready to push: 1 audio fix + 1 spec doc + 1 plan doc + 10 cleanup commits (Tasks 1–11; Tasks 7+8 share a commit) + 1 final-review-driven egypt-font fix + this status doc commit. Tests: **437/437 across 71 files** (+12 tests, +1 file vs Plan 6 baseline 425/70). Lint clean. Build green at **919.93 KB JS / 59.26 KB CSS** (+0.27 KB JS / +1.77 KB CSS vs Plan 6 baseline 919.66 / 57.49). No new dependencies. **Branch ready, not yet pushed/deployed.**

## Branch state

- **Branch:** `main`. 13 commits ahead of `origin/main` (12 already + this status doc commit when made = 14).
- **Tip (pre-status-doc):** `987752b fix(celebration): drop themeManifesto display font from WinAmountCounter`.
- **Final cross-cutting review:** PASSED with one Important issue identified and fixed (the WinAmountCounter font issue, commit `987752b`).
- **CI gates:** lint exit 0, 437/437 tests, `npx vite build` succeeds in ~9s.

## What landed in this batch

| SHA | Subject | Notes |
|---|---|---|
| `a84be55` | fix(audio): propagate AudioControlsContext mute to SoundEngine | **Pre-existing local-main commit.** Fixes the latent SoundEngine.setMuted desync (mute persists in localStorage between sessions but SoundEngine reads it once at module load — toggling unmute now propagates). +2 regression tests in `AudioControlsContext.test.tsx`. |
| `78253b2` | docs(celebration): cleanup spec | Design spec for the cleanup batch. |
| `67fe8d9` | docs(plan): celebration cleanup implementation plan (12 tasks) | Implementation plan. |
| `066bdd3` | feat(celebration): ThemedCelebrationCard — shared base for small + jackpot | Task 1. New shared base owning: themed label + WinAmountCounter + ParticleField + auto-dismiss timer + click-on-content-doesn't-dismiss semantics. Tier-driven `TIER_CONFIG` map (small: 2.5s/15 particles/text-[5vh]; jackpot: 5s/50/text-[8vh] md:text-[10vh]). +6 tests. |
| `7c6b26e` | refactor(celebration): JackpotOverlay delegates to ThemedCelebrationCard | Task 2 (amended). JackpotOverlay shrinks to 32-line viewport-fixed wrapper. **Code-quality review caught a real-browser bug:** `containerClass="relative z-10 pointer-events-none"` would let card-body clicks pass through to the backdrop in real browsers (jsdom synthetic events mask it). Fix: drop `pointer-events-none`; rely on `e.target === e.currentTarget` guard alone. +1 structural regression test that locks the absence of `pointer-events-none` at the className level. Also added `aria-hidden="true"` on the wrapper for parity with Plan 6. |
| `0f2c3ae` | feat(celebration): SmallWinCard — surface-anchored jackpot-lite | Task 3. Surface-anchored mid-card with backdrop-blur. Mirrors JackpotOverlay's wrapper pattern but uses `absolute inset-0` instead of `fixed`, and lighter `bg-black/30 backdrop-blur-md` instead of `bg-black/70` so the AppHeader (BalancePill) stays sharp during the celebration. +4 tests including the same pointer-events regression guard. |
| `d0fcb0a` | refactor(celebration): ThemedCelebration uses SmallWinCard for tier='small' | Task 4. One-line orchestrator swap (`SmallWinBanner` → `SmallWinCard`). Surface-ref + dismiss + pendingTick wiring all preserved. |
| `7af620c` | chore(celebration): delete SmallWinBanner — superseded by SmallWinCard | Task 5. Pure deletion. -2 files, -3 tests. Zero remaining importers verified. |
| `d8011da` | fix(gameshell): message <p> visually hidden via sr-only | Task 6. The visible `<p aria-live="polite" role="status">` under the PLAY button (which duplicated the celebration card text) becomes `sr-only`. Screen-reader announcement preserved; visual duplication eliminated. +1 test. |
| `c4ef52a` | fix(roulette): ResultStrip becomes pocket-badge only | Tasks 7+8 (bundled). `ResultStripProps.message` removed; the strip now renders the pocket badge alone (e.g., colored disc with "23" on red). Win-amount text lives only in the celebration card. RouletteSurface call site updated. |
| `4537e0c` | fix(bingo): clip BINGO! sweep with overflow-hidden on card outer | Task 9. Outer relative wrapper gains `overflow-hidden` to clip the motion.div sweep within card bounds. Prevents the BINGO! text from leaking into the JUST CALLED panel. +1 regression test. |
| `fec5933` | fix(roulette): BetTable BLACK label clipping at md viewports | Task 10. Drop `tracking-wider`, ease font sizes from `text-[2vh] md:text-[2.5vh]` to `text-[1.7vh] md:text-[2vh]`, add `px-[1vh]` for breathing room. Visual verification owed at browser pass (jsdom can't measure layout). |
| `cee8d31` | fix(slots): reduce chassis border thickness 0.8vh → 0.5vh | Task 11. Single-token CSS dial. PaylineStrip ruled out as a contributor by static reading (it's a horizontal indicator only, not a chassis frame). Visual verification owed at browser pass. |
| `987752b` | fix(celebration): drop themeManifesto display font from WinAmountCounter | **Final-review fix.** Spec called for body text on the celebration card to use sans-serif (only the hero LABEL should carry themeManifesto[theme].font). Plan missed this; the cross-cutting reviewer caught the gap. WinAmountCounter className changed from `${themeManifesto[theme].font} text-theme-accent` to `text-theme-accent font-bold tabular-nums text-[4vh]`. The existing test that previously asserted "uses themeManifesto font class" was inverted to assert the opposite. |
| _this commit_ | docs(celebration): cleanup status doc + ship | Status doc. |

## Deviations from the literal plan

1. **Plan's Task 2 + Task 3 snippets had `containerClass="...pointer-events-none"`** which the open-questions section claimed was correct. It wasn't — in real browsers this lets card-body clicks pass through to the backdrop and dismiss. Both tasks (and the plan's open-questions wording) were corrected during execution. Structural regression tests on both wrappers lock the fix at the className level.

2. **Plan didn't include a task for the WinAmountCounter font fix** — the spec called for it under "Egypt theme font on celebration body text" but no Task in the plan implemented it. Caught by the final cross-cutting reviewer. Fixed via commit `987752b`.

3. **No subagent-driven-development worktree** — used direct-to-main commits per user-confirmed approach (matching Plans 1–6 pattern). The branch consent was explicit at execution kickoff.

4. **Tasks 10 + 11 carried no visual repro** because subagents have no live browser. The plan acknowledged this — fixes were applied based on static analysis (most-likely-cause CSS dial). Browser pass at deploy carries the load-bearing visual verification.

## Known limitations / follow-up items (NOT blocking deploy)

Pre-existing items the cross-cutting review flagged as adjacent cleanup:

1. **`ThemedCelebration` declares a `message: string | null` prop it never uses.** All call sites still pass it (`GameShell.tsx:103`). One-line cleanup deferred — would need `ThemedCelebration.tsx` prop drop + GameShell call-site update + ThemedCelebrationProps shrinkage. Pre-existing pre-this-batch.

2. **`RouletteSurface.test.tsx` fixtures still set `message: 'Won 20!'` strings on `game` objects** (lines 16, 33, 38). Harmless dead noise — the component no longer renders that message. Cleanup deferred.

3. **`BingoCard` outer `overflow-hidden` clips the inner `rounded-2xl` corners.** The outer wrapper has no `rounded-*`, so the clip is square — the inner grid's rounded corners are hidden by the outer's clip. Visual impact is small (the surrounding photographic background fills the corner slivers). If browser pass shows this is visible, a one-line `rounded-2xl` on the outer wrapper resolves it.

4. **Doubled `aria-hidden="true"`** between the celebration wrapper (`SmallWinCard.tsx:14` / `JackpotOverlay.tsx:14`) and the inner ThemedCelebrationCard (`ThemedCelebrationCard.tsx:64`). Inert (inherited), no a11y impact, just redundant.

5. **`surfaceRef` semantic mismatch for SmallWinCard positioning.** GameShell's `surfaceRef` div is NOT `position: relative`; the closest relative ancestor is the OUTER GameShell wrapper. So SmallWinCard's `absolute inset-0` actually anchors against the outer wrapper, blurring the entire game area (intended functionally — keeps AppHeader sharp) but the spec's wording "anchored to the surface div" is technically misleading. Either add `relative` to surfaceRef div or update the spec wording.

Carry-overs from Plans 1-6 still apply verbatim (light/dark profile.theme reconciliation; bespoke per-theme assets deferred; per-reel click sounds; idle ambient rotation; etc.).

## Browser-pass checklist (deploy verification)

Walk against the live URL after deploy. Items added/changed by this batch:

1. **Win flow on Slots** (any theme):
   - Spin → win small. SmallWinCard mid-surface with backdrop-blur on game (AppHeader sharp). Themed copy ("Sweet match!" etc.) + WinAmountCounter ticks $0 → $payout. BalancePill ticks lockstep (600ms).
   - Spin → win jackpot. JackpotOverlay full-screen takeover. Themed jackpot label. Counter ticks 1200ms.
   - Spin → loss. LossPlate at bottom + surface wiggle (theme-tuned).
   - **No visible "Won X" text under the PLAY button** (sr-only now).
   - **Slots chassis border:** tasteful theme-accent rim, not a dominating frame.

2. **Win flow on Roulette** (any theme):
   - Single number bet → win jackpot. Same pattern.
   - Red/black/even/odd bet → win small or loss.
   - **ResultStrip shows pocket badge only** (e.g., "23" on red) — NO "Won 20!" text.
   - **BetTable labels** (RED/BLACK/EVEN/ODD) all fully visible at typical demo widths.

3. **Win flow on Bingo** (any theme):
   - Play through. On a win: BINGO! sweep across the card. **Sweep stays inside card boundary** (not bleeding into JUST CALLED panel).
   - SmallWinCard appears mid-surface with payout.
   - On a loss: LossPlate + wiggle.

4. **Theme legibility for the WinAmountCounter:** Trigger a win on egypt, vampire, west, ninja themes. The counter (e.g., "$1000") should read clearly in sans-serif bold — NOT in the decorative theme display font.

5. **Audio:** Click MusicPill mute/unmute. Spin. **SFX should fire after unmuting** — even if mute=true was carried in localStorage from a prior session. Music also responds to mute toggle as expected.

6. **Cross-game regression:** Walk all 3 games on at least 2 themes. Confirm BalancePill tick lockstep + ARIA-live announcement + LossPlate wiggle work identically.

7. **No console errors** beyond pre-existing CES iframe noise.

## Pickup tasks for the next session (post-deploy)

1. **User does browser pass on prod** per the checklist above. Note any visual gaps for follow-up.
2. **Memory pointer update** (`~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`) — add the new revision number and a "post-Plan-6 cleanup" line summarizing this batch.
3. **Address any of the "Known limitations" items** if they bite during the browser pass.

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-13-celebration-cleanup-design.md`.
- **Plan:** `docs/superpowers/plans/2026-05-13-celebration-cleanup.md`.
- **This status doc:** `docs/superpowers/progress/2026-05-13-celebration-cleanup-status.md`.
- **Plan 6 status doc:** `docs/superpowers/progress/2026-05-12-plan-6-status.md` (carries the 9-step Plan 6 browser-pass checklist that the items above extend).

## Sanity checks for the next session start

```bash
cd /home/admin_/ovg-casino-ui
git status                       # clean working tree (screenshots/ untracked is fine)
git branch --show-current        # main
git log --oneline origin/main..HEAD     # 0 commits (post-push)
npm run lint                     # exit 0
npm test                         # 437/437 across 71 files
npx vite build                   # ~9s, ~920 KB JS / ~59 KB CSS
```
