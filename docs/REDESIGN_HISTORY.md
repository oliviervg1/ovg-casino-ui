# Themed-Immersive Redesign — History

This file is the durable in-repo record of the 2026-05-07 → 2026-05-13 themed-immersive redesign of OVG Casino. It replaces 18 per-plan / per-spec / per-progress execution artifacts that were consumed once during the work and are no longer needed (the codebase + git history is the source of truth).

For a future agent picking up the project: read this end-to-end before touching the design system. For day-to-day engineering: `CLAUDE.md` is the active project memory, this file is reference.

---

## TL;DR

Six-plan rework that took the casino UI from "generic chrome with theme color swaps" to "eight fully-formed visual worlds with bespoke surface vocabulary, motion, and celebrations across three games." Plus a post-deploy cleanup batch and five follow-up centering/font fixes triggered by browser-pass feedback.

| Metric | Pre-redesign baseline | Post-redesign + cleanup |
|---|---|---|
| Live revision | n/a (Plans 1–6 + cleanup) | `ovg-casino-00020-m5s` |
| Live URL | https://ovg-casino-y4zvagwaqa-uc.a.run.app | (same) |
| Tests | (varied per plan) | **442 across 71 files** (server + client) |
| Bundle | n/a baseline | **919.93 KB JS / 59.26 KB CSS** |
| Themed components | ad-hoc per game | shared design system (~30 atoms across `src/components/Themed/`, `src/components/Layout/`, `src/components/Games/`) |
| Themes | 8 (sweets / egypt / space / west / ocean / jungle / vampire / ninja) | 8 (same set; vocabulary tokens added per theme) |

---

## Spec at a glance

The original design spec defined 8 sections. Plans 1–6 implemented Sections 1–7; Section 8 was partially absorbed into the 6 plans, partially deferred.

| Section | Plan | Coverage |
|---|---|---|
| 1. Theme token vocabulary (foundation) | Plan 1 | `themeManifesto.ts` + per-theme CSS variables in `src/index.css` + `useTheme` / `useMotion` hooks |
| 2. Lobby | Plan 1 | `LobbyGrid` + `WorldCard` + `AIPitchStrip` |
| 3. Game-page chrome | Plan 2 | `AppHeader` + `BalancePill` + `MusicPill` + `MenuDropdown` + `BetControl` + `GameStatusLine` + `GameShell` |
| 4. Slots surface | Plan 3 | `SlotChassis` + `SlotReel` + `SlotSymbol` + `PaylineStrip` + `BottomLedBar` + `SlotMachine` + `useSlotsGame` |
| 5. Roulette surface | Plan 4 | `RouletteWheel` + `RouletteSegments` + `BetTable` + `ResultStrip` + `RouletteSurface` + `useRouletteGame` (manages wheel/ball rotation accumulators) |
| 6. Bingo surface | Plan 5 | `BingoCard` + `BingoCell` + `BingoMarker` + `CalledPanel` + `CalledTrack` + `BingoSurface` + `useBingoGame` |
| 7. Win & loss feedback | Plan 6 | `ThemedCelebrationCard` (shared base) + `JackpotOverlay` + `SmallWinCard` + `LossPlate` + `ParticleField` + `WinAmountCounter` + `CelebrationContext` + `themeCopy` + `themeParticles` |
| 8. Cross-cutting | (mixed) | Partially absorbed into the 6 plans (typography/motion/accessibility); partially deferred (per-theme audio, idle motion, spacing-scale migration, CES messenger positioning) |

Design intent across all sections: **per-theme bespoke vocabulary** — surface (`pillowy-glass` / `parchment` / `holographic` / `wood-iron` / `coral` / `mossy-stone` / `black-marble` / `dark-wood-paper`), button language (`gummy-3d` / `scarab-cartouche` / etc.), border, motion idle, celebration variant, skeleton, audio click — discriminated via `themeManifesto[theme]` and consumed by themed components that switch behavior on those tokens.

---

## What shipped per plan

| Plan | Date | Section | Live revision (post-deploy) | Headline atoms |
|---|---|---|---|---|
| Plan 1: Foundation + Lobby | 2026-05-07 | 1 + 2 | `ovg-casino-00007-p8j` | `themeManifesto`, `useTheme`, `useMotion`, `ThemedButton` (with `size='hero'`), `ThemedCard`, `ThemedSkeleton`, `LobbyGrid`, `WorldCard`, `AIPitchStrip` |
| Plan 2: Game-page chrome | 2026-05-07 | 3 | `ovg-casino-00008-pm5` | `AppHeader`, `BalancePill`, `MusicPill`, `MenuDropdown`, `BetControl`, `GameStatusLine`, `GameShell` (extracted from per-game wrappers) |
| Plan 3: Slots surface | 2026-05-09 | 4 | `ovg-casino-00009-824` | `SlotChassis`, `SlotReel`, `SlotSymbol`, `PaylineStrip`, `BottomLedBar`, `SlotMachine`. `useSlotsGame` hook |
| Plan 4: Roulette surface | 2026-05-11 | 5 | `ovg-casino-00010-w8r` | `RouletteWheel` (themed chrome + spin animation + win pulse), `RouletteSegments`, `BetTable`, `ResultStrip`, `RouletteSurface`. `useRouletteGame` hook (manages wheel + ball rotation accumulators) |
| Plan 5: Bingo surface | 2026-05-11 | 6 | `ovg-casino-00011-cf5` | `BingoCard` (with optional `win` prop driving BINGO! banner sweep), `BingoCell`, `BingoMarker`, `CalledPanel` (JUST CALLED + LINES tracker), `CalledTrack`, `BingoSurface`. `useBingoGame` hook |
| Plan 6: Themed celebration system | 2026-05-12 | 7 | `ovg-casino-00015-dkf` | `ThemedCelebration` (orchestrator), `JackpotOverlay` (full-screen takeover), `SmallWinCard` (surface-anchored mid-card with backdrop-blur), `LossPlate` (themed plate + surface wiggle), `ParticleField`, `WinAmountCounter`, `themeCopy`, `themeParticles`, `CelebrationContext` |
| Cleanup batch | 2026-05-13 | (post-Plan-6 polish) | `ovg-casino-00016-ks4` | Extracted `ThemedCelebrationCard` shared base from `JackpotOverlay`/`SmallWinCard`; deleted legacy `SmallWinBanner`; collapsed win-message duplication (GameShell `<p>` → `sr-only`, ResultStrip drops message text, BingoCard `overflow-hidden` clips BINGO! sweep, BetTable label clipping fix, SlotChassis border tone-down, WinAmountCounter font fix); audio mute desync fix |
| Cleanup follow-ups #1–5 | 2026-05-13 | (browser-pass fixes) | `ovg-casino-00017-8hb` → `…-00020-m5s` | Centering bugs (positioner + cardClass `mx-auto` + BetControl row `justify-center`), BetTable `vh` → fixed-px font sizes, minor cleanup (drop unused `message` prop, dead test fixtures, BingoCard `rounded-2xl`) |

---

## Atoms catalog

Reusable design-system components currently shipped. Future work composes from these.

**Foundation** (`src/components/Themed/`, `src/utils/`, `src/hooks/`):
- `ThemedButton` — variants per `themeManifesto[theme].button`; supports `size='hero'`
- `ThemedCard` — variants per `themeManifesto[theme].surface`
- `ThemedSkeleton` — variants per `themeManifesto[theme].skeleton`
- `useTheme()` — current theme + display name
- `useMotion()` — respects `prefers-reduced-motion`; centralized motion tokens
- `themeManifesto[theme]` — per-theme tokens (surface, button, border, motionIdle, celebration, skeleton, audioClick, font, displayName, wiggle)

**Header / shell** (`src/components/Layout/`, `src/components/Games/`):
- `AppHeader` — host for BalancePill + MusicPill + MenuDropdown
- `BalancePill` — animated balance display; consumes `CelebrationContext` for tick-lockstep with WinAmountCounter
- `MusicPill` — music-on/off + theme indicator
- `MenuDropdown` — header overflow menu
- `BetControl` — bet amount with presets (5/10/25/100) + ± buttons
- `GameStatusLine` — loading state under PLAY button
- `GameShell` — generic game frame: bg art + audio + bet controls + PLAY + sr-only message + ThemedCelebration

**Slots** (`src/components/Games/Slots/`):
- `SlotChassis` — themed reel container with border + shadow + gradient overlay
- `SlotReel` — single column with spin animation
- `SlotSymbol` — themed symbol cell (handles asset URLs vs emoji fallback)
- `PaylineStrip` — horizontal payline indicator with winning-state pulse
- `BottomLedBar` — winning-state LED display
- `SlotMachine` — composes the above; accepts `game` from `useSlotsGame`

**Roulette** (`src/components/Games/Roulette/`):
- `RouletteWheel` — themed wheel with spin animation + win pulse
- `RouletteSegments` — pure SVG segment rendering (color-coded by pocket)
- `BetTable` — RED / BLACK / EVEN / ODD cells with active-bet chip overlay
- `ResultStrip` — most-recent pocket badge (post-cleanup: badge only, no message text)
- `RouletteSurface` — composes the above; accepts `game` from `useRouletteGame`

**Bingo** (`src/components/Games/Bingo/`):
- `BingoCard` — 3×3 grid + relative outer with `overflow-hidden` clipping the BINGO! sweep banner
- `BingoCell` — number + marker + last-drawn wiggle + winning-line ring
- `BingoMarker` — themed disk with stamp animation
- `CalledPanel` — JUST CALLED badge + LINES tracker
- `CalledTrack` — 1–30 strip with N/12 caption
- `BingoSurface` — composes the above; accepts `game` from `useBingoGame`

**Celebration** (`src/components/Themed/`, `src/contexts/`):
- `ThemedCelebration` — orchestrator; routes by `tier` prop to JackpotOverlay / SmallWinCard / LossPlate
- `ThemedCelebrationCard` — shared base for JackpotOverlay + SmallWinCard (owns label + counter + particle field + auto-dismiss timer + click-on-content-doesn't-dismiss semantics)
- `JackpotOverlay` — viewport-fixed full takeover; theme-accent radial gradient + 50 particles + 5s dismiss
- `SmallWinCard` — surface-anchored mid-card; backdrop-blur on game content; explicit transform-centered positioner; 2.5s dismiss
- `LossPlate` — center-bottom themed plate + surface wiggle (per-theme intensity)
- `ParticleField` — Framer-Motion particle renderer; respects `prefers-reduced-motion`
- `WinAmountCounter` — animated `$0 → $amount` ticker; sans+bold+tabular-nums
- `CelebrationContext` — cross-tree wiring so BalancePill ticks in lockstep with WinAmountCounter
- `themeCopy[theme]` — `{ small, jackpotLabel, loss }` strings
- `themeParticles[theme]` — `{ pool, primitives, primitiveTint, motion }` per theme

**Hooks** (`src/hooks/`):
- `useSlotsGame` / `useRouletteGame` / `useBingoGame` — game-state machines per surface; emit `{ win: 'jackpot' | 'small' | 'loss' | null, lastPayout, message, ... }`
- `useAssets([keys])` — asset loading with auth gating (`enabled: !!user`)
- `useMusic(theme, gameType)` — Lyria-generated music URL
- `useBatchRegenerate` — Profile page's regenerate-everything worker pool (cap = 4)
- `useAudioControls` — mute toggle, persists to localStorage; **note**: `AudioControlsProvider` syncs muted to `soundEngine.setMuted` via useEffect (post-cleanup audio-desync fix)

---

## Deferred items

Items the brainstorms explicitly pushed to a future polish-pass plan. Each could become its own brainstorm/spec/plan:

| Area | What was deferred | Effort estimate |
|---|---|---|
| Bespoke per-theme assets | Custom SVG rims/inner-cones/pointers/balls (Roulette), markers/card-frames/called-badge variants (Bingo), per-theme particle SVGs beyond universal sparkle/dot/arc | Large (asset generation + integration per theme × per game) |
| Per-theme audio enhancements | Per-theme button click samples, per-reel-stop clicks (Slots), wheel-segment click + ball-drop "thunk" (Roulette), per-cell stamp + BINGO! fanfare (Bingo), themed celebration audio per tier | Medium (audio assets + soundEngine extension) |
| Per-theme idle motion | `themeManifesto.<theme>.motionIdle` token defined but not wired — sweets jiggle, vampire flicker, space pulse, ninja drift on game widgets | Small-medium (one Framer Motion variant per idle type, applied to surfaces) |
| Spacing-scale migration | Spec calls for fixed-px grid (4/8/12/16/24/32/48/64) replacing the current vh-based ad-hoc sizing throughout | Large (touches every themed component; risks visual regression unless carefully verified) |
| `prefers-reduced-motion` on wheel rotation | `useMotion` hook respects the pref globally but `RouletteWheel`'s spin animation doesn't honor it | Small (one conditional in spin handler) |

**Recommendation:** if any of these get prioritized, brainstorm each as a separate Plan 7+ rather than a mega-batch. Audio enhancements probably give the biggest perceived-quality gain per hour; bespoke per-theme assets are the biggest visual win but the most expensive.

---

## Notable deviations & lessons

Carry-forward knowledge for future plans, mostly hard-won during browser passes:

**1. jsdom `AnimatePresence mode="wait"` deadlocks rerender tests.** Plan 5 hit this with `CalledPanel`. The exit animation never advances in jsdom, so the rerender test waits forever. Use `mode="popLayout"` instead — minor real-browser visual difference (badges briefly overlap during ~0.5s exit), but unblocks tests.

**2. Percentage `max-w` against auto-width parents resolves non-deterministically.** Cleanup follow-up #3: a `max-w-[80%]` on a card-content div whose parent is `relative` (intrinsic width) computed differently in real browsers vs jsdom. Cost two fix attempts before DevTools `getBoundingClientRect()` revealed the parent was full-width while the visible card was only 80% wide and **left-aligned** within it. Use explicit transform-based centering (`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) for bulletproof positioning, OR add `mx-auto` to the constrained child to center it within the parent.

**3. `vh`-based units scale with viewport HEIGHT, not width.** Cleanup follow-up #2: BetTable's `text-[2vh]` resolved to ~38px at the user's portrait viewport (1471×1914), overflowing the ~140px-wide cell that's bounded by `max-w-2xl` regardless of viewport. For tight horizontal constraints, use fixed-px sizes (`text-[11px] md:text-[14px]`) — decouples font from viewport orientation.

**4. `items-center` is the cross axis only.** Cleanup follow-up #4: `flex flex-col md:flex-row items-center gap-4 w-full` looked like centering at base (where flex-col makes cross axis = horizontal), but at md+ where flex flips to row, `items-center` becomes vertical centering and the row of buttons aligns LEFT by default. Need `justify-center` for horizontal main-axis centering in flex-row contexts.

**5. Audio mute desync between context and engine.** Pre-existing latent bug surfaced after Plan 6 deploy when a prior session left `localStorage['ovg-audio-muted'] = 'true'`. `AudioControlsContext.toggleMute` updated React state + localStorage, but nothing called `soundEngine.setMuted(...)` — SoundEngine reads localStorage **once** at module load. Fix: `useEffect` in `AudioControlsProvider` syncs `muted → soundEngine.setMuted(muted)`. **Architectural takeaway:** when state has multiple targets (audio element + engine + persistent storage), wire ALL targets when state changes. Single source of truth, multi-sink propagation.

**6. DevTools `getBoundingClientRect()` data beats hours of CSS reasoning.** Cleanup follow-up #3 took two fix attempts at the centering bug while I was guessing at CSS. The user pasted the bounding-box rects from DevTools and the math was instantly clear (positioner was centered, card-content was left-aligned within positioner — the slack between them was the visible offset). For visual bugs, get the rect data first, then reason.

**7. Subagent-driven-development: best for plans with self-contained tasks; less needed for sequential refactors.** Plan 5 (Bingo) and the Cleanup batch used `subagent-driven-development` (implementer + spec-reviewer + code-quality-reviewer per task). Plans 3, 4, 6 used inline execution. Both worked. Subagents shine when tasks are independent (each ships a leaf component); inline shines when tasks share evolving state.

**8. Final cross-cutting reviewer often catches what per-task reviewers miss.** The cleanup batch's final reviewer caught that `WinAmountCounter` still applied `themeManifesto[theme].font` despite the spec calling for sans (the per-task review only saw it as a leaf component, not in the context of the whole batch). Always run a cross-cutting review after a multi-task batch.

---

## Pickup pointers

Where to look for what:

- **Active project conventions** (commands, deploy, test layout, server middleware order, theme-add procedure, etc.): `CLAUDE.md` at repo root.
- **Backend architecture & threat model**: `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.
- **Public-facing redesign narrative**: `README.md` "The redesign story" section.
- **The design system**:
  - Tokens: `src/utils/themeManifesto.ts`, `src/utils/themeCopy.ts`, `src/utils/themeParticles.ts`, `src/index.css` (`:root[data-theme="..."]` blocks).
  - Themed components: `src/components/Themed/` (ThemedButton, ThemedCard, ThemedSkeleton, JackpotOverlay, SmallWinCard, LossPlate, ParticleField, WinAmountCounter, ThemedCelebration, ThemedCelebrationCard, particles/Sparkle, particles/Dot, particles/Arc).
  - Game shell: `src/components/Games/GameShell.tsx`.
  - Game surfaces: `src/components/Games/{Slots,Roulette,Bingo}/`.
  - Game-state hooks: `src/hooks/use{Slots,Roulette,Bingo}Game.ts`.
- **Auto-memory** (per-machine, ephemeral): `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md` — short pointer to this file post-cleanup.
- **Git history**: `git log --grep "celebration\|themed-immersive"` for the redesign commit trail. Earlier per-plan commits for the foundation/lobby/chrome work.

---

## Glossary

- **Atom**: a reusable themed UI component or hook that switches behavior on `themeManifesto[theme].<token>`.
- **Surface**: the game-window region inside the GameShell — the wheel for roulette, the reels for slots, the card for bingo.
- **Tier** (celebration): `'jackpot' | 'small' | 'loss' | null`.
- **`'loss'` filter**: the per-game Surface components filter out `tier === 'loss'` from the cosmetic `win` prop they pass to children (so e.g. Slots BottomLedBar doesn't flash on a loss). Plan 6's hooks emit `'loss'`; only the GameShell-level ThemedCelebration consumes it for LossPlate.
- **Cleanup batch**: the 2026-05-13 post-Plan-6 work that collapsed win-message duplication + fixed five bugs surfaced by browser-pass + bundled the audio mute desync fix. Followed by 5 follow-up commits.
