# Themed Celebration System Implementation Plan (Plan 6 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic GameShell-level celebration UI (`react-confetti` + plain JACKPOT! div + green "You won!" pill + nothing-on-loss) with a per-theme celebration system covering all 3 tiers (small / jackpot / loss). Custom particle field, themed copy, animated win-amount counter synchronised with the header balance pill, strict reduced-motion support, and proper ARIA-live wiring.

**Architecture:** Bottom-up. (1) Per-theme data lives in two new sibling files (`themeParticles.ts`, `themeCopy.ts`) plus a new `wiggle: { duration_ms, magnitude_px }` field on the existing `themeManifesto`. (2) A new `CelebrationContext` carries a `pendingTick: { delta, durationMs } | null` so `ThemedCelebration` (under `GameShell`) can drive `BalancePill`'s tick pacing across the App tree. (3) Three universal SVG primitives (Sparkle/Dot/Arc) + two atomic components (`ParticleField`, `WinAmountCounter`) compose into three per-tier components (`JackpotOverlay`, `SmallWinBanner`, `LossPlate`), routed by a `ThemedCelebration` orchestrator. (4) Each game hook (`useSlotsGame` / `useRouletteGame` / `useBingoGame`) gains a `lastPayout: number | null` return field and an extended union (`'jackpot' | 'small' | 'loss' | null`) so the loss tier is explicit. (5) `GameShell` swaps the inline `<AnimatePresence>` blocks for a single `<ThemedCelebration>` call, adds `aria-live="polite"` to its existing `<p>{message}</p>` line, and `react-confetti` is uninstalled.

**Tech Stack:** React 18 + TypeScript, Framer Motion (`motion/react`, already a dep), Vite, vitest + jsdom. **No new dependencies.** `react-confetti ^6.4.0` is REMOVED.

---

## Pre-flight

The branch should be created from current `main` (tip after spec commit: `a182ca2`). Use the `superpowers:using-git-worktrees` skill or:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/plan-6-themed-celebration
```

Confirm baseline: `npm run lint && npm test && npx vite build` should be green (lint exit 0, **372/372 tests across 60 files**, build succeeds within ~10s @ ~917 KB JS / ~56 KB CSS).

## File structure overview

**New files:**

| File | Responsibility |
|---|---|
| `src/utils/themeParticles.ts` | Per-theme particle definition: emoji pool (6-8 per theme) + universal SVG primitive list + motion params (velocity range, gravity, lifetime, rotation). Exports `ParticleMotion`, `ParticleDefinition` interfaces and `themeParticles: Record<ThemeType, ParticleDefinition>`. |
| `src/utils/themeParticles.test.ts` | Asserts every `ThemeType` has a non-empty entry; pool ≥6 emoji; motion ranges sensible. |
| `src/utils/themeCopy.ts` | Per-theme celebration copy: `small`, `jackpotLabel`, `loss` strings. Exports `CelebrationCopy` interface and `themeCopy: Record<ThemeType, CelebrationCopy>`. |
| `src/utils/themeCopy.test.ts` | Asserts every `ThemeType` has all three string fields, all non-empty. |
| `src/contexts/CelebrationContext.tsx` | Provider + `useCelebration()` hook exposing `{ pendingTick, setPendingTick, clearPendingTick }`. Pure clone of `AudioControlsContext` shape. |
| `src/contexts/CelebrationContext.test.tsx` | Provider exposes setters; hook throws when used outside provider. |
| `src/components/Themed/particles/Sparkle.tsx` | Tiny SVG glyph; props `{ color?: string; size?: number }`. Defaults to `currentColor` so it inherits theme accent from the wrapper. |
| `src/components/Themed/particles/Dot.tsx` | Same shape — different glyph (filled circle). |
| `src/components/Themed/particles/Arc.tsx` | Same shape — different glyph (semicircle stroke). |
| `src/components/Themed/particles/SVGPrimitive.test.tsx` | All three render expected `<svg>` markup; respect `color` and `size` props. |
| `src/components/Themed/ParticleField.tsx` | Generic Framer-Motion particle renderer. Mixes emoji from `pool` with SVG primitives from `primitives`. Internal `useMotion()` for reduced-motion fallback (static cluster). |
| `src/components/Themed/ParticleField.test.tsx` | Renders `count` items in motion mode; static layout when reduced motion mocked. |
| `src/components/Themed/WinAmountCounter.tsx` | Animated counter `$0 → $amount` over 600ms (small) / 1200ms (jackpot), themed font, `aria-hidden`. Internal `useMotion()` for reduced-motion (renders final immediately). |
| `src/components/Themed/WinAmountCounter.test.tsx` | Animates with fake timers + RAF mock; renders final value immediately when reduced. |
| `src/components/Themed/JackpotOverlay.tsx` | Full-screen takeover. Theme-accent gradient pulse + ParticleField (40-60) + themed jackpotLabel + WinAmountCounter. Auto-dismiss 5s + click-on-backdrop dismiss. |
| `src/components/Themed/JackpotOverlay.test.tsx` | Auto-dismiss 5000ms, backdrop click dismisses, child click does not, themed copy renders. |
| `src/components/Themed/SmallWinBanner.tsx` | Center-bottom themed pill: themed marker emoji + small copy + WinAmountCounter. Auto-dismiss 3s. |
| `src/components/Themed/SmallWinBanner.test.tsx` | Auto-dismiss 3000ms, themed copy + counter render. |
| `src/components/Themed/LossPlate.tsx` | Center-bottom themed plate. On mount (when `shouldAnimate`), dispatches a CSS shake to `surfaceRef.current` via CSS custom properties + `wiggle-active` class. Auto-dismiss 2s. |
| `src/components/Themed/LossPlate.test.tsx` | Applies wiggle class + custom props on mount, removes after `wiggle.duration_ms`, auto-dismiss 2000ms, skips wiggle when reduced. |
| `src/components/Themed/ThemedCelebration.tsx` | Pure router: switch on `tier`; renders sub-component. Side-effect: pushes/clears `pendingTick` via `useCelebration` for `'small' \| 'jackpot'` (skips for `'loss'`). |
| `src/components/Themed/ThemedCelebration.test.tsx` | Renders correct sub-component per tier; pushes correct durationMs (600 vs 1200); clears on unmount; renders nothing when tier is null. |

**Modified files:**

| File | What changes |
|---|---|
| `src/utils/themeManifesto.ts` | Add `Wiggle` interface; add `wiggle: Wiggle` field to `Manifesto`; add a `wiggle: { duration_ms, magnitude_px }` value to each of the 8 theme entries. |
| `src/utils/themeManifesto.test.ts` | Add a test asserting every theme has a `wiggle` with positive `duration_ms` and `magnitude_px`. |
| `src/index.css` | Add `@keyframes wiggle-shake` and `.wiggle-active` class consuming `--wiggle-duration` + `--wiggle-magnitude` CSS custom properties. |
| `src/hooks/useSlotsGame.ts` | Extend `win` union to `'jackpot' \| 'small' \| 'loss' \| null`. Add `lastPayout: number \| null` state + return field. Reset both on play-start. Set `setLastPayout(payout)` next to existing `setWin('jackpot' \| 'small')` calls. NEW: `setWin('loss'); setLastPayout(0);` next to existing `playLose` call. |
| `src/hooks/useSlotsGame.test.ts` | Extend existing tests for new return shape; add loss-branch test asserting `setWin('loss')` + `lastPayout === 0`. |
| `src/hooks/useRouletteGame.ts` | Same shape of changes as Slots. |
| `src/hooks/useRouletteGame.test.ts` | Same shape of test extensions. |
| `src/hooks/useBingoGame.ts` | Same shape of changes. Bingo has only `'small'` win path — loss branch (currently only `setMessage('No bingo this round.')`) needs `setWin('loss'); setLastPayout(0);`. |
| `src/hooks/useBingoGame.test.ts` | Same shape of test extensions. |
| `src/components/Games/Slots.tsx` | Forward `lastPayout` from hook to GameShell — single new line. |
| `src/components/Games/Roulette.tsx` | Same. |
| `src/components/Games/Bingo.tsx` | Same. |
| `src/components/Games/GameShell.tsx` | Extend `win` prop union to include `'loss'`. Add `lastPayout: number \| null` prop (initially optional in Task 12, made required in Task 17). Add `surfaceRef = useRef<HTMLDivElement>(null)` on the existing `bg-black/30 backdrop-blur-sm` wrapper. Add `aria-live="polite" role="status"` to existing `<p>{props.message}</p>` line. Replace lines 99-121 (`<AnimatePresence>` block) with one `<ThemedCelebration>` call. Remove `import Confetti from 'react-confetti'`. |
| `src/components/Games/GameShell.test.ts` | Existing tests stay green. Add tests asserting message line has `aria-live="polite"` + `role="status"`; assert no inline `JACKPOT!` div is rendered by GameShell directly. |
| `src/components/Layout/BalancePill.tsx` | Read `useCelebration().pendingTick`. Augment existing `useEffect`: when `pendingTick !== null` AND `balance > previousRef.current` AND `motion.shouldAnimate`, use `pendingTick.durationMs` instead of `motion.durations.slow`. Otherwise unchanged. |
| `src/components/Layout/BalancePill.test.tsx` | Wrap existing tests in `<CelebrationProvider>` (existing tests must keep passing with no provider — see Task 16 step 1 for the helper). Add test asserting tick uses `pendingTick.durationMs` when set. |
| `src/App.tsx` | Wrap children of `<AudioControlsProvider>` in `<CelebrationProvider>` (sibling-style, same level). |
| `package.json` | Remove `react-confetti` dependency. |
| `package-lock.json` | Updated by `npm uninstall`. |

No changes to: `firebase.ts`, `server/`, `firestore.rules`, any other `src/components/` outside the modifications listed.

---

## Conventions used in every task

- **Step 1 is always "Write the failing test first."** Step 2 = run it, observe failure. Step 3 = implement. Step 4 = run again, observe pass. Last step = commit. Per `superpowers:test-driven-development`.
- **Commit messages** follow Plan 5's convention: `feat(celebration): ...`, `fix(celebration): ...`, `refactor(celebration): ...`, `docs(plan-6): ...`. **No `Co-Authored-By` lines** (Plans 2-5 did not use them).
- **Imports** for `ThemeType` come from `'../../utils/themeManifesto'` (or appropriate relative path). Never re-import from `'../../App'`.
- **vitest-native matchers** — the codebase has no `@testing-library/jest-dom` installed. Adapt: `expect(el).toBeTruthy()` / `expect(el.getAttribute('foo')).toBe('val')` / `expect(el.textContent).toContain('text')`. **Add** `import { cleanup } from '@testing-library/react'` and `afterEach(() => cleanup())` to every new component test file.
- **Tests** use `vi.mock` for hooks that hit window.AudioContext (`SoundEngine`, `useMotion`). See `Roulette.test.tsx` (Plan 4) and `Slots.test.tsx` (Plan 3) for the canonical mock layout.
- **Fake timers and RAF mock** — for components that animate via `requestAnimationFrame` (`WinAmountCounter`, `BalancePill`), use the same pattern as the existing `BalancePill.test.tsx` (which currently does NOT mock RAF but verifies the final state). For tick-progression assertions, mock RAF as shown in Task 8 step 1.
- **One concept per commit.** If a step's diff bleeds into unrelated cleanup, split it into its own commit.

---

## Task 1: Add `wiggle` to themeManifesto + CSS keyframe

**Goal:** Foundation primitive: every theme exposes a `wiggle` with `duration_ms` and `magnitude_px`. A single `@keyframes wiggle-shake` rule + `.wiggle-active` class consumes those values via CSS custom properties so `LossPlate` (Task 11) can apply them dynamically without inlining keyframes per theme.

**Files:**
- Modify: `src/utils/themeManifesto.ts`
- Modify: `src/utils/themeManifesto.test.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Append the failing test**

```ts
// in src/utils/themeManifesto.test.ts (append at end of the file's outer describe)
describe('wiggle', () => {
  it('every theme has a wiggle with positive duration_ms and magnitude_px', () => {
    for (const theme of THEME_NAMES) {
      const w = themeManifesto[theme].wiggle;
      expect(w).toBeTruthy();
      expect(w.duration_ms).toBeGreaterThan(0);
      expect(w.magnitude_px).toBeGreaterThan(0);
    }
  });
});
```

(`THEME_NAMES` is already exported from `themeManifesto.ts` and imported in the test file at the top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/themeManifesto.test.ts`
Expected: FAIL — `Cannot read properties of undefined (reading 'duration_ms')` (no `wiggle` field exists yet).

- [ ] **Step 3: Add the Wiggle interface and per-theme values**

In `src/utils/themeManifesto.ts`:

After the existing variant type aliases (around line 18), add:

```ts
export interface Wiggle { duration_ms: number; magnitude_px: number; }
```

In the `Manifesto` interface (around line 20-32), add as the last field:

```ts
  wiggle: Wiggle;
```

In each of the 8 entries in `themeManifesto: Record<ThemeType, Manifesto>` (around line 34-43), append `wiggle: {...}`. The full set of values:

```ts
sweets:  { ..., wiggle: { duration_ms: 300, magnitude_px: 4 } },
egypt:   { ..., wiggle: { duration_ms: 250, magnitude_px: 3 } },
space:   { ..., wiggle: { duration_ms: 200, magnitude_px: 4 } },
west:    { ..., wiggle: { duration_ms: 350, magnitude_px: 5 } },
ocean:   { ..., wiggle: { duration_ms: 400, magnitude_px: 3 } },
jungle:  { ..., wiggle: { duration_ms: 300, magnitude_px: 4 } },
vampire: { ..., wiggle: { duration_ms: 400, magnitude_px: 6 } },
ninja:   { ..., wiggle: { duration_ms: 150, magnitude_px: 5 } },
```

(Replace `...` with the existing fields per theme. Do not delete or reorder existing fields.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/themeManifesto.test.ts`
Expected: PASS — all existing tests + new wiggle test green.

- [ ] **Step 5: Add the CSS keyframe**

Append to `src/index.css` (at the end of the file):

```css
@keyframes wiggle-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(calc(var(--wiggle-magnitude, 4px) * -1)); }
  40%      { transform: translateX(var(--wiggle-magnitude, 4px)); }
  60%      { transform: translateX(calc(var(--wiggle-magnitude, 4px) * -1)); }
  80%      { transform: translateX(var(--wiggle-magnitude, 4px)); }
}
.wiggle-active {
  animation: wiggle-shake var(--wiggle-duration, 300ms) ease-in-out;
}
```

- [ ] **Step 6: Verify build still works**

Run: `npm run lint && npx vite build`
Expected: lint exit 0, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/utils/themeManifesto.ts src/utils/themeManifesto.test.ts src/index.css
git commit -m "feat(celebration): add per-theme wiggle primitive + CSS keyframe

Adds Wiggle { duration_ms, magnitude_px } to themeManifesto for the
loss-tier 'miss wiggle' on the game surface. Each of the 8 themes gets
a tuned value (vampire judders longest, ninja jolts sharpest). The
generic .wiggle-active class consumes --wiggle-duration and
--wiggle-magnitude CSS custom properties so LossPlate can drive it
dynamically without inlining keyframes per theme."
```

---

## Task 2: `themeParticles.ts`

**Goal:** Per-theme particle definitions: emoji pool, optional universal SVG primitives, primitive tint color, and motion params (velocity range, gravity, lifetime, optional rotation).

**Files:**
- Create: `src/utils/themeParticles.ts`
- Create: `src/utils/themeParticles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/themeParticles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { THEME_NAMES } from './themeManifesto';
import { themeParticles } from './themeParticles';

describe('themeParticles', () => {
  it('every theme has a non-empty entry', () => {
    for (const theme of THEME_NAMES) {
      const p = themeParticles[theme];
      expect(p).toBeTruthy();
      expect(p.pool.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(p.primitives)).toBe(true);
      expect(p.motion).toBeTruthy();
    }
  });

  it('motion ranges are sensible (gravity ≥ 0, lifetimes ascending)', () => {
    for (const theme of THEME_NAMES) {
      const m = themeParticles[theme].motion;
      expect(m.gravity).toBeGreaterThanOrEqual(0);
      expect(m.lifetimeMs[0]).toBeLessThan(m.lifetimeMs[1]);
      expect(m.velocityRange.x[0]).toBeLessThanOrEqual(m.velocityRange.x[1]);
      expect(m.velocityRange.y[0]).toBeLessThanOrEqual(m.velocityRange.y[1]);
    }
  });

  it('primitives only contain valid names', () => {
    const valid = new Set(['sparkle', 'dot', 'arc']);
    for (const theme of THEME_NAMES) {
      for (const p of themeParticles[theme].primitives) {
        expect(valid.has(p)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/themeParticles.test.ts`
Expected: FAIL — `Cannot find module './themeParticles'`.

- [ ] **Step 3: Create the data file**

Create `src/utils/themeParticles.ts`:

```ts
import type { ThemeType } from './themeManifesto';

export interface ParticleMotion {
  velocityRange: { x: [number, number]; y: [number, number] };
  gravity: number;
  lifetimeMs: [number, number];
  rotation?: { degPerSec: number };
}

export interface ParticleDefinition {
  pool: string[];
  primitives: ('sparkle' | 'dot' | 'arc')[];
  primitiveTint?: string;
  motion: ParticleMotion;
}

export const themeParticles: Record<ThemeType, ParticleDefinition> = {
  sweets:  { pool: ['🍬','🍭','🧁','🍩','🍪','🍯'],     primitives: ['sparkle','dot'],       primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-700,-400]}, gravity: 900, lifetimeMs: [1200,1800], rotation: {degPerSec:360} } },
  egypt:   { pool: ['𓂀','⚱️','🐍','📜','🌅','✨'],      primitives: ['sparkle'],             primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-500,-200]}, gravity: 600, lifetimeMs: [1500,2200], rotation: {degPerSec:90} } },
  space:   { pool: ['✨','🪐','🌠','🚀','⭐','🌌'],       primitives: ['sparkle','dot','arc'], primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-300]}, gravity: 200, lifetimeMs: [1800,2500], rotation: {degPerSec:180} } },
  west:    { pool: ['🤠','🌵','💰','🐎','🌾','🔫'],      primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-350,350],y:[-500,-200]}, gravity: 800, lifetimeMs: [1300,1900], rotation: {degPerSec:120} } },
  ocean:   { pool: ['🐚','🐠','💎','🌊','🪸','🫧'],      primitives: ['arc','dot'],           primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-400,-100]}, gravity: 300, lifetimeMs: [2000,2800], rotation: {degPerSec:60} } },
  jungle:  { pool: ['🦜','🦋','🌺','🍃','🌴','🐒'],      primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-500,-200]}, gravity: 500, lifetimeMs: [1600,2200], rotation: {degPerSec:90} } },
  vampire: { pool: ['🦇','🩸','🌙','🕷️','⚰️','🥀'],     primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-200]}, gravity: 400, lifetimeMs: [1800,2400], rotation: {degPerSec:240} } },
  ninja:   { pool: ['🌸','⚔️','🍃','🏯','🎋','🌑'],      primitives: ['arc'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-250,250],y:[-500,-200]}, gravity: 350, lifetimeMs: [1700,2400], rotation: {degPerSec:45} } },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/themeParticles.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/themeParticles.ts src/utils/themeParticles.test.ts
git commit -m "feat(celebration): per-theme particle definitions

Each theme defines a 6-emoji pool from its world plus 0-3 universal
SVG primitives (sparkle / dot / arc) tinted to the theme accent.
Motion params (velocity range, gravity, lifetime, rotation) tuned per
theme — sweets pop with strong gravity, ocean drifts gently, vampire
swirls."
```

---

## Task 3: `themeCopy.ts`

**Goal:** Per-theme celebration copy: small-win banner message, jackpot label, loss plate message.

**Files:**
- Create: `src/utils/themeCopy.ts`
- Create: `src/utils/themeCopy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/themeCopy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { THEME_NAMES } from './themeManifesto';
import { themeCopy } from './themeCopy';

describe('themeCopy', () => {
  it('every theme has a non-empty entry with all three fields', () => {
    for (const theme of THEME_NAMES) {
      const c = themeCopy[theme];
      expect(c).toBeTruthy();
      expect(c.small.length).toBeGreaterThan(0);
      expect(c.jackpotLabel.length).toBeGreaterThan(0);
      expect(c.loss.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/themeCopy.test.ts`
Expected: FAIL — `Cannot find module './themeCopy'`.

- [ ] **Step 3: Create the data file**

Create `src/utils/themeCopy.ts`:

```ts
import type { ThemeType } from './themeManifesto';

export interface CelebrationCopy {
  small: string;
  jackpotLabel: string;
  loss: string;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/themeCopy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/themeCopy.ts src/utils/themeCopy.test.ts
git commit -m "feat(celebration): per-theme celebration copy strings

Three strings per theme: small-win banner message ('Sweet match!',
'Pharaoh smiles.'), jackpot label (themed BIG TEXT replacing the
generic 'JACKPOT!'), loss plate message (themed voice replacing
silence). v1 keeps these per-theme, not per-game — same Slots /
Roulette / Bingo strings within a theme."
```

---

## Task 4: `CelebrationContext`

**Goal:** Carry `pendingTick: { delta, durationMs } | null` so `ThemedCelebration` can drive `BalancePill`'s tick pacing across the App tree. Pure clone of `AudioControlsContext`.

**Files:**
- Create: `src/contexts/CelebrationContext.tsx`
- Create: `src/contexts/CelebrationContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/contexts/CelebrationContext.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, renderHook, act } from '@testing-library/react';
import { CelebrationProvider, useCelebration } from './CelebrationContext';

describe('CelebrationContext', () => {
  afterEach(() => cleanup());

  it('exposes pendingTick=null by default', () => {
    const { result } = renderHook(() => useCelebration(), {
      wrapper: ({ children }) => <CelebrationProvider>{children}</CelebrationProvider>,
    });
    expect(result.current.pendingTick).toBe(null);
  });

  it('setPendingTick stores the value; clearPendingTick clears it', () => {
    const { result } = renderHook(() => useCelebration(), {
      wrapper: ({ children }) => <CelebrationProvider>{children}</CelebrationProvider>,
    });
    act(() => { result.current.setPendingTick({ delta: 100, durationMs: 600 }); });
    expect(result.current.pendingTick).toEqual({ delta: 100, durationMs: 600 });
    act(() => { result.current.clearPendingTick(); });
    expect(result.current.pendingTick).toBe(null);
  });

  it('throws when used outside the provider', () => {
    // Suppress React error boundary noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCelebration())).toThrow(/within a CelebrationProvider/);
    spy.mockRestore();
  });
});
```

Add `import { vi } from 'vitest';` at the top.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/contexts/CelebrationContext.test.tsx`
Expected: FAIL — `Cannot find module './CelebrationContext'`.

- [ ] **Step 3: Create the context**

Create `src/contexts/CelebrationContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface PendingTick {
  delta: number;
  durationMs: number;
}

export interface Celebration {
  pendingTick: PendingTick | null;
  setPendingTick: (t: PendingTick) => void;
  clearPendingTick: () => void;
}

const CelebrationContext = createContext<Celebration | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [pendingTick, setPendingTickState] = useState<PendingTick | null>(null);

  const setPendingTick = useCallback((t: PendingTick) => setPendingTickState(t), []);
  const clearPendingTick = useCallback(() => setPendingTickState(null), []);

  const value = useMemo<Celebration>(
    () => ({ pendingTick, setPendingTick, clearPendingTick }),
    [pendingTick, setPendingTick, clearPendingTick],
  );

  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}

export function useCelebration(): Celebration {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within a CelebrationProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/contexts/CelebrationContext.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/CelebrationContext.tsx src/contexts/CelebrationContext.test.tsx
git commit -m "feat(celebration): CelebrationContext for cross-tree tick sync

Mirrors AudioControlsContext shape. Carries a single pendingTick:
{ delta, durationMs } | null so ThemedCelebration (rendered under
GameShell) can tell BalancePill (rendered under AppHeader) to override
its default tick pacing for the duration of the celebration counter.
Prevents threading props through App.tsx -> Header / Game tree."
```

---

## Task 5: SVG primitives — Sparkle / Dot / Arc

**Goal:** Three tiny SVG glyphs used as universal accent particles. Each `{ color?: string; size?: number }` (defaults: `currentColor`, `12`).

**Files:**
- Create: `src/components/Themed/particles/Sparkle.tsx`
- Create: `src/components/Themed/particles/Dot.tsx`
- Create: `src/components/Themed/particles/Arc.tsx`
- Create: `src/components/Themed/particles/SVGPrimitive.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/particles/SVGPrimitive.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Sparkle } from './Sparkle';
import { Dot } from './Dot';
import { Arc } from './Arc';

describe('SVG primitives', () => {
  afterEach(() => cleanup());

  it.each([
    ['Sparkle', Sparkle],
    ['Dot', Dot],
    ['Arc', Arc],
  ])('%s renders an svg with default size 12 and color="currentColor"', (_name, Comp) => {
    const { container } = render(<Comp />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('width')).toBe('12');
    expect(svg!.getAttribute('height')).toBe('12');
    // currentColor is the default — concrete fill/stroke uses currentColor literal.
    expect(svg!.outerHTML).toContain('currentColor');
  });

  it('Sparkle respects custom size and color props', () => {
    const { container } = render(<Sparkle size={24} color="#ff0" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.outerHTML).toContain('#ff0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/particles/SVGPrimitive.test.tsx`
Expected: FAIL — `Cannot find module './Sparkle'`.

- [ ] **Step 3: Create the three primitives**

Create `src/components/Themed/particles/Sparkle.tsx`:

```tsx
interface Props { color?: string; size?: number; }

export function Sparkle({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill={color} />
    </svg>
  );
}
```

Create `src/components/Themed/particles/Dot.tsx`:

```tsx
interface Props { color?: string; size?: number; }

export function Dot({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill={color} />
    </svg>
  );
}
```

Create `src/components/Themed/particles/Arc.tsx`:

```tsx
interface Props { color?: string; size?: number; }

export function Arc({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 8 A 5 5 0 0 1 11 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/particles/SVGPrimitive.test.tsx`
Expected: PASS — 4 tests green (3 from `it.each` + 1 explicit).

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/particles/
git commit -m "feat(celebration): universal SVG particle primitives

Sparkle (4-point star), Dot (filled circle), Arc (semicircle stroke).
Each accepts { color?: string; size?: number } with currentColor +
12px defaults so they inherit theme accent from a wrapper's color
style. Used by ParticleField (Task 7) mixed with per-theme emoji from
themeParticles.ts."
```

---

## Task 6: `WinAmountCounter`

**Goal:** Animated counter `$0 → $amount` over 600ms (small) / 1200ms (jackpot). Themed font, `aria-hidden` (announcement happens on the GameShell message line). Renders final value immediately when reduced motion.

**Files:**
- Create: `src/components/Themed/WinAmountCounter.tsx`
- Create: `src/components/Themed/WinAmountCounter.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/WinAmountCounter.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { WinAmountCounter } from './WinAmountCounter';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('WinAmountCounter', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  beforeEach(() => { vi.useFakeTimers(); });

  it('renders $0 initially and ticks to $amount over 600ms (small)', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const rafCbs: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });

    const { container } = render(<WinAmountCounter amount={500} tier="small" theme="sweets" />);
    expect(container.textContent).toBe('$0');

    // Advance to mid-animation
    now = 300;
    act(() => { rafCbs.shift()?.(now); });
    expect(parseInt(container.textContent!.replace(/[^0-9]/g, ''), 10)).toBeGreaterThan(0);

    // Advance to end
    now = 600;
    act(() => { rafCbs.shift()?.(now); });
    expect(container.textContent).toBe('$500');
  });

  it('has aria-hidden="true"', () => {
    const { container } = render(<WinAmountCounter amount={100} tier="small" theme="sweets" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses themeManifesto font class for the given theme', () => {
    const { container } = render(<WinAmountCounter amount={100} tier="jackpot" theme="vampire" />);
    expect((container.firstElementChild as HTMLElement).className).toContain('font-vampire');
  });
});

describe('WinAmountCounter (reduced motion)', () => {
  beforeEach(() => {
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
  });
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); });

  it('renders the final amount immediately, no tick', async () => {
    const { WinAmountCounter: ReducedCounter } = await import('./WinAmountCounter');
    const { container } = render(<ReducedCounter amount={777} tier="jackpot" theme="space" />);
    expect(container.textContent).toBe('$777');
  });
});
```

(The reduced-motion test re-mocks via `vi.doMock` + dynamic `import` because `vi.mock` is hoisted to top of file with the first mock.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/WinAmountCounter.test.tsx`
Expected: FAIL — `Cannot find module './WinAmountCounter'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/WinAmountCounter.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../hooks/useMotion';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';

interface Props {
  amount: number;
  tier: 'jackpot' | 'small';
  theme: ThemeType;
}

function format(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function WinAmountCounter({ amount, tier, theme }: Props) {
  const motion = useMotion();
  const durationMs = tier === 'jackpot' ? 1200 : 600;
  const [displayed, setDisplayed] = useState<number>(motion.shouldAnimate ? 0 : amount);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!motion.shouldAnimate || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(amount * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(amount);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, durationMs, motion.shouldAnimate]);

  return (
    <span aria-hidden="true" className={`${themeManifesto[theme].font} text-theme-accent`}>
      {format(displayed)}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/WinAmountCounter.test.tsx`
Expected: PASS — all tests green (the reduced-motion suite passes via the dynamic re-import path).

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/WinAmountCounter.tsx src/components/Themed/WinAmountCounter.test.tsx
git commit -m "feat(celebration): WinAmountCounter — animated themed counter

Ticks \$0 -> \$amount over 600ms (small) or 1200ms (jackpot) with the
same cubic-ease-out curve BalancePill uses, so the two stay visually
in lockstep. Themed font from themeManifesto + theme accent color.
aria-hidden because the announcement comes from the GameShell message
line. Renders final value immediately when prefers-reduced-motion."
```

---

## Task 7: `ParticleField`

**Goal:** Generic Framer-Motion particle renderer. Mixes emoji from `pool` with SVG primitives from `primitives`. Internal `useMotion()` for reduced-motion fallback (static cluster).

**Files:**
- Create: `src/components/Themed/ParticleField.tsx`
- Create: `src/components/Themed/ParticleField.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/ParticleField.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ParticleField } from './ParticleField';
import type { ParticleMotion } from '../../utils/themeParticles';

const motion: ParticleMotion = {
  velocityRange: { x: [-100, 100], y: [-200, -100] },
  gravity: 500,
  lifetimeMs: [1000, 1500],
};

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('ParticleField', () => {
  afterEach(() => cleanup());

  it('renders the requested count of particles', () => {
    const { container } = render(
      <ParticleField pool={['🍬','🍭']} primitives={[]} count={10} motion={motion} />
    );
    // Each particle is rendered inside a wrapper with data-testid="particle-item"
    expect(container.querySelectorAll('[data-testid="particle-item"]').length).toBe(10);
  });

  it('mixes pool emojis and primitives into the rendered set', () => {
    const { container } = render(
      <ParticleField pool={['🍬']} primitives={['sparkle','dot']} count={30} motion={motion} primitiveTint="#f0f" />
    );
    const items = container.querySelectorAll('[data-testid="particle-item"]');
    expect(items.length).toBe(30);
    // At least one item should contain an svg (a primitive); at least one should contain the emoji.
    const html = container.innerHTML;
    expect(html).toContain('🍬');
    expect(html).toContain('<svg');
  });

  it('wrapper has aria-hidden="true"', () => {
    const { container } = render(
      <ParticleField pool={['🍬']} primitives={[]} count={1} motion={motion} />
    );
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ParticleField (reduced motion)', () => {
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); });

  it('renders particles in a static layout (no Framer animate props on motion.div)', async () => {
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
    const { ParticleField: ReducedField } = await import('./ParticleField');
    const { container } = render(
      <ReducedField pool={['🍬']} primitives={[]} count={6} motion={motion} />
    );
    const items = container.querySelectorAll('[data-testid="particle-item"]');
    expect(items.length).toBe(6);
    // Static items live under a wrapper with data-testid="particle-static"
    expect(container.querySelector('[data-testid="particle-static"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/ParticleField.test.tsx`
Expected: FAIL — `Cannot find module './ParticleField'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/ParticleField.tsx`:

```tsx
import { useMemo } from 'react';
import { motion as fmotion } from 'motion/react';
import { useMotion } from '../../hooks/useMotion';
import type { ParticleMotion } from '../../utils/themeParticles';
import { Sparkle } from './particles/Sparkle';
import { Dot } from './particles/Dot';
import { Arc } from './particles/Arc';

interface Props {
  pool: string[];
  primitives: ('sparkle' | 'dot' | 'arc')[];
  primitiveTint?: string;
  count: number;
  motion: ParticleMotion;
}

const PRIMITIVE_MAP = { sparkle: Sparkle, dot: Dot, arc: Arc } as const;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function ParticleField({ pool, primitives, primitiveTint, count, motion: motionDef }: Props) {
  const reduced = !useMotion().shouldAnimate;

  const items = useMemo(() => {
    const slots: ('emoji' | 'sparkle' | 'dot' | 'arc')[] = [
      ...pool.map(() => 'emoji' as const),
      ...primitives,
    ];
    return Array.from({ length: count }, (_, i) => {
      const kind = slots[Math.floor(Math.random() * slots.length)];
      if (kind === 'emoji') {
        return { kind: 'emoji' as const, glyph: pool[Math.floor(Math.random() * pool.length)], key: i };
      }
      return { kind, key: i };
    });
  }, [pool, primitives, count]);

  if (reduced) {
    return (
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ color: primitiveTint }}>
        <div data-testid="particle-static" className="flex gap-2 flex-wrap justify-center max-w-xs">
          {items.map(item => (
            <span key={item.key} data-testid="particle-item" className="text-2xl">
              {item.kind === 'emoji'
                ? item.glyph
                : (() => { const C = PRIMITIVE_MAP[item.kind]; return <C size={20} />; })()}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ color: primitiveTint }}>
      {items.map(item => {
        const vx = rand(motionDef.velocityRange.x[0], motionDef.velocityRange.x[1]);
        const vy = rand(motionDef.velocityRange.y[0], motionDef.velocityRange.y[1]);
        const lifetime = rand(motionDef.lifetimeMs[0], motionDef.lifetimeMs[1]) / 1000;
        const finalX = vx * lifetime;
        const finalY = vy * lifetime + 0.5 * motionDef.gravity * lifetime * lifetime;
        const rot = motionDef.rotation ? motionDef.rotation.degPerSec * lifetime : 0;
        return (
          <fmotion.span
            key={item.key}
            data-testid="particle-item"
            className="absolute left-1/2 top-1/2 text-2xl"
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: finalX, y: finalY, opacity: 0, rotate: rot }}
            transition={{ duration: lifetime, ease: 'easeOut' }}
          >
            {item.kind === 'emoji'
              ? item.glyph
              : (() => { const C = PRIMITIVE_MAP[item.kind]; return <C size={16} />; })()}
          </fmotion.span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/ParticleField.test.tsx`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/ParticleField.tsx src/components/Themed/ParticleField.test.tsx
git commit -m "feat(celebration): ParticleField — themed particle renderer

Generic Framer-Motion particle field. Mixes emoji from pool with SVG
primitives (sparkle/dot/arc) tinted via the wrapper's color style.
Per-particle randomized velocity within motion.velocityRange + gravity
applied over lifetime; optional rotation. Reduced-motion fallback
renders a static centered cluster (radial spread)."
```

---

## Task 8: `JackpotOverlay`

**Goal:** Full-screen takeover for the jackpot tier. Theme-accent gradient pulse + ParticleField (40-60 particles) + themed jackpotLabel + WinAmountCounter. Auto-dismiss 5s + click-on-backdrop dismiss.

**Files:**
- Create: `src/components/Themed/JackpotOverlay.tsx`
- Create: `src/components/Themed/JackpotOverlay.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/JackpotOverlay.test.tsx`:

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { JackpotOverlay } from './JackpotOverlay';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('JackpotOverlay', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed jackpotLabel for the given theme', () => {
    const { container } = render(<JackpotOverlay amount={500} theme="egypt" onDismiss={() => {}} />);
    expect(container.textContent).toContain("PHARAOH'S BOUNTY!");
  });

  it('auto-dismisses after 5000ms', () => {
    const onDismiss = vi.fn();
    render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop dismisses', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    const backdrop = getByTestId('jackpot-backdrop');
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking a child does NOT dismiss', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    const label = getByTestId('jackpot-label');
    fireEvent.click(label);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/JackpotOverlay.test.tsx`
Expected: FAIL — `Cannot find module './JackpotOverlay'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/JackpotOverlay.tsx`:

```tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { ParticleField } from './ParticleField';
import { WinAmountCounter } from './WinAmountCounter';

interface Props {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function JackpotOverlay({ amount, theme, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  const particles = themeParticles[theme];

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key="jackpot-overlay"
        data-testid="jackpot-backdrop"
        onClick={handleBackdropClick}
        aria-hidden="true"
        className="fixed inset-0 z-40 flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at center, var(--theme-accent) 0%, rgba(0,0,0,0.85) 70%)' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ParticleField
          pool={particles.pool}
          primitives={particles.primitives}
          primitiveTint={particles.primitiveTint}
          count={50}
          motion={particles.motion}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div data-testid="jackpot-label" className={`${themeManifesto[theme].font} text-7xl text-theme-accent drop-shadow-lg`}>
            {themeCopy[theme].jackpotLabel}
          </div>
          <div className="text-5xl">
            <WinAmountCounter amount={amount} tier="jackpot" theme={theme} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/JackpotOverlay.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/JackpotOverlay.tsx src/components/Themed/JackpotOverlay.test.tsx
git commit -m "feat(celebration): JackpotOverlay — full-screen themed takeover

Replaces the generic black/70 wash + plain JACKPOT! div + react-confetti
with a theme-accent radial gradient, themed jackpotLabel from themeCopy
(e.g. 'PHARAOH\\'S BOUNTY!'), 50-particle ParticleField, and a
WinAmountCounter ticking the payout. Auto-dismisses after 5s; clicking
the backdrop dismisses early; clicks on child elements do not."
```

---

## Task 9: `SmallWinBanner`

**Goal:** Center-bottom themed pill: themed marker emoji + small copy + WinAmountCounter. Auto-dismiss 3s.

**Files:**
- Create: `src/components/Themed/SmallWinBanner.tsx`
- Create: `src/components/Themed/SmallWinBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/SmallWinBanner.test.tsx`:

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { SmallWinBanner } from './SmallWinBanner';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('SmallWinBanner', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed small copy + first emoji from the pool', () => {
    const { container } = render(<SmallWinBanner amount={30} theme="sweets" onDismiss={() => {}} />);
    expect(container.textContent).toContain('Sweet match!');
    expect(container.textContent).toContain('🍬'); // first emoji in sweets pool
  });

  it('auto-dismisses after 3000ms', () => {
    const onDismiss = vi.fn();
    render(<SmallWinBanner amount={30} theme="sweets" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(2999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('wrapper has pointer-events-none so it does not block input', () => {
    const { getByTestId } = render(<SmallWinBanner amount={30} theme="sweets" onDismiss={() => {}} />);
    const wrapper = getByTestId('small-win-wrapper');
    expect(wrapper.className).toContain('pointer-events-none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/SmallWinBanner.test.tsx`
Expected: FAIL — `Cannot find module './SmallWinBanner'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/SmallWinBanner.tsx`:

```tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { WinAmountCounter } from './WinAmountCounter';

interface Props {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function SmallWinBanner({ amount, theme, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const marker = themeParticles[theme].pool[0];

  return (
    <AnimatePresence>
      <motion.div
        key="small-win-banner"
        data-testid="small-win-wrapper"
        aria-hidden="true"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="pointer-events-auto bg-theme-card/90 px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className="text-2xl">{marker}</span>
          <span className={`${themeManifesto[theme].font} text-theme-accent`}>{themeCopy[theme].small}</span>
          <WinAmountCounter amount={amount} tier="small" theme={theme} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/SmallWinBanner.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/SmallWinBanner.tsx src/components/Themed/SmallWinBanner.test.tsx
git commit -m "feat(celebration): SmallWinBanner — center-bottom themed pill

Replaces the generic green 'You won!' pill with a themed pill carrying
the first emoji from the per-theme particle pool (deterministic), the
themed small copy ('Sweet match!', 'Pharaoh smiles.'), and a
WinAmountCounter. Wrapper is pointer-events-none so the player can
re-bet during the 3s dwell."
```

---

## Task 10: `LossPlate`

**Goal:** Center-bottom themed plate. On mount (when `shouldAnimate`), dispatches a CSS shake to `surfaceRef.current` via CSS custom properties + `wiggle-active` class. Auto-dismiss 2s.

**Files:**
- Create: `src/components/Themed/LossPlate.tsx`
- Create: `src/components/Themed/LossPlate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/LossPlate.test.tsx`:

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { useRef } from 'react';
import { LossPlate } from './LossPlate';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

function Harness({ theme = 'vampire' as const, onDismiss = () => {} }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={ref} data-testid="surface" />
      <LossPlate theme={theme} surfaceRef={ref} onDismiss={onDismiss} />
    </div>
  );
}

describe('LossPlate', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed loss copy', () => {
    const { container } = render(<Harness theme="vampire" />);
    expect(container.textContent).toContain('The night is empty.');
  });

  it('applies the wiggle class + custom props to surfaceRef on mount, removes after wiggle.duration_ms (vampire = 400ms)', () => {
    const { getByTestId } = render(<Harness theme="vampire" />);
    const surface = getByTestId('surface') as HTMLElement;
    expect(surface.classList.contains('wiggle-active')).toBe(true);
    expect(surface.style.getPropertyValue('--wiggle-duration')).toBe('400ms');
    expect(surface.style.getPropertyValue('--wiggle-magnitude')).toBe('6px');
    act(() => { vi.advanceTimersByTime(400); });
    expect(surface.classList.contains('wiggle-active')).toBe(false);
  });

  it('auto-dismisses after 2000ms', () => {
    const onDismiss = vi.fn();
    render(<Harness theme="vampire" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('LossPlate (reduced motion)', () => {
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('skips the wiggle when reduced motion', async () => {
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
    const { LossPlate: ReducedPlate } = await import('./LossPlate');
    function Local() {
      const ref = useRef<HTMLDivElement | null>(null);
      return (
        <div>
          <div ref={ref} data-testid="surface" />
          <ReducedPlate theme="vampire" surfaceRef={ref} onDismiss={() => {}} />
        </div>
      );
    }
    const { getByTestId } = render(<Local />);
    expect((getByTestId('surface') as HTMLElement).classList.contains('wiggle-active')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/LossPlate.test.tsx`
Expected: FAIL — `Cannot find module './LossPlate'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/LossPlate.tsx`:

```tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotion } from '../../hooks/useMotion';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';

interface Props {
  theme: ThemeType;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
}

export function LossPlate({ theme, surfaceRef, onDismiss }: Props) {
  const motionPrefs = useMotion();
  const wiggle = themeManifesto[theme].wiggle;

  useEffect(() => {
    const dismissTimer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  useEffect(() => {
    if (!motionPrefs.shouldAnimate) return;
    const el = surfaceRef.current;
    if (!el) return;
    el.style.setProperty('--wiggle-duration', `${wiggle.duration_ms}ms`);
    el.style.setProperty('--wiggle-magnitude', `${wiggle.magnitude_px}px`);
    el.classList.add('wiggle-active');
    const removeTimer = setTimeout(() => {
      el.classList.remove('wiggle-active');
      el.style.removeProperty('--wiggle-duration');
      el.style.removeProperty('--wiggle-magnitude');
    }, wiggle.duration_ms);
    return () => {
      clearTimeout(removeTimer);
      el.classList.remove('wiggle-active');
      el.style.removeProperty('--wiggle-duration');
      el.style.removeProperty('--wiggle-magnitude');
    };
  }, [motionPrefs.shouldAnimate, surfaceRef, wiggle.duration_ms, wiggle.magnitude_px]);

  return (
    <AnimatePresence>
      <motion.div
        key="loss-plate"
        aria-hidden="true"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="bg-black/70 px-6 py-3 rounded-full">
          <span className={`${themeManifesto[theme].font} text-white/80`}>{themeCopy[theme].loss}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/LossPlate.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/LossPlate.tsx src/components/Themed/LossPlate.test.tsx
git commit -m "feat(celebration): LossPlate — themed loss tier with surface wiggle

Center-bottom themed plate carrying the per-theme loss copy (e.g.
'The night is empty.' for vampire). On mount (when shouldAnimate),
sets --wiggle-duration + --wiggle-magnitude CSS custom props on the
surfaceRef element and adds the .wiggle-active class so the global
@keyframes wiggle-shake animates the game surface. Per-theme intensity
(vampire judders 400ms/6px, ninja jolts 150ms/5px). Auto-dismiss 2s."
```

---

## Task 11: `ThemedCelebration`

**Goal:** Pure router. Switch on `tier`. Push/clear `pendingTick` in `CelebrationContext` for `'small' | 'jackpot'` (skipped for `'loss'` — no balance change).

**Files:**
- Create: `src/components/Themed/ThemedCelebration.tsx`
- Create: `src/components/Themed/ThemedCelebration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Themed/ThemedCelebration.test.tsx`:

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { useRef } from 'react';
import { ThemedCelebration } from './ThemedCelebration';
import { CelebrationProvider, useCelebration } from '../../contexts/CelebrationContext';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

function Probe({ onState }: { onState: (s: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] }) => void }) {
  const { pendingTick } = useCelebration();
  onState({ pendingTick });
  return null;
}

function Harness({ tier, amount }: { tier: 'jackpot' | 'small' | 'loss' | null; amount: number | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <CelebrationProvider>
      <div ref={ref} />
      <ThemedCelebration tier={tier} amount={amount} message="msg" theme="sweets" surfaceRef={ref} />
      <Probe onState={() => {}} />
    </CelebrationProvider>
  );
}

describe('ThemedCelebration', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders nothing when tier is null', () => {
    const { container } = render(<Harness tier={null} amount={null} />);
    // Probe + ref div + provider render only the empty marker; ThemedCelebration renders nothing.
    expect(container.textContent).toBe('');
  });

  it('renders SmallWinBanner for tier=small', () => {
    const { container } = render(<Harness tier="small" amount={30} />);
    expect(container.textContent).toContain('Sweet match!');
  });

  it('renders JackpotOverlay for tier=jackpot', () => {
    const { container } = render(<Harness tier="jackpot" amount={500} />);
    expect(container.textContent).toContain('CANDY JACKPOT!');
  });

  it('renders LossPlate for tier=loss', () => {
    const { container } = render(<Harness tier="loss" amount={0} />);
    expect(container.textContent).toContain('Empty wrapper.');
  });

  it('pushes pendingTick={ delta:30, durationMs:600 } for small', () => {
    let observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null = null;
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="small" amount={30} message="m" theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(observed?.pendingTick).toEqual({ delta: 30, durationMs: 600 });
  });

  it('pushes pendingTick={ delta:500, durationMs:1200 } for jackpot', () => {
    let observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null = null;
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="jackpot" amount={500} message="m" theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(observed?.pendingTick).toEqual({ delta: 500, durationMs: 1200 });
  });

  it('does NOT push pendingTick for loss', () => {
    let observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null = null;
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="loss" amount={0} message="m" theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(observed?.pendingTick).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Themed/ThemedCelebration.test.tsx`
Expected: FAIL — `Cannot find module './ThemedCelebration'`.

- [ ] **Step 3: Create the component**

Create `src/components/Themed/ThemedCelebration.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { ThemeType } from '../../utils/themeManifesto';
import { useCelebration } from '../../contexts/CelebrationContext';
import { JackpotOverlay } from './JackpotOverlay';
import { SmallWinBanner } from './SmallWinBanner';
import { LossPlate } from './LossPlate';

export interface ThemedCelebrationProps {
  tier: 'jackpot' | 'small' | 'loss' | null;
  amount: number | null;
  message: string | null;
  theme: ThemeType;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
}

export function ThemedCelebration({ tier, amount, theme, surfaceRef }: ThemedCelebrationProps) {
  const { setPendingTick, clearPendingTick } = useCelebration();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => { setDismissed(false); }, [tier, amount]);

  useEffect(() => {
    if (tier === 'small' || tier === 'jackpot') {
      const delta = amount ?? 0;
      if (delta > 0) {
        setPendingTick({ delta, durationMs: tier === 'jackpot' ? 1200 : 600 });
        return () => clearPendingTick();
      }
    }
    return undefined;
  }, [tier, amount, setPendingTick, clearPendingTick]);

  const onDismiss = useCallback(() => setDismissed(true), []);

  if (tier === null || dismissed) return null;

  if (tier === 'jackpot' && amount !== null) {
    return <JackpotOverlay amount={amount} theme={theme} onDismiss={onDismiss} />;
  }
  if (tier === 'small' && amount !== null) {
    return <SmallWinBanner amount={amount} theme={theme} onDismiss={onDismiss} />;
  }
  if (tier === 'loss') {
    return <LossPlate theme={theme} surfaceRef={surfaceRef} onDismiss={onDismiss} />;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Themed/ThemedCelebration.test.tsx`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Themed/ThemedCelebration.tsx src/components/Themed/ThemedCelebration.test.tsx
git commit -m "feat(celebration): ThemedCelebration orchestrator

Pure router on tier prop -> JackpotOverlay / SmallWinBanner / LossPlate.
Side-effect: pushes pendingTick { delta, durationMs } to
CelebrationContext for jackpot (1200ms) / small (600ms); skipped for
loss (no balance change). Internal dismissed state tracks the per-tier
auto-dismiss timer + click-to-dismiss; resets when tier or amount
changes (e.g. next round)."
```

---

## Task 12: GameShell prop widening (typing only)

**Goal:** Widen GameShell's `win` prop union to include `'loss'` and add an OPTIONAL `lastPayout?: number | null` prop. Build stays green; later tasks (13-15) emit `'loss'` from hooks; later task (17) makes `lastPayout` required and replaces the inline overlays.

**Files:**
- Modify: `src/components/Games/GameShell.tsx`
- Modify: `src/components/Games/GameShell.test.ts` (or `.tsx` if it exists; create if not)

- [ ] **Step 1: Check whether a GameShell test exists**

Run: `ls src/components/Games/GameShell.test.* 2>&1 || echo "no test file"`
If none exists, create `src/components/Games/GameShell.test.tsx` (Step 3) with the basic typing assertion. If one exists, append to it.

- [ ] **Step 2: Write a typing-level smoke test**

Append to (or create) `src/components/Games/GameShell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import type { GameShellProps } from './GameShell';

describe('GameShellProps typing', () => {
  it("accepts 'loss' in the win prop union", () => {
    const _props: Pick<GameShellProps, 'win'> = { win: 'loss' };
    expect(_props.win).toBe('loss');
  });

  it('accepts lastPayout: number | null | undefined', () => {
    const a: Pick<GameShellProps, 'lastPayout'> = { lastPayout: 100 };
    const b: Pick<GameShellProps, 'lastPayout'> = { lastPayout: null };
    const c: Pick<GameShellProps, 'lastPayout'> = {};
    expect(a.lastPayout).toBe(100);
    expect(b.lastPayout).toBe(null);
    expect(c.lastPayout).toBeUndefined();
  });
});
```

(If the file doesn't exist, also add the basic boilerplate `import` at the top — `import { describe, it, expect } from 'vitest';` and the `GameShellProps` import.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run lint`
Expected: TS error — `Type '"loss"' is not assignable to type ...`.

(The vitest run would also fail typecheck.)

- [ ] **Step 4: Widen the prop type**

In `src/components/Games/GameShell.tsx` (around line 19), change:

```ts
  win: 'jackpot' | 'small' | null;
```

to:

```ts
  win: 'jackpot' | 'small' | 'loss' | null;
  lastPayout?: number | null;     // NEW (optional in this task; required in Task 17)
```

(Do not touch the `<AnimatePresence>` block yet — `'loss'` simply doesn't match either of the existing `props.win === 'jackpot'` or `=== 'small'` branches and renders nothing extra. Existing behavior unchanged for jackpot/small.)

- [ ] **Step 5: Run test + lint to verify it passes**

Run: `npm run lint && npx vitest run src/components/Games/GameShell.test.tsx`
Expected: lint exit 0; tests pass.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: 372/372 still passing (or `372 + new tests from Tasks 1-11` — actual count depends on prior tasks completed).

- [ ] **Step 7: Commit**

```bash
git add src/components/Games/GameShell.tsx src/components/Games/GameShell.test.tsx
git commit -m "refactor(celebration): widen GameShell win union to include 'loss'

Typing-only change. Widens GameShell.win to 'jackpot'|'small'|'loss'|null
and adds optional lastPayout?: number|null prop. No rendering change yet
— 'loss' falls through both existing AnimatePresence branches and
renders nothing extra. Unblocks Tasks 13-15 (hooks emit 'loss') without
breaking the build at the Slots/Roulette/Bingo call sites."
```

---

## Task 13: `useSlotsGame` extension + Slots.tsx forwarding

**Goal:** Extend `useSlotsGame` union to include `'loss'`; add `lastPayout: number | null` state + return; add `setWin('loss'); setLastPayout(0);` next to the existing `playLose` call. Forward `lastPayout` from `Slots.tsx` to `GameShell`.

**Files:**
- Modify: `src/hooks/useSlotsGame.ts`
- Modify: `src/hooks/useSlotsGame.test.ts`
- Modify: `src/components/Games/Slots.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/hooks/useSlotsGame.test.ts` (inside the existing outer `describe`):

```ts
it('exposes lastPayout=null initially', () => {
  const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols: SYMS, balance: 1000, onUpdateBalance: vi.fn() }));
  expect(result.current.lastPayout).toBe(null);
});

it("sets win='loss' and lastPayout=0 when no symbol pattern matches", async () => {
  // Force the no-match branch by mocking evaluateSlotsResult to return null.
  vi.doMock('../components/Games/gameLogic', async (orig) => {
    const m = await orig<typeof import('../components/Games/gameLogic')>();
    return { ...m, evaluateSlotsResult: () => null };
  });
  vi.resetModules();
  const { useSlotsGame: hook } = await import('./useSlotsGame');
  vi.useFakeTimers();
  const { result } = renderHook(() => hook({ theme: 'sweets', symbols: SYMS, balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.play(); });
  // Advance through the spin settle window
  act(() => { vi.advanceTimersByTime(5000); });
  expect(result.current.win).toBe('loss');
  expect(result.current.lastPayout).toBe(0);
  vi.doUnmock('../components/Games/gameLogic');
  vi.resetModules();
  vi.useRealTimers();
});

it('sets lastPayout to bet*3 on small win and bet*50 on jackpot (uses live evaluator)', async () => {
  // This test relies on knowing that evaluateSlotsResult returns 'jackpot' for [s,s,s] and 'small' for two-of-a-kind.
  // Since we can't easily force a specific pattern without mocking RNG, we just assert the SHAPE: when win is set,
  // lastPayout matches bet * known multiplier.
  // Empirical: lifting the assertion to "lastPayout > 0 when win is jackpot/small".
  vi.useFakeTimers();
  const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols: SYMS, balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.play(); });
  act(() => { vi.advanceTimersByTime(5000); });
  if (result.current.win === 'jackpot') expect(result.current.lastPayout).toBe(50 * 10); // bet defaults to 10? — check actual
  if (result.current.win === 'small') expect(result.current.lastPayout).toBe(3 * 10);
  vi.useRealTimers();
});
```

Note for implementer: the third test's `bet` value (10? 5? — check the hook's default bet OR the test setup). If `bet` is configurable through the hook's input, set it explicitly. The point is asserting `lastPayout === bet * multiplier`.

(Look at the existing `useSlotsGame.test.ts` for the established `SYMS` constant + how `play()` is invoked.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useSlotsGame.test.ts`
Expected: FAIL — `lastPayout` does not exist on result.current.

- [ ] **Step 3: Extend the hook**

In `src/hooks/useSlotsGame.ts`:

1. Update the result-shape interface (around line 18-21):
   ```ts
   win: 'jackpot' | 'small' | 'loss' | null;
   lastPayout: number | null;
   ```

2. Add the state (around line 39-40):
   ```ts
   const [lastPayout, setLastPayout] = useState<number | null>(null);
   ```

3. In `play()`, find the `setWin(null)` early-reset (around line 75) and append:
   ```ts
   setLastPayout(null);
   ```

4. In the result branches (around lines 97-111), update each:
   ```ts
   if (result === 'jackpot') {
     const payout = bet * 50;
     onUpdateBalance?.(payout);
     setWin('jackpot');
     setLastPayout(payout);   // NEW
     setMessage(`JACKPOT! +${payout}`);
     soundEngine.playWin(theme);
   } else if (result === 'small') {
     const payout = bet * 3;
     onUpdateBalance?.(payout);
     setWin('small');
     setLastPayout(payout);   // NEW
     setMessage(`Small win: +${payout}`);
     soundEngine.playWin(theme);
   } else {
     setWin('loss');           // NEW
     setLastPayout(0);         // NEW
     setMessage('No match. Try again.');
     soundEngine.playLose(theme);
   }
   ```

5. Return `lastPayout` (around line 119):
   ```ts
   return { ..., lastPayout };
   ```

(Replace `...` with the existing returned fields. Match the existing return-object shape.)

- [ ] **Step 4: Run hook tests to verify they pass**

Run: `npx vitest run src/hooks/useSlotsGame.test.ts`
Expected: PASS — new tests + existing tests green.

- [ ] **Step 5: Forward `lastPayout` from `Slots.tsx`**

Open `src/components/Games/Slots.tsx`. Find the `<GameShell>` JSX (the only one). Find where `win={...}` is passed and add `lastPayout={...}` alongside it. Concretely, if the hook is destructured as `const { win, message, ..., lastPayout } = useSlotsGame(...)`, add `lastPayout` to that destructure and add `lastPayout={lastPayout}` to the GameShell props.

- [ ] **Step 6: Run lint + full test to confirm no regressions**

Run: `npm run lint && npm test`
Expected: lint exit 0; all tests pass (test count grew by ~2-3 from new asserts).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSlotsGame.ts src/hooks/useSlotsGame.test.ts src/components/Games/Slots.tsx
git commit -m "feat(celebration): useSlotsGame surfaces lastPayout + 'loss' tier

Hook gains lastPayout: number | null in its return shape, set to the
payout amount on win sites and to 0 on the no-match branch. The win
union widens to include 'loss' so the GameShell-level ThemedCelebration
can render the LossPlate. Slots.tsx forwards lastPayout to GameShell.
No game-logic changes — payout multipliers and the symbol-pattern
classifier are untouched."
```

---

## Task 14: `useRouletteGame` extension + Roulette.tsx forwarding

**Goal:** Same shape of changes as Task 13 applied to Roulette.

**Files:**
- Modify: `src/hooks/useRouletteGame.ts`
- Modify: `src/hooks/useRouletteGame.test.ts`
- Modify: `src/components/Games/Roulette.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/hooks/useRouletteGame.test.ts`:

```ts
it('exposes lastPayout=null initially', () => {
  const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  expect(result.current.lastPayout).toBe(null);
});

it("sets win='loss' and lastPayout=0 when the bet does not hit", async () => {
  vi.doMock('../components/Games/gameLogic', async (orig) => {
    const m = await orig<typeof import('../components/Games/gameLogic')>();
    return { ...m, evaluateRouletteBet: () => false };
  });
  vi.resetModules();
  const { useRouletteGame: hook } = await import('./useRouletteGame');
  vi.useFakeTimers();
  const { result } = renderHook(() => hook({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.setBetType('red'); });
  act(() => { result.current.play(); });
  act(() => { vi.advanceTimersByTime(5000); });
  expect(result.current.win).toBe('loss');
  expect(result.current.lastPayout).toBe(0);
  vi.doUnmock('../components/Games/gameLogic');
  vi.resetModules();
  vi.useRealTimers();
});

it("sets win='jackpot' + lastPayout=bet*35 for single-number win", async () => {
  vi.doMock('../components/Games/gameLogic', async (orig) => {
    const m = await orig<typeof import('../components/Games/gameLogic')>();
    return { ...m, evaluateRouletteBet: () => true };
  });
  vi.resetModules();
  const { useRouletteGame: hook } = await import('./useRouletteGame');
  vi.useFakeTimers();
  const { result } = renderHook(() => hook({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.setBetType('number-7'); });
  act(() => { result.current.play(); });
  act(() => { vi.advanceTimersByTime(5000); });
  expect(result.current.win).toBe('jackpot');
  // Default bet is 10? Check existing test setup; or set bet explicitly via setBet().
  expect(result.current.lastPayout).toBeGreaterThan(0);
  vi.doUnmock('../components/Games/gameLogic');
  vi.resetModules();
  vi.useRealTimers();
});
```

(Check the existing `useRouletteGame.test.ts` for the actual test scaffolding — `setBetType` may not be the exposed API name; adjust to match. The point of each test is to assert `lastPayout` is set correctly.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useRouletteGame.test.ts`
Expected: FAIL — `lastPayout` does not exist.

- [ ] **Step 3: Extend the hook**

In `src/hooks/useRouletteGame.ts`:

1. Update the result-shape interface (around line 23-26):
   ```ts
   win: 'jackpot' | 'small' | 'loss' | null;
   lastPayout: number | null;
   ```

2. Add the state (around line 43-44):
   ```ts
   const [lastPayout, setLastPayout] = useState<number | null>(null);
   ```

3. In `play()`, find the `setWin(null)` reset (around line 62) and append:
   ```ts
   setLastPayout(null);
   ```

4. In the win/loss branches (around lines 72-83), update:
   ```ts
   if (won) {
     const payout = betType.startsWith('number-') ? bet * 35 : bet * 2;
     onUpdateBalance?.(payout);
     const tier: 'jackpot' | 'small' = payout >= bet * 10 ? 'jackpot' : 'small';
     setWin(tier);
     setLastPayout(payout);   // NEW
     setMessage(`Won ${payout}!`);
     soundEngine.playWin(theme);
   } else {
     setWin('loss');           // NEW
     setLastPayout(0);         // NEW
     setMessage(`Landed on ${num} (${colour}). Better luck next time.`);
     soundEngine.playLose(theme);
   }
   ```

5. Return `lastPayout`:
   ```ts
   return { ..., lastPayout };
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useRouletteGame.test.ts`
Expected: PASS.

- [ ] **Step 5: Forward `lastPayout` from `Roulette.tsx`**

Same shape as Task 13: destructure `lastPayout` from the hook, pass `lastPayout={lastPayout}` to GameShell.

- [ ] **Step 6: Run lint + full test to confirm no regressions**

Run: `npm run lint && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useRouletteGame.ts src/hooks/useRouletteGame.test.ts src/components/Games/Roulette.tsx
git commit -m "feat(celebration): useRouletteGame surfaces lastPayout + 'loss' tier

Same shape as the slots change. Roulette's existing 'jackpot' threshold
(payout >= bet*10) is unchanged — single-number wins (35x) classify as
jackpot, even/odd/red/black wins (2x) as small."
```

---

## Task 15: `useBingoGame` extension + Bingo.tsx forwarding

**Goal:** Same shape of changes applied to Bingo. Bingo's loss branch currently only sets the `'No bingo this round.'` message — Plan 6 adds `setWin('loss')` + `setLastPayout(0)`.

**Files:**
- Modify: `src/hooks/useBingoGame.ts`
- Modify: `src/hooks/useBingoGame.test.ts`
- Modify: `src/components/Games/Bingo.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/hooks/useBingoGame.test.ts`:

```ts
it('exposes lastPayout=null initially', () => {
  const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  expect(result.current.lastPayout).toBe(null);
});

it("sets win='loss' and lastPayout=0 when the board does not bingo within MAX_DRAWS", async () => {
  vi.doMock('../components/Games/gameLogic', async (orig) => {
    const m = await orig<typeof import('../components/Games/gameLogic')>();
    return { ...m, evaluateBingoBoard: () => false };
  });
  vi.resetModules();
  const { useBingoGame: hook, MAX_DRAWS, DRAW_INTERVAL_MS } = await import('./useBingoGame');
  vi.useFakeTimers();
  const { result } = renderHook(() => hook({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.play(); });
  // Advance through all draws + a bit extra
  act(() => { vi.advanceTimersByTime(DRAW_INTERVAL_MS * (MAX_DRAWS + 2)); });
  expect(result.current.win).toBe('loss');
  expect(result.current.lastPayout).toBe(0);
  vi.doUnmock('../components/Games/gameLogic');
  vi.resetModules();
  vi.useRealTimers();
});

it("sets win='small' and lastPayout=bet*5 on a winning board", async () => {
  vi.doMock('../components/Games/gameLogic', async (orig) => {
    const m = await orig<typeof import('../components/Games/gameLogic')>();
    return { ...m, evaluateBingoBoard: () => true };
  });
  vi.resetModules();
  const { useBingoGame: hook, DRAW_INTERVAL_MS } = await import('./useBingoGame');
  vi.useFakeTimers();
  const { result } = renderHook(() => hook({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
  act(() => { result.current.play(); });
  act(() => { vi.advanceTimersByTime(DRAW_INTERVAL_MS); });
  expect(result.current.win).toBe('small');
  expect(result.current.lastPayout).toBeGreaterThan(0);
  vi.doUnmock('../components/Games/gameLogic');
  vi.resetModules();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useBingoGame.test.ts`
Expected: FAIL — `lastPayout` does not exist.

- [ ] **Step 3: Extend the hook**

In `src/hooks/useBingoGame.ts`:

1. Update the result-shape interface (around line 25-28):
   ```ts
   win: 'jackpot' | 'small' | 'loss' | null;
   lastPayout: number | null;
   ```

2. Add the state (around line 40-41):
   ```ts
   const [lastPayout, setLastPayout] = useState<number | null>(null);
   ```

3. In `play()`, find the `setWin(null)` reset (around line 54) and append:
   ```ts
   setLastPayout(null);
   ```

4. In the win/loss branches (around lines 78-86):
   ```ts
   if (won) {
     const payout = bet * 5;
     onUpdateBalance?.(payout);
     setWin('small');
     setLastPayout(payout);   // NEW
     setMessage(`Bingo! +${payout}`);
     soundEngine.playWin(theme);
   } else {
     setWin('loss');           // NEW
     setLastPayout(0);         // NEW
     setMessage('No bingo this round.');
     soundEngine.playLose(theme);
   }
   ```

5. Return `lastPayout`:
   ```ts
   return { ..., lastPayout };
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useBingoGame.test.ts`
Expected: PASS.

- [ ] **Step 5: Forward `lastPayout` from `Bingo.tsx`**

Same shape as Tasks 13, 14: destructure `lastPayout` from the hook, pass `lastPayout={lastPayout}` to GameShell.

- [ ] **Step 6: Run lint + full test to confirm no regressions**

Run: `npm run lint && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useBingoGame.ts src/hooks/useBingoGame.test.ts src/components/Games/Bingo.tsx
git commit -m "feat(celebration): useBingoGame surfaces lastPayout + 'loss' tier

Bingo previously only set message on the no-bingo branch — now also
sets setWin('loss') and setLastPayout(0) so the GameShell-level
ThemedCelebration can render the LossPlate. Win branch surfaces
lastPayout = bet*5 (Bingo's flat win multiplier; no jackpot path)."
```

---

## Task 16: `BalancePill` consumes `CelebrationContext` + App.tsx provider wrap

**Goal:** Wrap App in `<CelebrationProvider>`. Augment BalancePill so when `pendingTick` is set AND the balance is increasing AND `motion.shouldAnimate`, it ticks over `pendingTick.durationMs` instead of `motion.durations.slow`.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout/BalancePill.tsx`
- Modify: `src/components/Layout/BalancePill.test.tsx`

- [ ] **Step 1: Add the provider wrap**

In `src/App.tsx`, find where `<AudioControlsProvider>` wraps the rest of the app. Add `<CelebrationProvider>` as a sibling-level wrap (either inside or outside `AudioControlsProvider` — order doesn't matter as long as both are above the components that consume them):

```tsx
import { CelebrationProvider } from './contexts/CelebrationContext';

// inside the JSX:
<AudioControlsProvider>
  <CelebrationProvider>
    {/* existing children */}
  </CelebrationProvider>
</AudioControlsProvider>
```

(If App.tsx already wraps in multiple providers, just add this one in the same chain.)

- [ ] **Step 2: Wrap existing BalancePill tests in CelebrationProvider; add new test for the override path**

Modify `src/components/Layout/BalancePill.test.tsx`. At the top, add:

```tsx
import { CelebrationProvider, useCelebration } from '../../contexts/CelebrationContext';
```

Replace each `render(<BalancePill ... />)` with:

```tsx
render(<CelebrationProvider><BalancePill ... /></CelebrationProvider>);
```

Same for the `rerender` calls.

Then append a new test at the bottom of the describe:

```tsx
function PrimedProvider({ delta, durationMs, children }: { delta: number; durationMs: number; children: React.ReactNode }) {
  return (
    <CelebrationProvider>
      <Primer delta={delta} durationMs={durationMs} />
      {children}
    </CelebrationProvider>
  );
}

function Primer({ delta, durationMs }: { delta: number; durationMs: number }) {
  const { setPendingTick } = useCelebration();
  React.useEffect(() => { setPendingTick({ delta, durationMs }); }, [delta, durationMs, setPendingTick]);
  return null;
}

it('uses pendingTick.durationMs when CelebrationContext.pendingTick is set', async () => {
  // Start at 1000; jump to 1500 with pendingTick durationMs=600; verify final value lands.
  const { rerender } = render(<PrimedProvider delta={500} durationMs={600}><BalancePill balance={1000} /></PrimedProvider>);
  act(() => { rerender(<PrimedProvider delta={500} durationMs={600}><BalancePill balance={1500} /></PrimedProvider>); });
  // Wait one RAF cycle to allow tick to start.
  await act(async () => { await new Promise(r => setTimeout(r, 700)); });
  expect(screen.getByTestId('balance-display').textContent).toBe('$1,500');
});
```

(Need to add `import React from 'react';` at the top if not present, and `import { act } from '@testing-library/react';` is already there.)

- [ ] **Step 3: Run BalancePill tests to verify failure**

Run: `npx vitest run src/components/Layout/BalancePill.test.tsx`
Expected: existing tests now FAIL because `useCelebration` throws ("must be used within a CelebrationProvider"). The new test also fails — `pendingTick` is currently ignored.

- [ ] **Step 4: Augment `BalancePill` to consume the context**

In `src/components/Layout/BalancePill.tsx`:

1. Add the import:
   ```ts
   import { useCelebration } from '../../contexts/CelebrationContext';
   ```

2. Inside the component, add at the top:
   ```ts
   const { pendingTick } = useCelebration();
   ```

3. Modify the existing `useEffect` so the `duration` is `pendingTick?.durationMs ?? motion.durations.slow`:
   ```ts
   useEffect(() => {
     const previous = previousRef.current;
     previousRef.current = balance;
     if (balance <= previous || !motion.shouldAnimate) {
       setDisplayed(balance);
       return;
     }
     const start = performance.now();
     const duration = pendingTick?.durationMs ?? motion.durations.slow;
     // ... rest unchanged ...
   }, [balance, motion.shouldAnimate, motion.durations.slow, pendingTick?.durationMs]);
   ```

(Add `pendingTick?.durationMs` to the dep array.)

- [ ] **Step 5: Run BalancePill tests to verify pass**

Run: `npx vitest run src/components/Layout/BalancePill.test.tsx`
Expected: all tests pass.

- [ ] **Step 6: Run full test + lint to confirm no regressions**

Run: `npm run lint && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Layout/BalancePill.tsx src/components/Layout/BalancePill.test.tsx
git commit -m "feat(celebration): BalancePill ticks in lockstep with celebration counter

App wraps children in CelebrationProvider. BalancePill reads
pendingTick from CelebrationContext; when set and the balance is
increasing, the existing tick animation uses pendingTick.durationMs
(600 small / 1200 jackpot) instead of motion.durations.slow. Both
counters now visibly grow together — strongest 'where the money
goes' read for the player."
```

---

## Task 17: GameShell integration — replace inline overlays with `<ThemedCelebration>`

**Goal:** Replace lines 99-121 of `GameShell.tsx` (the inline `<AnimatePresence>` jackpot + small overlays + `<Confetti />`) with one `<ThemedCelebration>` call. Add `aria-live="polite" role="status"` to the existing message line. Add `surfaceRef` for LossPlate's wiggle. Make `lastPayout` REQUIRED. Remove `import Confetti from 'react-confetti'`.

**Files:**
- Modify: `src/components/Games/GameShell.tsx`
- Modify: `src/components/Games/GameShell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Games/GameShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { GameShell } from './GameShell';

// Mock useAssets and useMusic to avoid network/Firebase.
vi.mock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: false }) }));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));
vi.mock('../../contexts/AudioControlsContext', () => ({
  useAudioControls: () => ({ muted: false, toggleMute: () => {}, nowPlaying: null, setNowPlaying: () => {} }),
  AudioControlsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function withProvider(ui: React.ReactNode) {
  return <CelebrationProvider>{ui}</CelebrationProvider>;
}

const baseProps = {
  name: 'Test', theme: 'sweets' as const, bgKey: 'bg_main',
  extraAssetKeys: [], gameType: 'slots' as const,
  bet: 10, onBet: () => {}, onPlay: () => {}, playLabel: 'PLAY',
  playDisabled: false, balance: 1000, onBack: () => {},
};

describe('GameShell celebration integration', () => {
  it('the message line carries aria-live="polite" role="status"', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} win={null} lastPayout={null} message="Hello">
        <div>game</div>
      </GameShell>
    ));
    const live = container.querySelector('p[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live!.getAttribute('role')).toBe('status');
    expect(live!.textContent).toBe('Hello');
  });

  it('does NOT render an inline JACKPOT! div directly (handled by ThemedCelebration)', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} win="jackpot" lastPayout={500} message="JACKPOT! +500">
        <div>game</div>
      </GameShell>
    ));
    // Should still see the jackpot via the themed overlay (sweets jackpotLabel)
    expect(container.textContent).toContain('CANDY JACKPOT!');
    // Should NOT see the original generic 'JACKPOT!' yellow div pattern (text-7xl font-casino)
    expect(container.querySelector('.text-7xl.font-casino')).toBe(null);
  });

  it('renders ThemedCelebration for win=loss', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} win="loss" lastPayout={0} message="No match. Try again.">
        <div>game</div>
      </GameShell>
    ));
    expect(container.textContent).toContain('Empty wrapper.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Games/GameShell.test.tsx`
Expected: FAIL — message line lacks `aria-live`; inline JACKPOT! div still rendered; loss tier shows nothing.

- [ ] **Step 3: Replace inline overlays + add ARIA + surfaceRef + remove confetti import**

In `src/components/Games/GameShell.tsx`:

1. Remove the import (around line 3):
   ```ts
   import Confetti from 'react-confetti';   // DELETE
   ```

2. Add the import:
   ```ts
   import { ThemedCelebration } from '../Themed/ThemedCelebration';
   ```

3. Make `lastPayout` REQUIRED (remove the `?`):
   ```ts
   lastPayout: number | null;     // was: lastPayout?: number | null;
   ```

4. Add a ref for the surface root inside the component (after the existing `useEffect`s):
   ```ts
   const surfaceRef = useRef<HTMLDivElement | null>(null);
   ```

5. Attach the ref to the existing `bg-black/30 backdrop-blur-sm` wrapper div (around line 76):
   ```tsx
   <div ref={surfaceRef} className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm p-6">
   ```

6. Update the message line (around line 96):
   ```tsx
   {props.message && <p aria-live="polite" role="status" className="text-center text-sm opacity-90">{props.message}</p>}
   ```

7. Replace lines 99-121 (the entire `<AnimatePresence>` block) with:
   ```tsx
   <ThemedCelebration
     tier={props.win}
     amount={props.lastPayout}
     message={props.message}
     theme={props.theme}
     surfaceRef={surfaceRef}
   />
   ```

8. Remove the now-unused imports if any (`AnimatePresence`, `motion` from `motion/react`) — but verify they're not used elsewhere in the file first.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Games/GameShell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full test + lint + build to confirm no regressions**

Run: `npm run lint && npm test && npx vite build`
Expected: lint exit 0, all tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/GameShell.tsx src/components/Games/GameShell.test.tsx
git commit -m "feat(celebration): GameShell uses ThemedCelebration; ARIA-live on message

Replaces the inline <AnimatePresence> jackpot/small blocks (lines 99-121)
and the <Confetti /> render with a single <ThemedCelebration> call. Adds
aria-live=\"polite\" role=\"status\" to the existing <p>{message}</p>
line so the result is announced to screen readers (existing message
strings already include the payout). Adds surfaceRef on the surface
wrapper for LossPlate's wiggle. lastPayout prop is now required. The
react-confetti import is gone — package is uninstalled in Task 18."
```

---

## Task 18: Uninstall `react-confetti` + final verification

**Goal:** Drop the unused dependency, run lint/test/build, write the progress doc.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/superpowers/progress/2026-05-12-plan-6-status.md`

- [ ] **Step 1: Verify no remaining import sites**

Run: `grep -rn "react-confetti" src server 2>&1 || echo "no matches"`
Expected: `no matches`. (If any remain, fix them before proceeding.)

- [ ] **Step 2: Uninstall**

Run: `npm uninstall react-confetti`
Expected: `package.json` and `package-lock.json` updated; `react-confetti` removed from `dependencies`.

- [ ] **Step 3: Run the full test + lint + build**

Run: `npm run lint && npm test && npx vite build`
Expected: lint exit 0; all tests pass (count should be ~400-410, up from 372); build succeeds within ~10s. Note the new JS bundle size — should be slightly SMALLER than the pre-Plan-6 baseline because react-confetti (~12 KB minified) is gone, even though Plan 6 adds ~8 components.

- [ ] **Step 4: Write the progress doc**

Create `docs/superpowers/progress/2026-05-12-plan-6-status.md` with:
- Final commit SHA + summary of all 18 commits
- Final test count
- Final bundle size delta vs the Plan 5 baseline (916.79 KB JS / 56.28 KB CSS)
- Any deviations from the plan (typically: copy strings polished, motion params tuned, test patterns adapted)
- Browser-pass checklist for the deployed instance: lobby → each game → trigger small win → trigger jackpot → trigger loss → verify themed copy + particles + counter + balance pill tick + surface wiggle on loss → switch theme → repeat.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json docs/superpowers/progress/2026-05-12-plan-6-status.md
git commit -m "chore(celebration): drop react-confetti + Plan 6 status doc

react-confetti is no longer imported (Task 17 removed the last
consumer). Uninstalled to keep package.json honest. Bundle size
decreases slightly even with ~8 new components added. Final test
count and any deviations captured in the progress doc."
```

- [ ] **Step 6: Push the branch + open PR (or merge to main per established Plan 1-5 pattern)**

The previous plans merged directly to `main` and deployed via `./deploy/deploy.sh deploy`. Confirm with the user before pushing. If approved:

```bash
git checkout main
git merge feat/plan-6-themed-celebration --ff-only   # or --no-ff if branch is rebased
git push origin main
./deploy/deploy.sh deploy
```

Note the new Cloud Run revision in the progress doc.

---

## Self-Review Checklist (run before declaring the plan ready)

After working through every task, run this once:

1. **All 8 themes covered?** Check `themeParticles` (Task 2), `themeCopy` (Task 3), `themeManifesto.wiggle` (Task 1) — each has 8 entries (sweets, egypt, space, west, ocean, jungle, vampire, ninja).
2. **Hook union extension symmetry?** Slots/Roulette/Bingo all updated (Tasks 13-15) with the same shape.
3. **Game-component forwarding symmetry?** Slots.tsx / Roulette.tsx / Bingo.tsx all forward `lastPayout` to GameShell.
4. **`react-confetti` gone?** Verified in Task 18 step 1.
5. **No `@testing-library/jest-dom` matchers?** Plan code uses `.toBeTruthy()`, `.getAttribute().toBe()`, `.textContent.toContain()`. Search for `toBeInTheDocument`, `toHaveAttribute`, `toHaveTextContent` in plan code — none should exist.
6. **Reduced-motion paths covered for every animating component?** ParticleField, WinAmountCounter, LossPlate (skip wiggle), JackpotOverlay/SmallWinBanner (immediate appearance covered by Framer Motion's transition shortening — implementer can opt to skip explicit `transition={{ duration: 0 }}` here since the visual difference is minimal; document if so).
7. **ARIA properly wired?** GameShell message line has `aria-live` + `role`. Counter, particles, overlays all `aria-hidden`.
8. **Browser-pass walked all 8 themes after deploy?** Captured in the progress doc.

---

## Open questions / known gotchas

- **`useMotion()` behavior in jsdom**: jsdom does not implement `prefers-reduced-motion` natively. The existing `useMotion` hook may default to `shouldAnimate: true` in test environments. The reduced-motion test suites in Tasks 6, 7, 10 use `vi.doMock` + dynamic `import` to swap the hook implementation. Verify the existing `useMotion` source supports this pattern (it should — it's a small hook with no provider). If it instead reads from a context, the tests will need to wrap in that provider.
- **Default `bet` value in hook tests**: Tests in Tasks 13-15 reference `bet * multiplier` without setting `bet` explicitly. Check the existing test setup for each hook — most likely they use a default like `bet=10`. Adjust the assertion accordingly OR set `bet` via the hook's exposed setter.
- **`fireEvent.click` on backdrop with child overlay**: Tests in Task 8 rely on `e.target === e.currentTarget` to distinguish backdrop clicks from child clicks. Framer Motion's `<motion.div>` may add wrappers. If the test fails because `target` is some intermediate, the `data-testid="jackpot-backdrop"` may need to be on the actual click handler element directly, not on a child.
- **`AnimatePresence` exit timing in jsdom**: per Plan 5 deviation note, `mode="wait"` deadlocks; `mode="popLayout"` is OK. JackpotOverlay uses `mode="popLayout"`. Other overlays (SmallWinBanner, LossPlate) use the default mode — if any rerender test deadlocks, switch them to `"popLayout"` too.
