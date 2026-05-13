# Celebration Cleanup — Design Spec (post-Plan-6)

**Date:** 2026-05-13
**Context:** Plan 6 (themed celebration system) shipped to revision `ovg-casino-00015-dkf`. Browser-pass surfaced visual issues:
- Win-message duplication: same payout shown in up to 4 places (GameShell `<p>`, SmallWinBanner, ResultStrip text, BalancePill).
- SmallWinBanner is undersized + bottom-pinned; doesn't feel like the primary win moment.
- BetTable label collision (BLACK clipped); BINGO! banner sweeps past card boundary; Egypt theme font illegible at body sizes.
- (Already fixed locally as `a84be55`, included in this deploy batch:) audio mute desync — `AudioControlsContext.toggleMute` did not propagate to `soundEngine.setMuted`, so SFX stayed silent for any user whose localStorage carried `'ovg-audio-muted': 'true'` from a prior session.

## Goal

Single, prominent, themed win celebration per round. Wins celebrate (mid-surface card with backdrop-blur, scaled to the tier); losses acknowledge (subtle bottom plate + surface wiggle); no message lives in two visible places at once.

## Architecture changes

### `ThemedCelebrationCard` (new shared base)

Extracted base shared by `JackpotOverlay` and the new `SmallWinCard`. Owns the common shape so both tiers stay visually consistent and code stays DRY. The wrapper accepts a `tier: 'small' | 'jackpot'` prop and a positioning mode.

Common content (in render order):
1. **Backdrop** — radial gradient anchored to theme accent + blur on the layer behind. Click target for early dismissal.
2. **Particle field** — `<ParticleField>` with theme particle pool. Particle count + duration scale per tier.
3. **Label** — themed copy (`themeCopy[theme].small` for small, `themeCopy[theme].jackpotLabel` for jackpot) in `themeManifesto[theme].font`. Decorative theme font is reserved for this large-text element.
4. **Win amount counter** — `<WinAmountCounter>` ticks `$0 → amount` over the tier's duration (small: 600ms, jackpot: 1200ms — Plan 6 timings preserved).
5. **Auto-dismiss timer** — small: 2.5s, jackpot: 5s (Plan 6 timing preserved).

Per-tier scale parameters:

| Param | Small | Jackpot |
|---|---|---|
| Anchor | Surface (absolute inside `surfaceRef`) | Viewport (`fixed inset-0`) |
| Backdrop blur target | Game surface only | Full viewport behind overlay |
| Card width | ~60% of surface, min 320px | Auto-fit content, no card |
| Card height | ~40% of surface | Auto |
| Particle count | ~15 | 50 |
| Auto-dismiss | 2.5s | 5s |
| Label font size | `text-[5vh]` | `text-[8vh]` |

Click on backdrop → dismiss immediately. Click on card body (the celebration content itself) → no dismiss. Preserves the Plan 6 `JackpotOverlay` semantics; both tiers behave the same way.

### `SmallWinCard` (replaces `SmallWinBanner`)

Renders `<ThemedCelebrationCard tier="small" surfaceRef={...} />`. Surface-anchored: positioned absolute inside the surface div (the `surfaceRef` GameShell already passes to `<ThemedCelebration>`). The blur applies only to the game content within the surface — the AppHeader (BalancePill, MusicPill) stays sharp so the player can watch the BalancePill tick in lockstep.

Replaces the bottom-fixed pill that Plan 6 shipped. The component file is renamed (or the contents replaced) — the new shape is significant enough that "Banner" is misleading.

### `JackpotOverlay` (refactored, behaviour unchanged)

Internally now renders `<ThemedCelebrationCard tier="jackpot" />`. Visible behaviour identical to today: full-screen takeover with `bg-radial-gradient` from theme accent, themed label, 50 particles, counter, 5s auto-dismiss, click-backdrop-to-dismiss-early, click-content-to-stay.

### `ThemedCelebration` orchestrator (minor update)

Pure router stays. The `tier === 'small'` branch now renders `<SmallWinCard>` instead of `<SmallWinBanner>`. The `surfaceRef` prop, already plumbed in Plan 6 for `LossPlate`, is now also handed to `SmallWinCard`. The cross-tree `pendingTick` push (Plan 6) stays unchanged.

### `LossPlate` (unchanged)

Asymmetric on purpose: losses are frequent, mid-surface blur on every loss would feel punitive. Plate stays at center-bottom of the surface; per-theme wiggle stays. No change to Plan 6 implementation.

### `GameShell` `<p>` message line — `sr-only` always

The `<p aria-live="polite" role="status">{message}</p>` line, currently visible at small body size under the PLAY button, becomes `sr-only` (visually hidden, screen-reader announces).

The textual confirmation lives in:
- The themed celebration card (visual) for wins.
- The LossPlate (visual) for losses.
- The `aria-live` `<p>` (announced) for both.

This is the single change that resolves the duplication problem most cleanly without losing accessibility.

### `ResultStrip` (roulette) — pocket badge only

Drop the `message` text from the strip. The `result-pocket-badge` chip (with the resulting number on its colour-coded disc) stays as the single result indicator. The win amount + themed copy lives in `SmallWinCard` / `JackpotOverlay`. The `message` prop is removed; `ResultStripProps` becomes `{ resultNum, resultColour }`.

### `BingoCard` BINGO! sweep — clip to card

Add `overflow-hidden` to the relative outer wrapper. The motion.div sweeping `x: -120% → 120%` stays clipped to the card bounds; no longer bleeds into the JUST CALLED panel.

This is also the right boundary semantically — the BINGO! sweep is *card flair*, not a global event. Clipping makes that explicit.

## Bug fixes

### `BetTable` BLACK label clipping

Investigate first via dev-server reproduction at the screenshot's viewport width. Likely candidates:
- `text-[2vh] md:text-[2.5vh]` is too large for the cell at the rendered width.
- `gap-3 md:gap-4` between cells is shrinking each cell.
- The active-bet chip (`w-[5vh] h-[5vh]`) is centered absolutely and visually competes with the label.

Fix is likely one of: drop `text-[2.5vh]` to `text-[2vh]`, add `min-w-0 truncate` on the label, or move to `grid-cols-2` on small viewports (already does at base) — confirm the breakpoint trigger matches the screenshot's width.

The implementation plan should walk this in DevTools first to identify the actual failure mode rather than guess.

### Egypt theme font on celebration body text

Apply `themeManifesto[theme].font` **only to the label** of the celebration card (already large). Body text — the WinAmountCounter and any descriptive copy — uses the default sans-serif. Egyptian / vampiric / etc. display fonts stay reserved for hero text where they're legible.

The Plan 5 note (#13: theme-font cascade illegibility on small text) becomes resolved as a side-effect.

### Slots winning chassis border too prominent

Investigate first. `SlotChassis` has `border-[0.8vh] border-theme-primary` — at 1080p that's ~8px gold. The screenshot's border looks thicker; check whether `PaylineStrip`'s winning-state styling is layering an additional border on the chassis or whether the gradient overlay is contributing.

Fix is likely tuning `border-[0.8vh]` → `border-[0.5vh]` OR removing a duplicated border from `PaylineStrip`'s winning state — to be confirmed during implementation.

## Out of scope

- Bespoke per-theme celebration visuals (e.g., scarab beetle SVG for egypt, cherry-blossom petals for ninja). Plan 6 deferred these; staying deferred.
- Additional audio per tier (e.g., themed jingle on small win, vault-door rumble on jackpot). Existing `playWin` / `playLose` calls cover the tier.
- ResultStrip restructure (e.g., showing last N results stacked). Stays as the single most-recent pocket badge.
- BingoCard's optional `win` prop semantics (Plan 5 deviation note re: positional `key` persistence). No regression; not blocking.
- Per-theme bespoke SmallWinCard layouts. Single shared shape across all 8 themes; theme tokens drive colour/font/copy.

## Open questions

None blocking. The implementation plan should resolve:
1. Whether `BetTable` collision is text size, gap, or chip overlap (DevTools repro before changing CSS).
2. Whether `SlotChassis` thick yellow border is the chassis itself or `PaylineStrip` layering (DevTools inspect before changing CSS).

## Atoms shipped after this spec

Carries forward Plan 6 atoms with these revisions:

- `ThemedCelebrationCard` (new shared base)
- `SmallWinCard` (replaces `SmallWinBanner` — surface-anchored mid-surface card with backdrop-blur)
- `JackpotOverlay` (refactored to use the base; visible behaviour unchanged)
- `LossPlate` (unchanged)
- `ParticleField` / `WinAmountCounter` / `ThemedCelebration` / SVG primitives — unchanged
- `themeCopy` / `themeParticles` / `themeManifesto.wiggle` — unchanged
- `CelebrationContext` — unchanged
- `GameShell` — message `<p>` becomes `sr-only` (single line change)
- `ResultStrip` — `message` prop removed
- `BingoCard` — outer wrapper gets `overflow-hidden`
- `BetTable` — sizing/layout fix (specifics TBD via DevTools)
- `SlotChassis` / `PaylineStrip` — winning-state border fix (specifics TBD via DevTools)

## Bundling with the audio fix

The audio mute desync (`a84be55`, committed locally on `main`) ships in the same deploy. No conflict — it touches `src/contexts/AudioControlsContext.tsx` only.

## Why this design

The user's complaint about Plan 6 was concrete: same win amount in 4 places, the primary banner too small + poorly placed, three smaller bugs (BetTable, BINGO! overflow, font). The fix is structural, not cosmetic — collapsing four redundant visual sources into one prominent themed card per win, while keeping the existing accessibility and the BalancePill tick lockstep that Plan 6 already nailed. The shared `ThemedCelebrationCard` base keeps small + jackpot visually coherent; their differences are now data (tier prop) instead of two separate component implementations drifting apart.
