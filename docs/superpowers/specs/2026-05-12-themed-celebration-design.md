# Themed Celebration System — Design Spec

**Date:** 2026-05-12
**Status:** Approved (brainstorming)
**Next step:** writing-plans → implementation plan
**Implements:** Section 7 of `2026-05-07-themed-immersive-redesign-design.md` (the sixth and final plan in the themed-immersive redesign).

## Context

The themed-immersive redesign has brought the lobby (Plan 1), game-page chrome (Plan 2), Slots surface (Plan 3), Roulette surface (Plan 4), and Bingo surface (Plan 5) up to the per-theme visual standard. Win and loss feedback is the last visual hole.

Today (`src/components/Games/GameShell.tsx` lines 99-121):

- **Jackpot tier:** full-screen `bg-black/70` wash + `<Confetti />` (`react-confetti ^6.4.0`) + plain `<div class="text-7xl font-casino text-yellow-300">JACKPOT!</div>`. No theming, no payout amount, no theme-driven motion.
- **Small-win tier:** bottom-center green pill (`bg-green-500`) with literal `"You won!"` text. No amount, no theming.
- **Loss tier:** no overlay UI. Hooks set `message` to e.g. `"No bingo this round."` but only the `<p class="text-sm">` line beneath BetControl carries it.

This spec replaces all three with a per-theme celebration system that mirrors the ambition of Plans 3-5: each theme expresses small wins, jackpots, and losses through its own particles, copy, motion intensity, and font — driven by the existing `themeManifesto.celebration` discriminator and two new sibling data files.

## Goals

1. **Make the win moment feel themed.** Sweets candy-bursts; vampire bat-swarms; ninja cherry blossoms — the celebration reads as part of the world the player has been playing in, not a generic confetti overlay.
2. **Communicate the payout viscerally.** Both an animated counter inside the celebration and the header balance pill ticking in lockstep — the player sees the money arrive.
3. **Round out the loss tier.** Today losses are silent UI; the new `LossPlate` gives every round a satisfying visual close.
4. **Stay a pure presentation plan.** No game-logic changes (jackpot threshold, payout multipliers); no asset-generation work (no new Gemini/Lyria samples). All-code.
5. **Respect reduced-motion strictly.** WCAG-spirit: no involuntary motion for users who opted out, but audio + value feedback preserved.

## Scope

This is Plan 6's v1 (the recommended scope cut from brainstorming):

- ✅ Themed UI for all 3 tiers (small / jackpot / loss).
- ✅ Custom particle field replacing `react-confetti`.
- ✅ Win-amount counter (animated 0 → payout).
- ✅ Balance-pill simultaneous tick (synchronised with the counter).
- ✅ Reduced-motion support (strict).
- ✅ ARIA-live announcement of the result message.
- ✅ Loss-tier "miss wiggle" on the game surface (per-theme intensity).
- ✅ Hook union extension to surface `'loss'` explicitly.
- ✅ `react-confetti` dependency removed.

**Deferred** (out of scope for v1 — keep for a future polish-pass plan):

- ❌ Anchored small-win positioning (above payline / line / pocket). Would require surfaces to expose anchor refs through GameShell, breaking GameShell's role as orchestrator. Center-bottom suffices.
- ❌ Per-theme jackpot fanfare audio (8 new samples). Existing `playWin`/`playLose` reused.
- ❌ Per-theme jackpot voice samples. Reuse existing `playWin`.
- ❌ Per-theme jackpot threshold unification. Each game keeps its current rule (slots: 3-of-a-kind = jackpot; roulette: payout ≥ bet × 10 = jackpot; bingo: never jackpot — flat bet × 5 always small).
- ❌ Contextual loss hints ("Closest line was Row 2", "Landed on N (red), bet odd"). Loss copy is per-theme but generic; no game-state inspection.
- ❌ Continue button on jackpot overlay. Auto-dismiss + click-to-dismiss only.

## Settled brainstorming decisions

These resolved during brainstorming and should NOT be re-litigated when the plan is written or executed:

1. **Loss-tier wiring:** explicit union extension to `'jackpot' | 'small' | 'loss' | null`. Each hook calls `setWin('loss')` next to the existing `playLose` call. Single source of truth on the `win` discriminator.
2. **Jackpot threshold:** keep existing per-game rules. Plan 6 does not touch game logic.
3. **Particle medium:** per-theme emoji pool (6-8 emoji per theme) + 2-3 universal SVG primitives (sparkle, dot, arc) tinted to the theme accent. No per-theme SVG glyphs.
4. **Counter pacing:** locked universal — 600ms small / 1200ms jackpot. No per-theme override.
5. **Balance-pill animation:** the pill's number ticks in lockstep with the celebration counter (synchronised via shared duration). Strongest "where the money goes" read.
6. **Reduced motion:** strict — particles rendered as a static themed cluster (no motion), counter shows final value immediately, overlays/banners appear without entrance animation, audio still plays.
7. **ARIA-live:** add `aria-live="polite" role="status"` to GameShell's existing `<p>{props.message}</p>` line. Hooks already set `message` to a complete result string. Counter element is `aria-hidden`.
8. **Jackpot dismiss:** auto-dismiss after 5s + click-on-backdrop early-dismiss. No themed Continue button.
9. **Per-theme data layout:** sibling files per concern. New `src/utils/themeParticles.ts` (per-theme particle pool + motion params); new `src/utils/themeCopy.ts` (per-theme small/jackpotLabel/loss strings); existing `src/utils/themeManifesto.ts` extended only with a `wiggle: { duration_ms; magnitude_px }` numeric primitive for the loss shake.

---

## Section 1 — Architecture overview

```
src/
  components/Themed/
    ThemedCelebration.tsx        # entry point: switch on tier prop
    JackpotOverlay.tsx           # full-screen takeover (jackpot tier)
    SmallWinBanner.tsx           # center-bottom themed pill (small tier)
    LossPlate.tsx                # center-bottom themed plate + wiggle dispatch
    ParticleField.tsx            # generic Framer-Motion particle renderer
    WinAmountCounter.tsx         # animated counter, themed font
    particles/
      Sparkle.tsx, Dot.tsx, Arc.tsx   # 3 universal SVG primitives, theme-tintable
  contexts/
    CelebrationContext.tsx       # pendingTick: { delta, durationMs } | null
  utils/
    themeParticles.ts            # NEW — per-theme emoji pool + motion params
    themeCopy.ts                 # NEW — per-theme small/jackpotLabel/loss strings
    themeManifesto.ts            # EXTENDED — adds wiggle: { duration_ms, magnitude_px }
  hooks/
    useSlotsGame.ts              # EXTENDED — union 'jackpot'|'small'|'loss'|null
    useRouletteGame.ts           #          + lastPayout: number | null in return
    useBingoGame.ts              #          + setWin('loss') in else branch
  components/Games/
    GameShell.tsx                # EXTENDED — lastPayout prop, replaces inline overlays
    Slots.tsx, Roulette.tsx, Bingo.tsx   # EXTENDED — forward lastPayout to GameShell
  components/Layout/
    BalancePill.tsx              # EXTENDED — reads CelebrationContext for pacing override
  App.tsx                        # wraps in <CelebrationProvider>
package.json                     # react-confetti REMOVED
```

**Data flow on a winning spin:**

```
Slots/Roulette/Bingo hook.play()
  └─ setWin('jackpot' | 'small') + setLastPayout(payout) + setMessage(...)
       │
       ├─ Game component re-renders
       │   └─ <GameShell win=… lastPayout=… message=…>
       │        └─ <ThemedCelebration tier=win amount=lastPayout …>
       │             ├─ useEffect mount: setPendingTick({ delta: lastPayout, durationMs: 600|1200 })
       │             ├─ renders <JackpotOverlay> | <SmallWinBanner> | <LossPlate>
       │             │    ├─ <WinAmountCounter amount={lastPayout} tier={tier} />
       │             │    └─ <ParticleField pool=themeParticles[theme] count={40|10} />
       │             └─ useEffect cleanup: clearPendingTick()
       │
       └─ onUpdateBalance?.(payout) → App balance state updates
            └─ <BalancePill balance={newBalance}>
                 └─ reads CelebrationContext.pendingTick:
                    - non-null → tick over pendingTick.durationMs (sync'd with counter)
                    - null     → existing motion.durations.slow auto-anim
```

---

## Section 2 — Component contracts

### `ThemedCelebration.tsx`

Pure router. Switches on `tier`. Side-effect: pushes/clears `pendingTick` in `CelebrationContext`.

```tsx
interface Props {
  tier: 'jackpot' | 'small' | 'loss' | null;
  amount: number | null;        // payout; null when tier === null
  message: string | null;       // forwarded to a11y context (counter is aria-hidden)
  theme: ThemeType;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
}
```

When `tier === null`, renders nothing. When `tier === 'jackpot' | 'small' | 'loss'`, renders the matching sub-component. `useEffect` on `[tier, amount]` calls `setPendingTick({ delta: amount, durationMs: tier === 'jackpot' ? 1200 : 600 })` for jackpot/small (skipped for loss — no balance change). Cleanup calls `clearPendingTick()`.

### `JackpotOverlay.tsx`

```tsx
interface Props { amount: number; theme: ThemeType; onDismiss: () => void; }
```

Full-screen `fixed inset-0 z-40` overlay. Background: theme-accent gradient pulse (replaces today's `bg-black/70`). Contains:
- `<ParticleField pool=themeParticles[theme].pool primitives=themeParticles[theme].primitives count={40-60} motion=themeParticles[theme].motion />`
- `<div class={themeManifesto[theme].font + ' text-7xl text-theme-accent'}>{themeCopy[theme].jackpotLabel}</div>`
- `<WinAmountCounter amount={amount} tier="jackpot" theme={theme} />`

Behavior:
- Auto-dismiss timer (5000ms) → calls `onDismiss`.
- Click on backdrop (NOT child elements) → calls `onDismiss` (use `e.target === e.currentTarget` guard).
- Wraps in `<AnimatePresence mode="popLayout">` (per Plan 5 deviation precedent — `mode="wait"` deadlocks jsdom rerender tests).

### `SmallWinBanner.tsx`

```tsx
interface Props { amount: number; theme: ThemeType; }
```

Center-bottom pill (`fixed bottom-8 left-1/2 -translate-x-1/2`). Uses `themeManifesto[theme].surface` chrome class. Contents (rendered in sequence in a flex row):
1. Themed marker icon — `themeParticles[theme].pool[0]` (deterministic first emoji, NOT random — the same emoji appears every small win on a given theme).
2. `themeCopy[theme].small` text in `themeManifesto[theme].font`.
3. `<WinAmountCounter amount={amount} tier="small" theme={theme} />` (renders e.g. `+$30` after the counter ticks).

Behavior:
- Auto-dismiss after 3000ms (as spec).
- Doesn't block input — `pointer-events: none` on the wrapper, `pointer-events: auto` only on the pill itself (so player can still click the play button during the banner dwell).
- Wraps in `<AnimatePresence>`.

### `LossPlate.tsx`

```tsx
interface Props { theme: ThemeType; surfaceRef: React.RefObject<HTMLDivElement | null>; }
```

Center-bottom plate (similar positioning to small-win, less emphatic). Shows `themeCopy[theme].loss` text in `themeManifesto[theme].font`.

Behavior:
- On mount (and only when `useMotion().shouldAnimate`), dispatches a CSS shake to `surfaceRef.current`. Implementation:
  1. Set CSS custom properties on the element: `el.style.setProperty('--wiggle-duration', `${wiggle.duration_ms}ms`)` and `el.style.setProperty('--wiggle-magnitude', `${wiggle.magnitude_px}px`)`.
  2. Add a generic `wiggle-active` class whose keyframes (defined once in `src/index.css`) shake `transform: translateX(...)` between `±var(--wiggle-magnitude)` over `var(--wiggle-duration)`.
  3. After `wiggle.duration_ms`, remove the class and clear the inline custom props via a `setTimeout` cleared in `useEffect` cleanup.
- Auto-dismiss after 2000ms.
- Audio (`playLose`) is already triggered by the hook — no audio call here.

### `ParticleField.tsx`

```tsx
interface Props {
  pool: string[];                              // emoji glyphs
  primitives: ('sparkle' | 'dot' | 'arc')[];   // SVG primitives mixed in
  primitiveTint?: string;                      // CSS color for SVG primitives
  count: number;                               // 8-12 small, 40-60 jackpot
  motion: ParticleMotion;
}
```

Generic Framer-Motion renderer. Spawns `count` items, each picking uniformly at random from the combined pool. The combined pool is built once on mount as `[...pool, ...primitives.map(name => <SVGPrimitive name={name} color={primitiveTint} />)]` (mixing emoji strings and React elements; the renderer handles both).

Each particle: initial position centered on the field; initial velocity randomized within `motion.velocityRange`; motion applies `motion.gravity` over `motion.lifetimeMs` (also randomized). Optional rotation via `motion.rotation.degPerSec`.

Reduced-motion is determined INTERNALLY via `useMotion().shouldAnimate` — consumers do NOT pass a `reduced` prop. When false: renders particles in a deterministic fan/arc layout (radial spread around a center point), no `animate` props, no lifetime — visible until parent unmounts.

### `WinAmountCounter.tsx`

```tsx
interface Props { amount: number; tier: 'jackpot' | 'small'; theme: ThemeType; }
```

Renders `$0` → `$amount` over `tier === 'jackpot' ? 1200 : 600` ms with cubic ease-out (`1 - (1-t)^3`, matches BalancePill's easing for visual lockstep). Uses `themeManifesto[theme].font` + a theme accent color class.

When `useMotion().shouldAnimate === false`: renders the final `$amount` immediately, no tick.

Has `aria-hidden="true"` — announcement happens on the GameShell message line.

### `particles/Sparkle.tsx`, `Dot.tsx`, `Arc.tsx`

Each: `{ color?: string; size?: number }` (defaults: `currentColor`, `12`). Tiny SVG glyphs (~10 lines of JSX each). `color` defaults to `currentColor` so they inherit theme accent from the wrapper's `style={{ color: primitiveTint }}`.

---

## Section 3 — Data layer

### `src/utils/themeParticles.ts` (new)

```ts
import type { ThemeType } from './themeManifesto';

export interface ParticleMotion {
  velocityRange: { x: [number, number]; y: [number, number] }; // px/s, signed
  gravity: number;                                              // px/s^2 (down positive)
  lifetimeMs: [number, number];                                 // [min, max], randomized
  rotation?: { degPerSec: number };
}

export interface ParticleDefinition {
  pool: string[];                                  // 6-8 themed emoji
  primitives: ('sparkle' | 'dot' | 'arc')[];       // 0-3 universal SVG primitives
  primitiveTint?: string;                          // CSS color (e.g. 'var(--theme-accent)')
  motion: ParticleMotion;
}

export const themeParticles: Record<ThemeType, ParticleDefinition> = {
  sweets:  { pool: ['🍬','🍭','🧁','🍩','🍪','🍯'],     primitives: ['sparkle','dot'], primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-700,-400]}, gravity: 900, lifetimeMs: [1200,1800], rotation: {degPerSec:360} } },
  egypt:   { pool: ['𓂀','⚱️','🐍','📜','🌅','✨'],      primitives: ['sparkle'],       primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-500,-200]}, gravity: 600, lifetimeMs: [1500,2200], rotation: {degPerSec:90} } },
  space:   { pool: ['✨','🪐','🌠','🚀','⭐','🌌'],       primitives: ['sparkle','dot','arc'], primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-300]}, gravity: 200, lifetimeMs: [1800,2500], rotation: {degPerSec:180} } },
  west:    { pool: ['🤠','🌵','💰','🐎','🌾','🔫'],      primitives: ['dot'],            primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-350,350],y:[-500,-200]}, gravity: 800, lifetimeMs: [1300,1900], rotation: {degPerSec:120} } },
  ocean:   { pool: ['🐚','🐠','💎','🌊','🪸','🫧'],      primitives: ['arc','dot'],     primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-400,-100]}, gravity: 300, lifetimeMs: [2000,2800], rotation: {degPerSec:60} } },
  jungle:  { pool: ['🦜','🦋','🌺','🍃','🌴','🐒'],      primitives: ['dot'],           primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-500,-200]}, gravity: 500, lifetimeMs: [1600,2200], rotation: {degPerSec:90} } },
  vampire: { pool: ['🦇','🩸','🌙','🕷️','⚰️','🥀'],     primitives: ['dot'],           primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-200]}, gravity: 400, lifetimeMs: [1800,2400], rotation: {degPerSec:240} } },
  ninja:   { pool: ['🌸','⚔️','🍃','🏯','🎋','🌑'],      primitives: ['arc'],           primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-250,250],y:[-500,-200]}, gravity: 350, lifetimeMs: [1700,2400], rotation: {degPerSec:45} } },
};
```

(Final emoji selections + motion tuning are implementation work — shape is locked.)

### `src/utils/themeCopy.ts` (new)

```ts
import type { ThemeType } from './themeManifesto';

export interface CelebrationCopy {
  small: string;          // small-win banner message
  jackpotLabel: string;   // big jackpot label
  loss: string;           // loss plate message
}

export const themeCopy: Record<ThemeType, CelebrationCopy> = {
  sweets:  { small: 'Sweet match!',     jackpotLabel: 'CANDY JACKPOT!',     loss: 'Empty wrapper.' },
  egypt:   { small: 'Pharaoh smiles.',  jackpotLabel: "PHARAOH'S BOUNTY!",  loss: "Tomb's silence." },
  space:   { small: 'Stars align!',     jackpotLabel: 'COSMIC JACKPOT!',    loss: 'Stars misaligned.' },
  west:    { small: 'Yeehaw!',          jackpotLabel: 'YEEHAW JACKPOT!',    loss: 'Tumbleweed rolls.' },
  ocean:   { small: 'Tide rises!',      jackpotLabel: 'TREASURE JACKPOT!',  loss: 'Empty net.' },
  jungle:  { small: 'Jungle calls!',    jackpotLabel: 'JUNGLE JACKPOT!',    loss: 'Silence in the canopy.' },
  vampire: { small: 'Blood pact.',      jackpotLabel: 'CURSED FORTUNE!',    loss: 'The night is empty.' },
  ninja:   { small: 'Honor rewarded.',  jackpotLabel: 'SHOGUN JACKPOT!',    loss: 'Patience, grasshopper.' },
};
```

(Final copy strings to be polished during implementation; per-game copy variants intentionally omitted from v1 to keep scope tight.)

### `src/utils/themeManifesto.ts` (extension only)

Add a `Wiggle` interface and `wiggle` field to the existing `Manifesto` interface and to each of the 8 theme entries:

```ts
export interface Wiggle { duration_ms: number; magnitude_px: number; }

export interface Manifesto {
  // ...existing fields unchanged...
  wiggle: Wiggle;     // NEW
}

// Per-theme additions (rough first values; tune in implementation):
sweets:  { ..., wiggle: { duration_ms: 300, magnitude_px: 4 } },     // soft jelly
egypt:   { ..., wiggle: { duration_ms: 250, magnitude_px: 3 } },     // dust
space:   { ..., wiggle: { duration_ms: 200, magnitude_px: 4 } },     // void glitch
west:    { ..., wiggle: { duration_ms: 350, magnitude_px: 5 } },     // wagon jostle
ocean:   { ..., wiggle: { duration_ms: 400, magnitude_px: 3 } },     // gentle swell
jungle:  { ..., wiggle: { duration_ms: 300, magnitude_px: 4 } },     // leaf rustle
vampire: { ..., wiggle: { duration_ms: 400, magnitude_px: 6 } },     // judder
ninja:   { ..., wiggle: { duration_ms: 150, magnitude_px: 5 } },     // sharp jolt
```

---

## Section 4 — Hook + GameShell + Context wiring

### Game hooks (3 files)

`useSlotsGame`, `useRouletteGame`, `useBingoGame` — each receives the same shape of changes:

1. **Extend the union:**
   ```ts
   const [win, setWin] = useState<'jackpot' | 'small' | 'loss' | null>(null);
   ```
   Update the exposed return type accordingly.

2. **Add `lastPayout` state:**
   ```ts
   const [lastPayout, setLastPayout] = useState<number | null>(null);
   ```

3. **Reset on play start** (next to existing `setWin(null)`):
   ```ts
   setWin(null);
   setLastPayout(null);
   ```

4. **Set on win sites:**
   ```ts
   setWin('jackpot'); setLastPayout(payout);  // or 'small'
   ```

5. **NEW — set on loss sites** (next to existing `playLose`):
   ```ts
   setWin('loss'); setLastPayout(0);
   ```

6. **Return `lastPayout`** in the result object.

Bingo's `else` branch (currently only sets `setMessage('No bingo this round.')`) needs `setWin('loss')` + `setLastPayout(0)` added.

### `GameShell.tsx`

- Extend `GameShellProps`:
  ```ts
  win: 'jackpot' | 'small' | 'loss' | null;     // EXTENDED union
  lastPayout: number | null;                    // NEW
  ```
- Add `const surfaceRef = useRef<HTMLDivElement>(null)` and attach to the existing `<div class="flex-1 flex flex-col bg-black/30 backdrop-blur-sm p-6">` wrapper (line 76).
- Replace lines 99-121 (the two inline `<AnimatePresence>` blocks for jackpot + small) with one call:
  ```tsx
  <ThemedCelebration tier={props.win} amount={props.lastPayout} message={props.message} theme={props.theme} surfaceRef={surfaceRef} />
  ```
- Add ARIA to existing message line (was line 96):
  ```tsx
  {props.message && <p aria-live="polite" role="status" className="text-center text-sm opacity-90">{props.message}</p>}
  ```
- Remove `import Confetti from 'react-confetti'`.

### `Slots.tsx`, `Roulette.tsx`, `Bingo.tsx`

Each forwards the new `lastPayout` from its hook into the GameShell call — single new line per file.

### `CelebrationContext.tsx` (new)

Pure clone of `AudioControlsContext` shape:

```ts
interface PendingTick { delta: number; durationMs: number; }

export interface Celebration {
  pendingTick: PendingTick | null;
  setPendingTick: (t: PendingTick) => void;
  clearPendingTick: () => void;
}

const CelebrationContext = createContext<Celebration | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [pendingTick, setPendingTick] = useState<PendingTick | null>(null);
  const value = useMemo(() => ({
    pendingTick,
    setPendingTick: (t: PendingTick) => setPendingTick(t),
    clearPendingTick: () => setPendingTick(null),
  }), [pendingTick]);
  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}

export function useCelebration(): Celebration {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within a CelebrationProvider');
  return ctx;
}
```

Wrap at the same level as `AudioControlsProvider` in `App.tsx` (sibling, not nested in either order).

### `BalancePill.tsx`

Read `useCelebration().pendingTick`. Augment the existing `useEffect` so:

- When `pendingTick !== null` AND `balance > previousRef.current`: tick over `pendingTick.durationMs` (instead of `motion.durations.slow`). Otherwise fall through to current behavior.
- The existing `if (balance <= previous || !motion.shouldAnimate) { setDisplayed(balance); return; }` early-return is preserved.
- The existing `aria-live` sr-only span (line 44) is untouched.

---

## Section 5 — A11y, reduced motion, and cleanup

### ARIA

- GameShell `<p>{props.message}</p>` gets `aria-live="polite" role="status"`. Hooks already set `message` to a complete result string ("JACKPOT! +500", "Won 500!", "No bingo this round."), so no copy changes are needed.
- `WinAmountCounter` has `aria-hidden="true"` (counter ticks are NOT announced).
- `ParticleField` wrapper has `aria-hidden="true"` (decorative).
- `LossPlate`, `SmallWinBanner`, `JackpotOverlay` containers have `aria-hidden="true"` (the announcement comes from the message line; these are decorative).
- Existing `BalancePill` sr-only span (line 44) untouched.

### Reduced motion (gated via existing `useMotion().shouldAnimate`)

| Component             | When `shouldAnimate === false`                                            |
|-----------------------|---------------------------------------------------------------------------|
| `ParticleField`       | Render particles in a static fan/arc layout, no Framer-Motion `animate`. |
| `WinAmountCounter`    | Render final `amount` immediately, no tick.                               |
| `JackpotOverlay`      | Appears immediately (no scale/fade-in), no gradient pulse.                |
| `SmallWinBanner`      | Appears immediately (no slide-up).                                        |
| `LossPlate`           | Appears immediately. Surface wiggle SKIPPED.                              |
| Audio (`playWin`/`playLose`) | Plays in both modes — sound is not motion.                         |
| `BalancePill`         | Existing `if (!motion.shouldAnimate) setDisplayed(balance); return;` early-return preserved. The `pendingTick` override path is still gated by `motion.shouldAnimate`. |

### Dependency cleanup

- `npm uninstall react-confetti`.
- Remove `import Confetti from 'react-confetti'` from `GameShell.tsx`.
- Verify no other consumers via `grep -r "react-confetti" src` (expected: zero matches).
- `package.json` and `package-lock.json` updated.

---

## Section 6 — Testing strategy

### New unit tests (vitest, jsdom)

- `ThemedCelebration.test.tsx` — renders correct sub-component for each tier; calls `setPendingTick` on mount with correct durationMs (1200 vs 600); calls `clearPendingTick` on unmount; renders nothing when tier is null; does NOT push pendingTick for loss tier.
- `JackpotOverlay.test.tsx` — auto-dismisses after 5000ms (use `vi.useFakeTimers()`); click on backdrop dismisses early; click on child element does NOT dismiss; renders themed jackpotLabel from `themeCopy`.
- `SmallWinBanner.test.tsx` — auto-dismisses after 3000ms; renders themed `small` copy; renders `WinAmountCounter` with `tier="small"`.
- `LossPlate.test.tsx` — applies wiggle class to surfaceRef on mount when `shouldAnimate`; skips wiggle when `!shouldAnimate`; auto-dismisses after 2000ms; removes wiggle class after `wiggle.duration_ms`.
- `ParticleField.test.tsx` — renders `count` children with `motion.div` wrappers when `useMotion()` returns `shouldAnimate: true`; renders static layout (no `animate` props) when `shouldAnimate: false` (test mocks `useMotion`); mixes emoji from `pool` and primitives from `primitives`.
- `WinAmountCounter.test.tsx` — animates from 0 to amount over 600ms (small) or 1200ms (jackpot) using fake timers + RAF mock; renders final value immediately when `!shouldAnimate`; has `aria-hidden`.
- `themeParticles.test.ts` — every `ThemeType` has a non-empty entry; each pool has ≥6 emoji; motion params are within sensible ranges.
- `themeCopy.test.ts` — every `ThemeType` has all three string fields, all non-empty.
- `CelebrationContext.test.tsx` — provider exposes setPendingTick + clearPendingTick; hook throws when used outside provider.

### Hook test extensions (existing files)

- Each of `useSlotsGame.test.ts`, `useRouletteGame.test.ts`, `useBingoGame.test.ts`:
  - Add `lastPayout` assertions after win/loss outcomes.
  - Add a loss-branch test asserting `setWin('loss')` AND `lastPayout === 0`.
  - Existing tests should continue to pass without modification (just the union widening).

### `GameShell` test extensions

- Existing tests keep passing.
- New test asserts `aria-live="polite"` + `role="status"` on the message line.
- New test asserts the inline jackpot/small `AnimatePresence` blocks are gone (no `text=JACKPOT!` rendered directly by GameShell).

### `BalancePill` test extension

- Wrap in `<CelebrationProvider>` with a stubbed pendingTick value. Assert displayed value finishes ticking within `pendingTick.durationMs` (not `motion.durations.slow`). Use fake timers + RAF mock.

### Out of test scope

- No Playwright / E2E. Vitest jsdom is sufficient. Manual browser-pass after deploy per Plan 5 pattern.
- Visual regression (per-theme particle field appearance) is not automated — the manual browser-pass walks all 8 themes.

### Estimated final count

- Currently: 372 tests across 60 files.
- Plan 6 adds: ~28-35 new tests (9 new test files + extensions).
- Expected final: ~400-410 tests across ~69 files.

---

## Section 7 — Out of scope

The deferred items from the brainstorming scope question are listed in the Scope section above. Additionally, these are explicitly NOT part of Plan 6 v1:

- Per-game copy variants (Slots vs Roulette vs Bingo with different small/jackpot/loss strings within the same theme). Single per-theme copy is enough.
- A `WinAmountCounter` story / Storybook entry (no Storybook in this codebase).
- Internationalization of copy strings (no i18n infrastructure exists).
- Server-driven celebration content (e.g., a Gemini-generated jackpot voice line per theme). Defer to a future audio-asset plan.

---

## Section 8 — Open questions

None at the time of writing — all clarifying questions resolved during brainstorming. If anything ambiguous surfaces during plan-writing, the implementer should propose a default and call it out for review.

---

## Section 9 — Implementation cadence

Plan 5 (Bingo surface) was successfully executed using `superpowers:subagent-driven-development` (one implementer + one spec reviewer + one code-quality reviewer per task). Plan 6 should follow the same pattern. Estimated 12-14 commits, each landing one small slice (atom or wiring), with the hook + context + GameShell wiring tasks coming first to establish the data plumbing, then the per-tier UI components, then cleanup. The full task breakdown is the job of the writing-plans pass.
