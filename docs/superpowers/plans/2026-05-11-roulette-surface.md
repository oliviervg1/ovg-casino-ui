# Roulette Surface Implementation Plan (Plan 4 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder one-circle Roulette widget into a real European single-zero wheel — 37-segment SVG, themed chrome (rim + cone + pointer), independently-orbiting ball, felt bet table with chip drop, themed result strip. In-window win pulses (result pocket + cone + winning-number flash + balance counter).

**Architecture:** Decompose the current monolithic `src/components/Games/Roulette.tsx` (140 lines, all responsibilities mixed) into a hook (`useRouletteGame`) for state and timing plus a small component family in `src/components/Games/Roulette/` (`RouletteSurface` orchestrator, `RouletteWheel` SVG, `RouletteSegments` pure-helper, `BetTable`, `ResultStrip`). The existing `Roulette.tsx` shrinks to a thin `<GameShell><RouletteSurface /></GameShell>` wrapper so `App.tsx` and the `Props` interface are unchanged. The wheel is **manifesto-driven** (one shape, theme-distinct rim colour + inner-cone tint via `themeManifesto.<theme>` tokens); bespoke per-theme rims/balls/cone-motifs (sweets candy double-rim, gold-leaf hieroglyph, neon-tube, gumball/scarab/asteroid/pearl/etc) are a polish-pass deferral, NOT included in Plan 4. Wheel-segment "click" sounds and ball-drop "thunk" are deferred (no new audio assets). Themed celebration is deferred to the future Plan 6 (Section 7); Plan 4 keeps the existing GameShell-level confetti/jackpot overlay and adds in-window pulses only (result-pocket pulse + winning-number flash + cone scale-pulse).

**Tech Stack:** React 18 + TypeScript, Framer Motion (`motion/react`, already a dep), Vite, vitest + jsdom, raw SVG. No new dependencies.

---

## Pre-flight

The branch should be created from current `main` (tip after Plan 3 deploy: `4bf6ada`). Use the `superpowers:using-git-worktrees` skill or:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/plan-4-roulette-surface
```

Confirm baseline: `npm run lint && npm test && npx vite build` should be green (lint exit 0, 257/257 tests, build succeeds within ~10s).

## File structure overview

**New files (all under `src/components/Games/Roulette/` unless noted):**

| File | Responsibility |
|---|---|
| `src/hooks/useRouletteGame.ts` | Game state + timing: bet, betType, spinning, resultNum, resultColour, win, message, spin() |
| `src/hooks/useRouletteGame.test.ts` | Vitest unit tests for the hook (uses fake timers) |
| `Roulette/RouletteSegments.tsx` | Pure helper: returns the 37 wedge SVG path strings + number-label positions. Uses existing `RouletteColour` + new `angleOfPocket()` helper from `gameLogic.ts`. |
| `Roulette/RouletteSegments.test.tsx` | 37-element output, color distribution, label-position math |
| `Roulette/RouletteWheel.tsx` | Pure SVG wheel: renders segments + outer rim + inner cone + pointer + ball; handles wheel-rotation + ball-orbit Framer Motion animation |
| `Roulette/RouletteWheel.test.tsx` | Static layout, animated state when spinning, result-pocket landing |
| `Roulette/BetTable.tsx` | Felt-cloth background + 4 bet cells (RED/BLACK/EVEN/ODD) with chip drop on active cell |
| `Roulette/BetTable.test.tsx` | Cell rendering, active-state highlighting, click-to-select, disabled-while-spinning |
| `Roulette/ResultStrip.tsx` | Pocket badge + result message; slides in from below on result, fades on next spin |
| `Roulette/ResultStrip.test.tsx` | win vs loss text, pocket badge color, hidden when no result |
| `Roulette/RouletteSurface.tsx` | Orchestrator. Composes Wheel + BetTable + ResultStrip. Reads `useRouletteGame` (passed as prop) |
| `Roulette/RouletteSurface.test.tsx` | Integration: 4 bet cells render, wheel renders, click → setBetType, win → ResultStrip shows |
| `Roulette.test.tsx` (in `src/components/Games/`) | Light integration test that exercises the GameShell contract end-to-end |

**Modified files:**

| File | What changes |
|---|---|
| `src/components/Games/gameLogic.ts` | Add pure helper `angleOfPocket(n: number): number` returning `n * (360 / 37)`. Existing `evaluateRouletteBet` and `RouletteColour` kept verbatim. |
| `src/components/Games/gameLogic.test.ts` | Add tests for `angleOfPocket` (existing test file — append). |
| `src/components/Games/Roulette.tsx` | Body shrinks from 140 lines to ~50: imports `<RouletteSurface>`, lifts state to `useRouletteGame`, passes them to GameShell. Props interface unchanged. **Replace `import { ThemeType } from '../../App'` with `import { type ThemeType } from '../../utils/themeManifesto'`** (canonical post-Plan-1 source). |

No changes to: `App.tsx`, `themeManifesto.ts`, `SoundEngine.ts` (`playRouletteSpin`/`playWin`/`playLose` reused), `GameShell.tsx`, `useAssets.ts`, `config/games.ts`.

---

## Conventions used in every task

- **Step 1 is always "Write the failing test first."** Steps 2 = run it, observe failure. Steps 3–4 = implement + run again, observe pass. Last step = commit. This is per `superpowers:test-driven-development`.
- **Commit messages** follow Plan 3's convention: `feat(roulette): ...`, `fix(roulette): ...`, `refactor(roulette): ...`, `docs(plan-4): ...`. No `Co-Authored-By` lines (Plans 2+3 did not use them).
- **Imports** for `ThemeType` come from `'../../utils/themeManifesto'` (or `'../../../utils/themeManifesto'` from the `Roulette/` subdir) — the canonical source post-Plan 1 dedup. Do NOT re-import from `'../../App'`. Plan 1's commit `4a60ebe` made App.tsx a re-export, but new code should hit the source directly. Note current `Roulette.tsx:7` still has the wrong import — Task 11 fixes this.
- **vitest-native matchers** — the codebase has no `@testing-library/jest-dom` installed. Adapt any reference test code that uses `.toBeInTheDocument()` / `.toHaveAttribute()` / `.toHaveTextContent()` to vitest-native equivalents per `BalancePill.test.tsx` convention: `expect(el).toBeTruthy()` / `expect(el.getAttribute('foo')).toBe('val')` / `expect(el.textContent).toContain('text')`. Add `import { cleanup } from '@testing-library/react'` and `afterEach(() => cleanup())` to every new component test file.
- **Tests** use `vi.mock` for hooks where they would otherwise hit Firebase or window.AudioContext. See `GameShell.test.tsx` and `Slots.test.tsx` for the canonical mock layout.
- **One concept per commit.** If a step's diff bleeds into unrelated cleanup, split it into its own commit.

---

## Task 1: `angleOfPocket` helper in `gameLogic.ts`

**Goal:** Pure helper that maps a pocket number (0..36) to its angle (in degrees) on the wheel. The wheel is laid out in numerical order (a demo-friendly simplification — not the irregular real European order). Each pocket spans `360/37 ≈ 9.7297°`. Pocket 0 sits at angle 0°.

**Files:**
- Modify: `src/components/Games/gameLogic.ts`
- Modify: `src/components/Games/gameLogic.test.ts`

- [ ] **Step 1: Append the failing tests**

```ts
// in src/components/Games/gameLogic.test.ts (append to existing describe block or add new one)
import { angleOfPocket } from './gameLogic';

describe('angleOfPocket', () => {
  it('returns 0 for pocket 0', () => {
    expect(angleOfPocket(0)).toBe(0);
  });

  it('returns 360/37 for pocket 1 (one wedge clockwise)', () => {
    expect(angleOfPocket(1)).toBeCloseTo(360 / 37, 6);
  });

  it('returns 36 × (360/37) for pocket 36 (just shy of a full revolution)', () => {
    expect(angleOfPocket(36)).toBeCloseTo(36 * (360 / 37), 6);
    expect(angleOfPocket(36)).toBeLessThan(360);
  });

  it('is monotonic across the full pocket range', () => {
    for (let n = 1; n <= 36; n++) {
      expect(angleOfPocket(n)).toBeGreaterThan(angleOfPocket(n - 1));
    }
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```
Expected: `angleOfPocket is not a function` (or import-resolution error).

- [ ] **Step 3: Implement**

In `src/components/Games/gameLogic.ts`, append (anywhere after the existing exports):

```ts
/** Map a roulette pocket number (0..36) to its centre angle in degrees on the wheel.
 *  Wheel is laid out in numerical order (demo simplification — not the real European
 *  irregular ordering). Pocket 0 is at angle 0°; each subsequent pocket is one wedge
 *  (360/37 ≈ 9.73°) further clockwise.
 */
export function angleOfPocket(n: number): number {
  return n * (360 / 37);
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```
Expected: all gameLogic tests pass (8 prior + 4 new = 12).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/gameLogic.ts src/components/Games/gameLogic.test.ts
git commit -m "feat(roulette): angleOfPocket helper for wheel-segment math"
```

---

## Task 2: `useRouletteGame` hook — lift state + add wheel-rotation accumulator

**Goal:** Extract `bet`, `betType`, `spinning`, `resultNum`, `resultColour`, `win`, `message` state + the `handleSpin` body from current `Roulette.tsx` into a hook. Same payouts (35× for number-N bets, 2× for simple bets), same `tier = payout >= bet * 10 ? 'jackpot' : 'small'` logic, same sound calls. **One semantic addition** beyond the literal extract: the hook also exposes `wheelRotation` and `ballRotation` accumulators (degrees) and pre-determines the result number at spin START so the wheel has a known target to decelerate into. The cone display still shows the result only at spin END (per spec), so we hide `resultNum` during spin and reveal it after the settleTimeout fires. **Why pre-determine?** If we randomise the result at spin end, the wheel rotation has nowhere to animate TO during the spin window — motion would only see the new target after spinning is already false, and there'd be no visible animation. Pre-determining at spin start lets the wheel decelerate from its current accumulator to the new target over the 2.5s spin window (plain Framer transition).

**Files:**
- Create: `src/hooks/useRouletteGame.ts`
- Create: `src/hooks/useRouletteGame.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useRouletteGame.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouletteGame } from './useRouletteGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playRouletteSpin: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useRouletteGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('starts with spinning=false, betType=null, resultNum=null, default bet=10', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100 }));
    expect(result.current.spinning).toBe(false);
    expect(result.current.betType).toBeNull();
    expect(result.current.resultNum).toBeNull();
    expect(result.current.resultColour).toBeNull();
    expect(result.current.win).toBeNull();
    expect(result.current.bet).toBe(10);
  });

  it('setBetType(t) updates betType', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100 }));
    act(() => { result.current.setBetType('red'); });
    expect(result.current.betType).toBe('red');
  });

  it('spin() does nothing when betType is not set', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(false);
    expect(onUpdateBalance).not.toHaveBeenCalled();
  });

  it('spin() flips spinning=true, debits the bet, clears prior win/message', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });

  it('spin() resolves at ~2500ms — spinning=false and resultNum is in 0..36', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.spinning).toBe(false);
    expect(result.current.resultNum).not.toBeNull();
    expect(result.current.resultNum!).toBeGreaterThanOrEqual(0);
    expect(result.current.resultNum!).toBeLessThanOrEqual(36);
    expect(result.current.resultColour).toMatch(/^(red|black|green)$/);
  });

  it('resultNum is hidden (null) during the spin window and revealed at the end', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.resultNum).toBeNull();
    expect(result.current.resultColour).toBeNull();
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.resultNum).not.toBeNull();
  });

  it('wheelRotation accumulates by ~1800° per spin (5 forward turns + small angle correction)', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    const start = result.current.wheelRotation;
    act(() => { result.current.spin(); });
    // wheelRotation updates synchronously inside spin() — no need to advance timers.
    const delta = result.current.wheelRotation - start;
    // 5 turns ± a sub-360° correction
    expect(delta).toBeGreaterThan(1800 - 360);
    expect(delta).toBeLessThan(1800 + 360);
  });

  it('ballRotation decreases by exactly 2520° per spin (7 ccw turns)', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    const start = result.current.ballRotation;
    act(() => { result.current.spin(); });
    expect(result.current.ballRotation - start).toBe(-2520);
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useRouletteGame.test.ts
```
Expected: `Cannot find module './useRouletteGame'`.

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/useRouletteGame.ts
import { useState, useRef, useCallback } from 'react';
import { angleOfPocket, evaluateRouletteBet, type RouletteColour } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';

export const SETTLE_MS = 2500;
const WHEEL_TURNS = 5;
const BALL_TURNS = 7;

export interface UseRouletteGameOptions {
  theme: ThemeType;
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseRouletteGameReturn {
  bet: number;
  setBet: (n: number) => void;
  betType: string | null;
  setBetType: (t: string | null) => void;
  spinning: boolean;
  /** Result pocket. null while spinning AND before any spin. Set at the end of each spin. */
  resultNum: number | null;
  resultColour: RouletteColour | null;
  win: 'jackpot' | 'small' | null;
  message: string | null;
  /** Cumulative wheel rotation (degrees, clockwise). Updates AT spin start so the wheel
   *  has a known target to decelerate into during the 2.5s spin window. */
  wheelRotation: number;
  /** Cumulative ball rotation (degrees, counter-clockwise — always negative or 0).
   *  Each spin subtracts BALL_TURNS × 360. */
  ballRotation: number;
  spin: () => void;
}

export function useRouletteGame(opts: UseRouletteGameOptions): UseRouletteGameReturn {
  const { theme, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [resultColour, setResultColour] = useState<RouletteColour | null>(null);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const lastTargetRef = useRef<number | null>(null);

  const spin = useCallback(() => {
    if (!betType || spinning || balance < bet) return;

    // Pre-determine the result so the wheel has a target to animate toward during the spin.
    const num = Math.floor(Math.random() * 37);
    const colour: RouletteColour = num === 0 ? 'green' : num % 2 === 1 ? 'red' : 'black';

    // Compute rotation deltas. Wheel: 5 forward turns + correction so pocket `num` lands at top.
    // The correction relies on the previous pocket's angle (or 0 if first spin).
    const lastN = lastTargetRef.current;
    const angleCorrection = lastN === null ? -angleOfPocket(num) : angleOfPocket(lastN) - angleOfPocket(num);
    setWheelRotation(prev => prev + WHEEL_TURNS * 360 + angleCorrection);
    setBallRotation(prev => prev - BALL_TURNS * 360);
    lastTargetRef.current = num;

    setSpinning(true);
    setWin(null);
    setMessage(null);
    setResultNum(null);     // hide cone display until spin settles
    setResultColour(null);
    onUpdateBalance?.(-bet);
    soundEngine.playRouletteSpin(theme, SETTLE_MS);

    setTimeout(() => {
      setResultNum(num);
      setResultColour(colour);
      const won = evaluateRouletteBet(num, colour, betType);
      if (won) {
        const payout = betType.startsWith('number-') ? bet * 35 : bet * 2;
        onUpdateBalance?.(payout);
        const tier: 'jackpot' | 'small' = payout >= bet * 10 ? 'jackpot' : 'small';
        setWin(tier);
        setMessage(`Won ${payout}!`);
        soundEngine.playWin(theme);
      } else {
        setMessage(`Landed on ${num} (${colour}). Better luck next time.`);
        soundEngine.playLose(theme);
      }
      setSpinning(false);
    }, SETTLE_MS);
  }, [bet, balance, betType, theme, spinning, onUpdateBalance]);

  return {
    bet, setBet,
    betType, setBetType,
    spinning,
    resultNum, resultColour,
    win, message,
    wheelRotation, ballRotation,
    spin,
  };
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useRouletteGame.test.ts
```
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRouletteGame.ts src/hooks/useRouletteGame.test.ts
git commit -m "feat(roulette): useRouletteGame hook lifts spin state out of Roulette.tsx"
```

---

## Task 3: `RouletteSegments` pure helper — 37 wedge paths + label positions

**Goal:** Pure module exporting `getRouletteSegments()` which returns an array of 37 segment descriptors `{number, colour, path, labelX, labelY, labelAngle}`. The `path` is an SVG `d` string for one wedge of a 100×100 viewBox circle (centre 50,50; radius 50). Labels sit on a virtual ring at radius 42 (so they fit inside the segment, not the rim). Memoise via top-level `const SEGMENTS = computeSegments();` so the work happens once at module import.

**Files:**
- Create: `src/components/Games/Roulette/RouletteSegments.tsx`
- Create: `src/components/Games/Roulette/RouletteSegments.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Roulette/RouletteSegments.test.tsx
import { describe, it, expect } from 'vitest';
import { getRouletteSegments } from './RouletteSegments';

describe('getRouletteSegments', () => {
  const segments = getRouletteSegments();

  it('returns exactly 37 segments numbered 0..36 in order', () => {
    expect(segments.length).toBe(37);
    for (let i = 0; i < 37; i++) {
      expect(segments[i].number).toBe(i);
    }
  });

  it('marks pocket 0 as green', () => {
    expect(segments[0].colour).toBe('green');
  });

  it('marks odd numbers as red and even (non-zero) as black', () => {
    for (let i = 1; i <= 36; i++) {
      const expected = i % 2 === 1 ? 'red' : 'black';
      expect(segments[i].colour).toBe(expected);
    }
  });

  it('produces 18 red, 18 black, and 1 green segment', () => {
    const counts = segments.reduce(
      (acc, s) => ({ ...acc, [s.colour]: (acc[s.colour] || 0) + 1 }),
      {} as Record<string, number>,
    );
    expect(counts.red).toBe(18);
    expect(counts.black).toBe(18);
    expect(counts.green).toBe(1);
  });

  it('every segment path begins with M50,50 (centre) and ends with Z (closepath)', () => {
    for (const s of segments) {
      expect(s.path.startsWith('M50,50')).toBe(true);
      expect(s.path.endsWith('Z')).toBe(true);
    }
  });

  it('label positions sit inside the wheel (radius < 50) and centred near the wedge midline', () => {
    for (const s of segments) {
      const dx = s.labelX - 50;
      const dy = s.labelY - 50;
      const r = Math.sqrt(dx * dx + dy * dy);
      expect(r).toBeGreaterThan(35);
      expect(r).toBeLessThan(50);
    }
  });

  it('labelAngle for pocket 0 is 0 and grows monotonically through pocket 36', () => {
    expect(segments[0].labelAngle).toBe(0);
    for (let i = 1; i <= 36; i++) {
      expect(segments[i].labelAngle).toBeGreaterThan(segments[i - 1].labelAngle);
    }
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteSegments.test.tsx
```
Expected: `Cannot find module './RouletteSegments'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Roulette/RouletteSegments.tsx
import { angleOfPocket, type RouletteColour } from '../gameLogic';

export interface RouletteSegment {
  number: number;
  colour: RouletteColour;
  /** SVG `d` path string for the wedge in a 100×100 viewBox (centre 50,50; outer radius 50). */
  path: string;
  /** X coordinate of the number label (radius 42 ring). */
  labelX: number;
  /** Y coordinate of the number label (radius 42 ring). */
  labelY: number;
  /** Rotation of the label so its baseline runs radially. Equal to angleOfPocket(n). */
  labelAngle: number;
}

const CENTRE = 50;
const OUTER_RADIUS = 50;
const LABEL_RADIUS = 42;
const SEGMENT_COUNT = 37;
const WEDGE_DEG = 360 / SEGMENT_COUNT; // ≈ 9.7297°

function colourOf(n: number): RouletteColour {
  if (n === 0) return 'green';
  return n % 2 === 1 ? 'red' : 'black';
}

function pointOnCircle(angleDeg: number, r: number): [number, number] {
  // SVG y-axis points down; pocket 0 is at the TOP, so angle 0° = (0, -r) relative to centre.
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [CENTRE + r * Math.cos(rad), CENTRE + r * Math.sin(rad)];
}

function wedgePath(startAngle: number, endAngle: number): string {
  const [x1, y1] = pointOnCircle(startAngle, OUTER_RADIUS);
  const [x2, y2] = pointOnCircle(endAngle, OUTER_RADIUS);
  // largeArcFlag is always 0 for a wedge < 180° (each is ~9.73°).
  return `M${CENTRE},${CENTRE} L${x1.toFixed(3)},${y1.toFixed(3)} A${OUTER_RADIUS},${OUTER_RADIUS} 0 0 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
}

function computeSegments(): RouletteSegment[] {
  const out: RouletteSegment[] = [];
  for (let n = 0; n < SEGMENT_COUNT; n++) {
    const startAngle = n * WEDGE_DEG - WEDGE_DEG / 2;  // wedge centred ON pocket angle
    const endAngle = startAngle + WEDGE_DEG;
    const labelAngle = angleOfPocket(n);
    const [labelX, labelY] = pointOnCircle(labelAngle, LABEL_RADIUS);
    out.push({
      number: n,
      colour: colourOf(n),
      path: wedgePath(startAngle, endAngle),
      labelX,
      labelY,
      labelAngle,
    });
  }
  return out;
}

const SEGMENTS = computeSegments();

export function getRouletteSegments(): RouletteSegment[] {
  return SEGMENTS;
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteSegments.test.tsx
```
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteSegments.tsx src/components/Games/Roulette/RouletteSegments.test.tsx
git commit -m "feat(roulette): RouletteSegments pure helper — 37 wedges + label positions"
```

---

## Task 4: `RouletteWheel` — static SVG (segments only, no animation)

**Goal:** Render the 37 wedge segments + their number labels inside an SVG with viewBox `0 0 100 100`. No outer rim, no inner cone, no pointer, no ball, no animation yet — just the segments. This task locks the rendering contract before chrome and animation pile on.

**Files:**
- Create: `src/components/Games/Roulette/RouletteWheel.tsx`
- Create: `src/components/Games/Roulette/RouletteWheel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Roulette/RouletteWheel.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouletteWheel } from './RouletteWheel';

describe('RouletteWheel', () => {
  afterEach(() => cleanup());

  it('renders an SVG root with the slot-wheel testid', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const svg = screen.getByTestId('roulette-wheel');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('renders 37 segment paths with data-pocket attributes 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const paths = container.querySelectorAll('[data-pocket]');
    expect(paths.length).toBe(37);
    const pockets = Array.from(paths).map(p => Number(p.getAttribute('data-pocket')));
    expect(pockets).toEqual([...Array(37).keys()]);
  });

  it('marks pocket 0 with data-colour="green"', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const zero = container.querySelector('[data-pocket="0"]');
    expect(zero?.getAttribute('data-colour')).toBe('green');
  });

  it('renders 37 number labels (text elements) for pockets 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const labels = container.querySelectorAll('[data-pocket-label]');
    expect(labels.length).toBe(37);
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: `Cannot find module './RouletteWheel'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Roulette/RouletteWheel.tsx
import { type ThemeType } from '../../../utils/themeManifesto';
import { getRouletteSegments } from './RouletteSegments';

export interface RouletteWheelProps {
  theme: ThemeType;
  spinning: boolean;
  /** When set (after a spin settles), the wheel rests at this pocket's angle. */
  resultNum: number | null;
}

const SEGMENT_FILL: Record<'red' | 'black' | 'green', string> = {
  red: '#dc2626',
  black: '#171717',
  green: '#16a34a',
};

export function RouletteWheel({ theme, spinning: _spinning, resultNum: _resultNum }: RouletteWheelProps) {
  const segments = getRouletteSegments();
  return (
    <svg
      data-testid="roulette-wheel"
      data-theme={theme}
      viewBox="0 0 100 100"
      className="w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh]"
    >
      {segments.map(seg => (
        <path
          key={seg.number}
          d={seg.path}
          fill={SEGMENT_FILL[seg.colour]}
          stroke="#fbbf24"
          strokeWidth={0.15}
          data-pocket={seg.number}
          data-colour={seg.colour}
        />
      ))}
      {segments.map(seg => (
        <text
          key={`label-${seg.number}`}
          x={seg.labelX}
          y={seg.labelY}
          fontSize={3}
          fill="#fff"
          textAnchor="middle"
          dominantBaseline="central"
          data-pocket-label={seg.number}
          transform={`rotate(${seg.labelAngle} ${seg.labelX} ${seg.labelY})`}
        >
          {seg.number}
        </text>
      ))}
    </svg>
  );
}
```

The two unused-prefix arguments `_spinning` and `_resultNum` are placeholders — Tasks 5–8 will wire them in. The underscore prefix is a TypeScript convention to mark intentionally-unused parameters; if your `tsconfig` enforces `noUnusedParameters`, the underscore opts out.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx
git commit -m "feat(roulette): RouletteWheel — static SVG, 37 segments + labels"
```

---

## Task 5: `RouletteWheel` — themed chrome (rim + inner cone + pointer)

**Goal:** Wrap the segments in themed chrome: outer rim (themed border colour from manifesto), inner cone (themed centre disk holding the winning number once it's known), and a fixed pointer at 12 o'clock. **One unified shape across all 8 themes** — the per-theme distinction comes from `border-theme-primary` + `bg-theme-bg` + `text-theme-accent` Tailwind classes (already wired by Plan 1's CSS variables). Bespoke per-theme rim shapes (sweets candy double-rim, gold-leaf hieroglyph, neon-tube glow, etc) are an explicit deferral.

**Files:**
- Modify: `src/components/Games/Roulette/RouletteWheel.tsx`
- Modify: `src/components/Games/Roulette/RouletteWheel.test.tsx`

- [ ] **Step 1: Write the failing test (append to existing describe block)**

```tsx
  it('renders the outer rim with data-testid="roulette-rim"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-rim')).toBeTruthy();
  });

  it('renders the inner cone with data-testid="roulette-cone"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-cone')).toBeTruthy();
  });

  it('renders the fixed pointer with data-testid="roulette-pointer"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-pointer')).toBeTruthy();
  });

  it('cone shows the result number when resultNum is set, "—" when null', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('—');
    rerender(<RouletteWheel theme="sweets" spinning={false} resultNum={17} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('17');
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 4 new tests fail (`Unable to find an element by: [data-testid="roulette-rim"]` and similar).

- [ ] **Step 3: Modify `RouletteWheel.tsx`**

Replace the body with the chrome-wrapped version:

```tsx
// src/components/Games/Roulette/RouletteWheel.tsx
import { type ThemeType } from '../../../utils/themeManifesto';
import { getRouletteSegments } from './RouletteSegments';

export interface RouletteWheelProps {
  theme: ThemeType;
  spinning: boolean;
  resultNum: number | null;
}

const SEGMENT_FILL: Record<'red' | 'black' | 'green', string> = {
  red: '#dc2626',
  black: '#171717',
  green: '#16a34a',
};

export function RouletteWheel({ theme, spinning: _spinning, resultNum }: RouletteWheelProps) {
  const segments = getRouletteSegments();
  return (
    <div
      data-testid="roulette-wheel-frame"
      data-theme={theme}
      className="relative w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh]"
    >
      <svg
        data-testid="roulette-wheel"
        data-theme={theme}
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        {segments.map(seg => (
          <path
            key={seg.number}
            d={seg.path}
            fill={SEGMENT_FILL[seg.colour]}
            stroke="#fbbf24"
            strokeWidth={0.15}
            data-pocket={seg.number}
            data-colour={seg.colour}
          />
        ))}
        {segments.map(seg => (
          <text
            key={`label-${seg.number}`}
            x={seg.labelX}
            y={seg.labelY}
            fontSize={3}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
            data-pocket-label={seg.number}
            transform={`rotate(${seg.labelAngle} ${seg.labelX} ${seg.labelY})`}
          >
            {seg.number}
          </text>
        ))}
      </svg>

      {/* Outer rim — unified shape, themed border */}
      <div
        data-testid="roulette-rim"
        className="absolute inset-0 rounded-full border-[1.2vh] border-theme-primary pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
      />

      {/* Inner cone — unified disk, themed bg, displays winning number */}
      <div
        data-testid="roulette-cone"
        data-pocket={resultNum ?? ''}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-theme-bg border-[0.5vh] border-theme-accent flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-theme-accent shadow-[0_0_20px_rgba(0,0,0,0.4)]"
      >
        {resultNum !== null ? resultNum : '—'}
      </div>

      {/* Fixed pointer at 12 o'clock — unified shape, themed accent */}
      <div
        data-testid="roulette-pointer"
        className="absolute top-[-1vh] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[1.5vh] border-r-[1.5vh] border-t-[2.5vh] border-l-transparent border-r-transparent border-t-theme-accent z-20 drop-shadow-md"
      />
    </div>
  );
}
```

The `_spinning` parameter is still unused (Task 7 will wire the spin animation). The chrome elements (rim/cone/pointer) sit inside a positioned wrapper `<div data-testid="roulette-wheel-frame">` so they can overlay the SVG correctly. The earlier test's `screen.getByTestId('roulette-wheel')` still resolves to the inner SVG — no change there.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 8 passed (4 prior + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx
git commit -m "feat(roulette): RouletteWheel chrome — themed rim, inner cone, fixed pointer"
```

---

## Task 6: `RouletteWheel` — orbiting ball (static positioning at result pocket)

**Goal:** Add a small ball element to the wheel. When `resultNum` is set, the ball sits at that pocket's outer-edge angle. When `resultNum` is null, the ball sits at the top (pocket 0). **No spin animation yet** — Task 7 adds the orbit. The ball is a single unified shape (small circle, theme accent colour), per the unified-shape scoping decision (bespoke gumball/scarab/asteroid/pearl variants are deferred).

**Files:**
- Modify: `src/components/Games/Roulette/RouletteWheel.tsx`
- Modify: `src/components/Games/Roulette/RouletteWheel.test.tsx`

- [ ] **Step 1: Append the failing test**

```tsx
  it('renders the orbiting ball with data-testid="roulette-ball"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-ball')).toBeTruthy();
  });

  it('ball data-pocket attribute reflects resultNum (or 0 when null)', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    expect(screen.getByTestId('roulette-ball').getAttribute('data-pocket')).toBe('0');
    rerender(<RouletteWheel theme="sweets" spinning={false} resultNum={17} />);
    expect(screen.getByTestId('roulette-ball').getAttribute('data-pocket')).toBe('17');
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 2 new tests fail.

- [ ] **Step 3: Modify `RouletteWheel.tsx`** — add the ball element. Inside the wheel-frame div (after the pointer, before the closing `</div>`):

```tsx
import { angleOfPocket } from '../gameLogic';
// ...
const ballPocket = resultNum ?? 0;
const ballAngle = angleOfPocket(ballPocket); // 0..360 degrees, clockwise from top
// ...
{/* Inside the frame div, after the pointer: */}
<div
  data-testid="roulette-ball"
  data-pocket={ballPocket}
  className="absolute top-1/2 left-1/2 w-[2vh] h-[2vh] -mt-[1vh] -ml-[1vh] z-10 pointer-events-none"
  style={{ transform: `rotate(${ballAngle}deg) translateY(-37%)` }}
>
  <div className="w-full h-full rounded-full bg-white border-[0.3vh] border-theme-accent shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
</div>
```

The two-layer pattern (outer wrapper rotated + translated, inner disk visual) is necessary so the ball orbits around the wheel's centre rather than around its own centre. `translateY(-37%)` (relative to the wheel frame's height) puts the ball just inside the rim. Refer to the wheel-frame's coordinate space (the wheel-frame is the absolute parent — `top-1/2 left-1/2` puts the ball wrapper's anchor at centre; the rotation + translate then orbits it).

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 10 passed (8 prior + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx
git commit -m "feat(roulette): RouletteWheel — orbiting ball (static at result pocket)"
```

---

## Task 7: `RouletteWheel` — spin animation (wheel rotation + ball orbit driven by hook accumulators)

**Goal:** When `spinning=true` and the wheel's `wheelRotation` / `ballRotation` props change (which happens IN sync with `spinning` becoming true, because the hook updates them at spin start), Framer Motion animates the wheel-segment group from the previous rotation to the new one over 2.5s with cubic deceleration. Wheel rotates clockwise ~5 turns (`+1800° + correction`); ball orbits counter-clockwise 7 turns (`-2520°`). Both use the spec's easing `cubic-bezier(0.15, 0, 0.25, 1)`.

**Why props instead of an internal accumulator?** Earlier drafts of this plan had the wheel maintain its own accumulator via `useRef` + `useEffect`. That has a load-bearing race: the effect fires AFTER render, so the ref-update lands one render too late, AND refs don't trigger re-render — so motion would never see the new target during the spin. The hook (Task 2) is the single source of truth for rotation accumulators; the wheel just binds them.

**Files:**
- Modify: `src/components/Games/Roulette/RouletteWheel.tsx`
- Modify: `src/components/Games/Roulette/RouletteWheel.test.tsx`

- [ ] **Step 1: Append the failing tests**

```tsx
  it('exposes data-spinning attribute reflecting the spinning prop', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-frame').getAttribute('data-spinning')).toBe('false');
    rerender(<RouletteWheel theme="sweets" spinning={true} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-frame').getAttribute('data-spinning')).toBe('true');
  });

  it('renders the segment-rotation group with data-testid="roulette-wheel-segments"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-segments')).toBeTruthy();
  });
```

**Update existing tests** that called `<RouletteWheel theme="sweets" spinning={false} resultNum={null} />` (Tasks 4, 5, 6) — append `wheelRotation={0} ballRotation={0}` to every render call. The defaults could be made optional in the props interface, but explicit-pass keeps the tests honest about what the wheel needs.

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 2 new tests fail (segment-rotation group doesn't exist; data-spinning attribute not yet wired). Existing tests should still pass after you've added the new prop defaults.

- [ ] **Step 3: Modify `RouletteWheel.tsx`** — wrap segments + labels in a Framer `motion.g`, wrap the ball wrapper in a Framer `motion.div`, take rotations as props. Replace the file body:

```tsx
// src/components/Games/Roulette/RouletteWheel.tsx
import { motion } from 'motion/react';
import { type ThemeType } from '../../../utils/themeManifesto';
import { getRouletteSegments } from './RouletteSegments';

export interface RouletteWheelProps {
  theme: ThemeType;
  spinning: boolean;
  resultNum: number | null;
  /** Cumulative wheel rotation in degrees (clockwise positive). Owned by `useRouletteGame`. */
  wheelRotation: number;
  /** Cumulative ball rotation in degrees (counter-clockwise, so always ≤ 0). */
  ballRotation: number;
}

const SEGMENT_FILL: Record<'red' | 'black' | 'green', string> = {
  red: '#dc2626',
  black: '#171717',
  green: '#16a34a',
};

const SPIN_DURATION_S = 2.5;
const SPIN_EASE = [0.15, 0, 0.25, 1] as const;

export function RouletteWheel({ theme, spinning, resultNum, wheelRotation, ballRotation }: RouletteWheelProps) {
  const segments = getRouletteSegments();
  const ballPocket = resultNum ?? 0;
  const transition = spinning
    ? { duration: SPIN_DURATION_S, ease: SPIN_EASE }
    : { duration: 0 };

  return (
    <div
      data-testid="roulette-wheel-frame"
      data-theme={theme}
      data-spinning={spinning ? 'true' : 'false'}
      className="relative w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh]"
    >
      <svg
        data-testid="roulette-wheel"
        data-theme={theme}
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        <motion.g
          data-testid="roulette-wheel-segments"
          animate={{ rotate: wheelRotation }}
          transition={transition}
          style={{ transformOrigin: '50px 50px' }}
        >
          {segments.map(seg => (
            <path
              key={seg.number}
              d={seg.path}
              fill={SEGMENT_FILL[seg.colour]}
              stroke="#fbbf24"
              strokeWidth={0.15}
              data-pocket={seg.number}
              data-colour={seg.colour}
            />
          ))}
          {segments.map(seg => (
            <text
              key={`label-${seg.number}`}
              x={seg.labelX}
              y={seg.labelY}
              fontSize={3}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="central"
              data-pocket-label={seg.number}
              transform={`rotate(${seg.labelAngle} ${seg.labelX} ${seg.labelY})`}
            >
              {seg.number}
            </text>
          ))}
        </motion.g>
      </svg>

      <div
        data-testid="roulette-rim"
        className="absolute inset-0 rounded-full border-[1.2vh] border-theme-primary pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
      />

      <div
        data-testid="roulette-cone"
        data-pocket={resultNum ?? ''}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-theme-bg border-[0.5vh] border-theme-accent flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-theme-accent shadow-[0_0_20px_rgba(0,0,0,0.4)] z-10"
      >
        {resultNum !== null ? resultNum : '—'}
      </div>

      <motion.div
        data-testid="roulette-ball"
        data-pocket={ballPocket}
        animate={{ rotate: ballRotation }}
        transition={transition}
        className="absolute top-1/2 left-1/2 w-[2vh] h-[2vh] -mt-[1vh] -ml-[1vh] z-10 pointer-events-none"
        style={{ transformOrigin: '50% 50%' }}
      >
        {/* Outer wrapper rotates around the wheel centre; the inner disk visual sits offset to the rim. */}
        <div
          className="w-full h-full"
          style={{ transform: 'translateY(-16.5vh)' }}
        >
          <div className="w-full h-full rounded-full bg-white border-[0.3vh] border-theme-accent shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        </div>
      </motion.div>

      <div
        data-testid="roulette-pointer"
        className="absolute top-[-1vh] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[1.5vh] border-r-[1.5vh] border-t-[2.5vh] border-l-transparent border-r-transparent border-t-theme-accent z-20 drop-shadow-md"
      />
    </div>
  );
}
```

The ball's inner-div offset `translateY(-16.5vh)` is roughly `(35vh frame / 2) - 1vh` for the mobile breakpoint, putting the ball just inside the rim. At `md:45vh` the ball will sit slightly farther from the rim — acceptable for v1; a polish-pass could compute via `ResizeObserver` or use a percent-of-frame calc.

After this task, when the hook updates `wheelRotation` (at spin start, in the same render where `spinning` flips to `true`), motion sees the new value with `duration: 2.5s` and animates over the spin window. When `spinning` flips back to `false` at the end, transition becomes `duration: 0` — but the wheel rotation hasn't changed, so motion has nothing to animate (already at target). Wheel sits at the result angle.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 12 passed (10 prior + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx
git commit -m "feat(roulette): RouletteWheel spin animation — clockwise wheel + ccw ball"
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 12 passed (10 prior + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx
git commit -m "feat(roulette): RouletteWheel spin animation — clockwise wheel + ccw ball"
```

---

## Task 8: `BetTable` — felt cloth + 4 bet cells with chip drop on selection

**Goal:** A bet table with felt-cloth background (diagonal-stripe pattern) and 4 bet cells (RED / BLACK / EVEN / ODD), each with its own visual treatment (red gradient, black gradient, diagonal red/black for EVEN, mirror for ODD). Clicking a cell sets the active bet type; the active cell gets a yellow ring + lift, and a themed chip "drops" onto it (translateY-from-above + bounce via Framer Motion). Cells are disabled while spinning.

**Files:**
- Create: `src/components/Games/Roulette/BetTable.tsx`
- Create: `src/components/Games/Roulette/BetTable.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Roulette/BetTable.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BetTable } from './BetTable';

describe('BetTable', () => {
  afterEach(() => cleanup());

  it('renders 4 bet cells: red, black, even, odd', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={false} />);
    const cells = screen.getAllByTestId(/^bet-cell-/);
    expect(cells.length).toBe(4);
    const types = cells.map(c => c.getAttribute('data-bet-type')).sort();
    expect(types).toEqual(['black', 'even', 'odd', 'red']);
  });

  it('clicking a cell calls onSelect with that bet type', () => {
    const onSelect = vi.fn();
    render(<BetTable bet={10} betType={null} onSelect={onSelect} disabled={false} />);
    fireEvent.click(screen.getByTestId('bet-cell-red'));
    expect(onSelect).toHaveBeenCalledWith('red');
  });

  it('the active cell has data-active="true"', () => {
    render(<BetTable bet={10} betType="even" onSelect={vi.fn()} disabled={false} />);
    expect(screen.getByTestId('bet-cell-even').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('bet-cell-red').getAttribute('data-active')).toBe('false');
  });

  it('renders the bet chip on the active cell with the bet amount', () => {
    render(<BetTable bet={25} betType="black" onSelect={vi.fn()} disabled={false} />);
    const chip = screen.getByTestId('bet-chip');
    expect(chip.textContent).toContain('25');
    // Chip should be inside the active cell's subtree.
    const activeCell = screen.getByTestId('bet-cell-black');
    expect(activeCell.contains(chip)).toBe(true);
  });

  it('renders no chip when betType is null', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={false} />);
    expect(screen.queryByTestId('bet-chip')).toBeNull();
  });

  it('disables all cells when disabled=true', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={true} />);
    for (const cell of screen.getAllByTestId(/^bet-cell-/)) {
      expect(cell.hasAttribute('disabled')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/BetTable.test.tsx
```
Expected: `Cannot find module './BetTable'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Roulette/BetTable.tsx
import { motion } from 'motion/react';

export type BetType = 'red' | 'black' | 'even' | 'odd';

export interface BetTableProps {
  bet: number;
  betType: string | null;
  onSelect: (t: BetType) => void;
  disabled: boolean;
}

const BET_CELL_TREATMENT: Record<BetType, string> = {
  red: 'bg-gradient-to-br from-red-500 to-red-700',
  black: 'bg-gradient-to-br from-gray-800 to-black',
  even: 'bg-[linear-gradient(135deg,_#dc2626_0%,_#dc2626_50%,_#171717_50%,_#171717_100%)]',
  odd: 'bg-[linear-gradient(135deg,_#171717_0%,_#171717_50%,_#dc2626_50%,_#dc2626_100%)]',
};

const BET_CELLS: BetType[] = ['red', 'black', 'even', 'odd'];

export function BetTable({ bet, betType, onSelect, disabled }: BetTableProps) {
  return (
    <div
      data-testid="bet-table"
      className="w-full max-w-2xl rounded-xl p-3 md:p-4 bg-[repeating-linear-gradient(45deg,_#065f46_0px,_#065f46_8px,_#047857_8px,_#047857_16px)] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {BET_CELLS.map(type => {
          const isActive = betType === type;
          return (
            <button
              key={type}
              data-testid={`bet-cell-${type}`}
              data-bet-type={type}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onSelect(type)}
              disabled={disabled}
              className={`relative py-[2vh] rounded-lg text-[2vh] md:text-[2.5vh] uppercase font-bold tracking-wider text-white transition-all duration-200 ${BET_CELL_TREATMENT[type]} ${
                isActive
                  ? 'ring-[0.4vh] ring-yellow-400 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              {type}
              {isActive && (
                <motion.div
                  data-testid="bet-chip"
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[5vh] h-[5vh] rounded-full bg-theme-accent border-[0.4vh] border-white flex items-center justify-center text-[1.5vh] md:text-[1.8vh] text-white font-bold shadow-[0_4px_8px_rgba(0,0,0,0.4)] pointer-events-none"
                >
                  {bet}
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/BetTable.test.tsx
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/BetTable.tsx src/components/Games/Roulette/BetTable.test.tsx
git commit -m "feat(roulette): BetTable — felt cloth + 4 cells + chip drop on active"
```

---

## Task 9: `ResultStrip` — pocket badge + result message + slide-in

**Goal:** Below the bet table: a strip showing the result pocket as a coloured badge plus a themed result message. Slides in from below when `resultNum` lands; hidden when `resultNum` is null. Win vs loss text differs (per the spec): win = `"Won {payout}!"` (passed in via `message` prop), loss = `"Landed on {n} ({colour}). Better luck next time."` — both come from `useRouletteGame`'s `message` field, so this component just renders what it's given.

**Files:**
- Create: `src/components/Games/Roulette/ResultStrip.tsx`
- Create: `src/components/Games/Roulette/ResultStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Roulette/ResultStrip.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResultStrip } from './ResultStrip';

describe('ResultStrip', () => {
  afterEach(() => cleanup());

  it('renders nothing when resultNum is null', () => {
    render(<ResultStrip resultNum={null} resultColour={null} message={null} />);
    expect(screen.queryByTestId('result-strip')).toBeNull();
  });

  it('renders the pocket badge with the result number when resultNum is set', () => {
    render(<ResultStrip resultNum={17} resultColour="black" message="Landed on 17 (black). Better luck next time." />);
    const badge = screen.getByTestId('result-pocket-badge');
    expect(badge.textContent).toContain('17');
    expect(badge.getAttribute('data-colour')).toBe('black');
  });

  it('renders the message text', () => {
    render(<ResultStrip resultNum={7} resultColour="red" message="Won 20!" />);
    expect(screen.getByTestId('result-strip').textContent).toContain('Won 20!');
  });

  it('badge data-colour reflects the result colour', () => {
    const { rerender } = render(<ResultStrip resultNum={0} resultColour="green" message="Landed on 0." />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('green');
    rerender(<ResultStrip resultNum={36} resultColour="red" message="Landed on 36." />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('red');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/ResultStrip.test.tsx
```
Expected: `Cannot find module './ResultStrip'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Roulette/ResultStrip.tsx
import { motion } from 'motion/react';
import { type RouletteColour } from '../gameLogic';

export interface ResultStripProps {
  resultNum: number | null;
  resultColour: RouletteColour | null;
  message: string | null;
}

const BADGE_BG: Record<RouletteColour, string> = {
  red: 'bg-red-600',
  black: 'bg-black',
  green: 'bg-green-600',
};

export function ResultStrip({ resultNum, resultColour, message }: ResultStripProps) {
  if (resultNum === null || resultColour === null) return null;
  return (
    <motion.div
      data-testid="result-strip"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-3 md:gap-4 px-4 py-2 md:py-3 rounded-xl bg-theme-bg/70 backdrop-blur-sm border-[0.3vh] border-theme-accent/40 shadow-md"
    >
      <div
        data-testid="result-pocket-badge"
        data-colour={resultColour}
        className={`w-[5vh] h-[5vh] rounded-full ${BADGE_BG[resultColour]} flex items-center justify-center text-white text-[2.5vh] font-bold border-[0.3vh] border-white shadow-md`}
      >
        {resultNum}
      </div>
      <span className="text-theme-text text-[2vh] md:text-[2.2vh] font-medium">{message}</span>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/ResultStrip.test.tsx
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/ResultStrip.tsx src/components/Games/Roulette/ResultStrip.test.tsx
git commit -m "feat(roulette): ResultStrip — pocket badge + themed message, slides in"
```

---

## Task 10: `RouletteSurface` orchestrator

**Goal:** Compose `RouletteWheel` + `BetTable` + `ResultStrip` into a single surface. Pure presenter (analog of Plan 3's `SlotMachine`). Reads `theme` and `game` (`UseRouletteGameReturn`) as props.

**Files:**
- Create: `src/components/Games/Roulette/RouletteSurface.tsx`
- Create: `src/components/Games/Roulette/RouletteSurface.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Roulette/RouletteSurface.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouletteSurface } from './RouletteSurface';
import type { UseRouletteGameReturn } from '../../../hooks/useRouletteGame';

const baseGame: UseRouletteGameReturn = {
  bet: 10,
  setBet: () => {},
  betType: null,
  setBetType: () => {},
  spinning: false,
  resultNum: null,
  resultColour: null,
  win: null,
  message: null,
  wheelRotation: 0,
  ballRotation: 0,
  spin: () => {},
};

describe('RouletteSurface', () => {
  afterEach(() => cleanup());

  it('renders the wheel, bet table, and (no) result strip when no result', () => {
    render(<RouletteSurface theme="sweets" game={baseGame} />);
    expect(screen.getByTestId('roulette-wheel')).toBeTruthy();
    expect(screen.getByTestId('bet-table')).toBeTruthy();
    expect(screen.queryByTestId('result-strip')).toBeNull();
  });

  it('renders the result strip when resultNum is set', () => {
    render(<RouletteSurface theme="sweets" game={{ ...baseGame, resultNum: 17, resultColour: 'black', message: 'Landed on 17 (black). Better luck next time.' }} />);
    expect(screen.getByTestId('result-strip')).toBeTruthy();
  });

  it('cone shows resultNum when set', () => {
    render(<RouletteSurface theme="sweets" game={{ ...baseGame, resultNum: 7, resultColour: 'red', message: 'Won 20!' }} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('7');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteSurface.test.tsx
```
Expected: `Cannot find module './RouletteSurface'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Roulette/RouletteSurface.tsx
import { type UseRouletteGameReturn } from '../../../hooks/useRouletteGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { RouletteWheel } from './RouletteWheel';
import { BetTable, type BetType } from './BetTable';
import { ResultStrip } from './ResultStrip';

export interface RouletteSurfaceProps {
  theme: ThemeType;
  game: UseRouletteGameReturn;
}

export function RouletteSurface({ theme, game }: RouletteSurfaceProps) {
  return (
    <div data-testid="roulette-surface" className="flex flex-col items-center gap-4 md:gap-6">
      <div className="relative flex items-center justify-center">
        <RouletteWheel
          theme={theme}
          spinning={game.spinning}
          resultNum={game.resultNum}
          wheelRotation={game.wheelRotation}
          ballRotation={game.ballRotation}
        />
      </div>
      <BetTable
        bet={game.bet}
        betType={game.betType}
        onSelect={(t: BetType) => game.setBetType(t)}
        disabled={game.spinning}
      />
      <ResultStrip resultNum={game.resultNum} resultColour={game.resultColour} message={game.message} />
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteSurface.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteSurface.tsx src/components/Games/Roulette/RouletteSurface.test.tsx
git commit -m "feat(roulette): RouletteSurface orchestrator (wheel + bet table + result strip)"
```

---

## Task 11: Replace `Roulette.tsx` body with the RouletteSurface wrapper

**Goal:** `Roulette.tsx` shrinks from 140 lines to ~50. It still renders inside `GameShell`. Props interface unchanged so `App.tsx` import stays unchanged. **Also fixes the `ThemeType` import path** from `'../../App'` to `'../../utils/themeManifesto'` (canonical post-Plan-1 source — see Plan 3 progress doc, "How to apply" section).

**Files:**
- Modify: `src/components/Games/Roulette.tsx`
- Create: `src/components/Games/Roulette.test.tsx` (light integration test — old Roulette.test.tsx exists with 1 test from Plan 2; we'll add to it OR replace it depending on what's there)

- [ ] **Step 1: Read the existing test file and decide whether to extend or replace**

```bash
ls -la src/components/Games/Roulette.test.tsx 2>&1
```

If it exists (it does — Plan 2 added one test for the bet-type-required label), READ it and APPEND new tests to its existing describe block. If it doesn't exist, create the new file with the full test code below.

- [ ] **Step 2: Write the failing test**

If creating new, the full file:

```tsx
// src/components/Games/Roulette.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { Roulette } from './Roulette';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: { playRouletteSpin: vi.fn(), playWin: vi.fn(), playLose: vi.fn(), setMuted: vi.fn() },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: { bg_roulette_sweets: 'https://x/bg.png', roulette_sweets: 'https://x/icon.png' },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderRoulette = (overrides: Partial<React.ComponentProps<typeof Roulette>> = {}) =>
  render(
    <AudioControlsProvider>
      <Roulette
        name="Sweet Spin"
        theme="sweets"
        balance={100}
        onUpdateBalance={vi.fn()}
        onBack={vi.fn()}
        {...overrides}
      />
    </AudioControlsProvider>
  );

describe('Roulette (integration)', () => {
  afterEach(() => cleanup());

  it('renders the roulette wheel inside GameShell', () => {
    renderRoulette();
    expect(screen.getByTestId('roulette-wheel')).toBeTruthy();
  });

  it('renders the bet table with 4 cells', () => {
    renderRoulette();
    const cells = screen.getAllByTestId(/^bet-cell-/);
    expect(cells.length).toBe(4);
  });

  it('hero button label reads "Pick Red / Black / Even / Odd" until a bet type is chosen', () => {
    renderRoulette();
    expect(screen.getByRole('button', { name: /pick red \/ black \/ even \/ odd/i })).toBeTruthy();
  });

  it('after clicking a bet cell, hero button label changes to "SPIN THE WHEEL"', () => {
    renderRoulette();
    fireEvent.click(screen.getByTestId('bet-cell-red'));
    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeTruthy();
  });
});
```

If the existing file exists and has the bet-type-required test, KEEP its assertion (it's the same as test 3 above) and add the other 3.

- [ ] **Step 3: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette.test.tsx
```
Expected: today's `Roulette.tsx` does NOT render `<RouletteWheel>` (only the placeholder circle) — assertion #1 fails.

- [ ] **Step 4: Replace `Roulette.tsx`**

```tsx
// src/components/Games/Roulette.tsx
import { GameShell } from './GameShell';
import { useRouletteGame } from '../../hooks/useRouletteGame';
import { RouletteSurface } from './Roulette/RouletteSurface';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Roulette({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const game = useRouletteGame({ theme, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_roulette_${theme}`}
      extraAssetKeys={[`roulette_${theme}`]}
      gameType="roulette"
      win={game.win}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.spin}
      playLabel={game.spinning ? 'SPINNING...' : !game.betType ? 'Pick Red / Black / Even / Odd' : 'SPIN THE WHEEL'}
      playDisabled={game.spinning || !game.betType}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <RouletteSurface theme={theme} game={game} />
    </GameShell>
  );
}
```

- [ ] **Step 5: Run all roulette tests and observe PASS**

```bash
npx vitest run src/components/Games/Roulette.test.tsx src/components/Games/Roulette/ src/hooks/useRouletteGame.test.ts
```
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/Roulette.tsx src/components/Games/Roulette.test.tsx
git commit -m "refactor(roulette): Roulette.tsx is now a thin GameShell + RouletteSurface wrapper"
```

---

## Task 12: In-window win pulses (result-pocket pulse + cone pulse + winning-number flash)

**Goal:** When the spin lands on a win, the result pocket on the wheel pulses in theme accent, the inner cone pulses larger, and the winning number flashes. The pulses are triggered by `win !== null` (which `useRouletteGame` sets based on `evaluateRouletteBet`'s output). Most of the wiring is already in place; this task is the assertion test that locks it in + any minor SlotReel-style wire-up needed.

**Files:**
- Modify: `src/components/Games/Roulette/RouletteWheel.tsx` (only if the wiring isn't already in place)
- Modify: `src/components/Games/Roulette/RouletteWheel.test.tsx` (add assertion)

- [ ] **Step 1: Append the failing tests**

```tsx
  it('marks the result pocket with data-winning="true" when win prop is set', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={17} wheelRotation={0} ballRotation={0} win="small" />);
    const pocket17 = screen.getByTestId('roulette-wheel-frame').querySelector('[data-pocket="17"]');
    expect(pocket17?.getAttribute('data-winning')).toBe('true');
  });

  it('inner cone has data-winning="true" when win prop is set', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={17} wheelRotation={0} ballRotation={0} win="jackpot" />);
    expect(screen.getByTestId('roulette-cone').getAttribute('data-winning')).toBe('true');
  });

  it('inner cone has data-winning="false" when win is null', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={17} wheelRotation={0} ballRotation={0} win={null} />);
    expect(screen.getByTestId('roulette-cone').getAttribute('data-winning')).toBe('false');
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx
```
Expected: 3 new tests fail (`win` prop doesn't exist yet on RouletteWheel; data-winning attributes aren't set).

- [ ] **Step 3: Modify `RouletteWheel.tsx`** — add `win` prop and pulse wiring.

In `RouletteWheelProps`, add:

```ts
  win?: 'jackpot' | 'small' | null;
```

In the function signature, accept it:

```ts
export function RouletteWheel({ theme, spinning, resultNum, win = null }: RouletteWheelProps) {
```

In the segments map, change the path render to include `data-winning`:

```tsx
{segments.map(seg => (
  <path
    key={seg.number}
    d={seg.path}
    fill={SEGMENT_FILL[seg.colour]}
    stroke={resultNum !== null && seg.number === resultNum && win !== null ? '#facc15' : '#fbbf24'}
    strokeWidth={resultNum !== null && seg.number === resultNum && win !== null ? 0.6 : 0.15}
    data-pocket={seg.number}
    data-colour={seg.colour}
    data-winning={resultNum !== null && seg.number === resultNum && win !== null ? 'true' : 'false'}
  />
))}
```

In the cone div, add `data-winning` and a Framer pulse when winning:

Replace the cone block with a `motion.div`:

```tsx
<motion.div
  data-testid="roulette-cone"
  data-pocket={resultNum ?? ''}
  data-winning={win !== null ? 'true' : 'false'}
  animate={win !== null ? { scale: [1, 1.15, 1] } : { scale: 1 }}
  transition={{ duration: 0.6, repeat: win !== null ? 2 : 0, ease: 'easeInOut' }}
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-theme-bg border-[0.5vh] border-theme-accent flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-theme-accent shadow-[0_0_20px_rgba(0,0,0,0.4)] z-10"
>
  {resultNum !== null ? resultNum : '—'}
</motion.div>
```

You'll also need to update `RouletteSurface.tsx` to pass `win` through to `RouletteWheel`:

```tsx
<RouletteWheel
  theme={theme}
  spinning={game.spinning}
  resultNum={game.resultNum}
  wheelRotation={game.wheelRotation}
  ballRotation={game.ballRotation}
  win={game.win}
/>
```

`baseGame` in `RouletteSurface.test.tsx` already has `win: null` plus `wheelRotation: 0, ballRotation: 0` from Task 10 — no further change there.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Roulette/RouletteWheel.test.tsx src/components/Games/Roulette/RouletteSurface.test.tsx
```
Expected: 15 (12 + 3) for RouletteWheel, 3 for RouletteSurface.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Roulette/RouletteWheel.tsx src/components/Games/Roulette/RouletteWheel.test.tsx src/components/Games/Roulette/RouletteSurface.tsx
git commit -m "feat(roulette): in-window win pulses — result pocket + cone scale-pulse"
```

---

## Task 13: Verification gate

**Goal:** Confirm the full repo is green and the bundle stays within budget. No commit unless all gates pass.

- [ ] **Step 1: Lint**

```bash
npm run lint
```
Expected: exit 0. If TS errors surface, fix them in this task before proceeding (do NOT skip-and-commit).

- [ ] **Step 2: Test**

```bash
npm test
```
Expected: All test files pass (Plan 3 baseline was 257/257 across 46 files; Plan 4 adds 7 new test files — `useRouletteGame`, `RouletteSegments`, `RouletteWheel`, `BetTable`, `ResultStrip`, `RouletteSurface`, `Roulette` integration — and a handful of new test cases per file. Plus 4 new tests in the existing `gameLogic.test.ts`. Final expected: ~52 / ~310).

- [ ] **Step 3: Build**

```bash
npx vite build
```
Expected: succeeds in ~10s. Plan 3 finished at 906.82 KB JS / 50.03 KB CSS. Plan 4 should add ≤30 KB JS (no new deps; new files are small SVG components). If JS jumps by more than 50 KB net, investigate before committing.

- [ ] **Step 4: Manual browser pass — checklist for the engineer**

Run dev servers:

```bash
npm run dev:server   # terminal 1
npm run dev          # terminal 2
```

Open `localhost:3000` (or the Cloud Shell preview URL). Walk through:

1. **Lobby → click any sweets roulette game** (or any theme).
2. **Roulette renders inside the Gemini bg art + backdrop blur.** The wheel SVG fills the centre area.
3. **Wheel shows 37 segments** (alternating red/black, green at 0). Numbers are legible (white text on coloured wedges). The themed rim, pointer, and inner cone (showing "—") are visible.
4. **Click a bet cell** (e.g. RED). The cell highlights with a yellow ring + lift; the bet chip animates in (drops from above with bounce). The hero button label changes from "Pick Red / Black / Even / Odd" to "SPIN THE WHEEL".
5. **Spin.** Wheel rotates clockwise ~5 turns over 2.5s with cubic decel. Ball orbits counter-clockwise ~7 turns over the same 2.5s. Sound plays.
6. **At the end of the spin:** the wheel settles with the result pocket at the top (under the pointer); the ball sits in that pocket; the cone shows the result number; the result strip slides in from below with the pocket badge + message.
7. **On a win:** the cone scale-pulses; the result pocket on the wheel gets a yellow stroke; balance pill counts up to the new amount.
8. **Switch themes** in the lobby (sweets → space → vampire → ninja). Each theme's rim colour, cone colour, pointer colour, ball border, and chip colour shift via theme tokens (`border-theme-primary`, `border-theme-accent`, etc). The wheel layout stays the same shape (intended — bespoke per-theme rim shapes are deferred).
9. **Spin again.** The wheel keeps rotating forward (no snap-back to 0); the new result lands correctly under the pointer; previous result strip fades out and the new one slides in.
10. **Slots + Bingo regression check.** Click each from the lobby. They should still work end-to-end — Plan 4 didn't touch them, but verify nothing leaked.

- [ ] **Step 5: No commit in this task.** If any gate fails, file the failure as a follow-up sub-task in Task 14's notes and decide whether to land what's done or block the PR. Do NOT pad with commented-out / WIP code.

---

## Task 14: Plan 4 progress doc

**Goal:** Capture a pause point so the next session can pick up cleanly. Mirrors the structure of `2026-05-09-plan-3-status.md`.

**Files:**
- Create: `docs/superpowers/progress/2026-05-11-plan-4-status.md`

- [ ] **Step 1: Write the doc**

The doc should cover:

1. **TL;DR** — what shipped, branch + tip, test counts, build size.
2. **Branch state** — name, tip SHA, divergence from main, push status, PR URL (if opened), CI gates.
3. **What landed** — task-by-task summary in spec order. Reference each task by its commit SHA (run `git log --oneline main..HEAD` after the work is done to populate).
4. **Deviations from the literal plan** — any places the implementer chose a different approach. Critical for future-you. Likely deviations to watch for:
   - vitest-native matcher adaptation (carry-over from Plan 3 — should be uniform).
   - Wheel-rotation accumulator math — the formula in Task 7 is a first cut; refine if the wheel shows snap-back or visual drift across spins.
   - Ball-orbit visual offset — the `translateY(-N vh)` is rough; if the ball clips the rim or floats inside, adjust per the actual rendered size.
   - Anything else the implementer chose differently.
5. **Known limitations / things to revisit** — bespoke per-theme rims/balls/cone-motifs/felt-textures (deferred), wheel-segment click sounds + ball-drop thunk (deferred), ThemedCelebration (deferred to Plan 6 / Section 7), `prefers-reduced-motion` behaviour for wheel rotation (defaulted to "rotate always; only existing GameShell overlay respects the pref").
6. **Tasks for the next session** — open PR → merge → deploy → start Plan 5 (Bingo surface).
7. **Where to find things** — links to spec, plan, this doc, prior plan/progress docs.
8. **Sanity checks to run on next session start** — the same git/npm sequence as Plan 3's progress doc.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/progress/2026-05-11-plan-4-status.md
git commit -m "docs(plan-4): commit Plan 4 progress note"
```

---

## After Plan 4

Per Plan 3's pattern (now the canonical workflow):

1. **User does fresh manual browser pass** on the latest tip (Task 13 Step 4 is the checklist).
2. **Open PR** with title `Plan 4: Roulette surface — themed wheel + bet table + result strip`.
3. **Merge to `main`** via fast-forward; delete the feature branch local + origin.
4. **Deploy** via `./deploy/deploy.sh deploy`.
5. **Start Plan 5** (Bingo surface — Section 6 of the spec). Atoms ready then will include all Plan 4 work plus everything Plans 1+2+3 built.

---

## Self-review notes (filled by the planner)

**Spec coverage check (Section 5):**
- 37 wedge segments, alternating red/black with green at 0: ✓ Tasks 3 + 4
- Number labels on a virtual ring at radius 82: ◐ Task 3 uses radius 42 in a 100-unit viewBox (= 84% of outer radius, equivalent to spec's "radius 82" in a 100-radius spec). Math is consistent.
- Themed outer rim (per-theme bespoke): ◐ Task 5 ships unified-with-tokens; bespoke deferred per scoping decision.
- Inner cone with winning number + idle motif: ◐ Task 5 ships the cone with the winning number + an em-dash "—" placeholder for idle; bespoke per-theme idle motifs (sweets candy, eye-of-horus, etc.) deferred per scoping decision.
- Pointer at 12 o'clock, themed shape: ◐ Task 5 ships unified triangle pointer with theme-accent fill; bespoke shapes deferred.
- Themed ball (gumball/scarab/asteroid/etc.): ◐ Task 6 ships unified white-disk-with-theme-accent-border ball; bespoke deferred.
- Wheel rotation 1800° in 2.5s with cubic decel: ✓ Task 7
- Ball orbits counter-clockwise ~7 turns: ✓ Task 7
- Wheel-segment click sound + ball-drop sound: DEFERRED per scoping decision
- Idle ambient rotation per `themeManifesto.<theme>.motion.idle`: NOT SHIPPED (small omission; can be added in a polish pass — the wheel sits static when not spinning)
- Bet table felt-cloth + 4 cells with treatments + chip drop: ✓ Task 8
- Result strip with pocket badge + message + slide-in: ✓ Task 9
- Win animation (result pocket pulse + cone pulse + winning number flash): ✓ Task 12
- Triggers Section 7 themed celebration: DEFERRED to Plan 6 per scoping decision (existing GameShell-level overlay still fires)
- Win amount counter ticks up in balance pill: EXISTING (lives in upstream `BalancePill` from Plan 2; not changed by Plan 4)
- New components: `RouletteWheel`, `RouletteSegments`, `BetTable`, `ResultStrip`, `useRouletteGame`: ✓ Tasks 2-10 (plus `RouletteSurface` orchestrator added beyond strict spec list, justified by Plan-3-mirror composition)
- Existing `evaluateRouletteBet` and `RouletteColour` kept verbatim: ✓ (only `gameLogic.ts` change is the additive `angleOfPocket` helper in Task 1)

**Type consistency check:**
- `RouletteColour` re-used from `gameLogic.ts` everywhere (RouletteSegments, RouletteWheel, ResultStrip, useRouletteGame). ✓
- `BetType` defined in `BetTable.tsx` and exported; consumed by RouletteSurface's `onSelect` callback. ✓
- `UseRouletteGameReturn` defined in Task 2; re-imported by RouletteSurface in Task 10. ✓
- `RouletteWheelProps` extended in Task 12 with `win?` prop; defaults to `null` so existing call sites don't break. ✓
- All component testids — `roulette-wheel`, `roulette-wheel-frame`, `roulette-wheel-segments`, `roulette-rim`, `roulette-cone`, `roulette-pointer`, `roulette-ball`, `bet-table`, `bet-cell-{type}`, `bet-chip`, `result-strip`, `result-pocket-badge`, `roulette-surface` — used consistently across tests. ✓
- `SETTLE_MS = 2500` exported from `useRouletteGame`; matches spec spin duration. (Not exported from any existing module today — fresh constant.) ✓

**Placeholder scan:**
- No "TBD" or "implement later" steps.
- Every code step shows the actual code.
- Every test step shows the actual test code with concrete assertions.
- Commit messages are explicit.

**Known imperfections to flag for the implementer:**
- Task 2's `wheelRotation` accumulator is tested for the per-spin delta range (~1800° ± 360°) but not for exact correctness across multiple spins. Task 13 Step 4's manual browser pass is the visual verification gate. If the wheel snaps backward or drifts across spins, the formula in Task 2's `spin()` is the suspect — `angleCorrection = lastN === null ? -angleOfPocket(num) : angleOfPocket(lastN) - angleOfPocket(num)`. The math: target rotation `R` satisfies `R mod 360 = -angleOfPocket(N) mod 360` so pocket N lands at the top. Each spin adds `1800 + (angleOfPocket(prevN) - angleOfPocket(newN))` to the accumulator — this is `5 turns + small correction`, always positive (never less than `1800 - 360 = 1440`), so the wheel always rotates forward.
- Task 7's ball-orbit `translateY(-16.5vh)` hard-codes the mobile breakpoint (= `(35vh frame / 2) - 1vh`). At the `md:45vh` size, the ball will orbit slightly inside the rim (`translateY` of `-16.5vh` is only `~36%` of `45vh` instead of `~46%` of `35vh`). Acceptable for v1; a polish pass could compute the offset via `ResizeObserver` or use a percentage-of-frame calc.
- Task 5's pointer is a CSS triangle (`border-l/r/t-transparent` trick). On hi-DPI screens it may look softer than a proper SVG path. Acceptable for v1; convert to inline SVG if the visual feedback in Task 13 calls for it.
- Task 7's tests use `wheelRotation={0} ballRotation={0}` defaults — they don't actually exercise motion's animation loop (jsdom has no animation engine). The presence of `data-testid="roulette-wheel-segments"` proves the motion.g is in the DOM; the actual rotation animation is verified visually in Task 13.
- Spec section 5 says the cone shows the winning number "in the theme display font". Task 5's cone uses `font-bold` (generic). The implementer can swap to `themeManifesto[theme].font` (e.g., `font-sweets`, `font-vampire`) by importing `themeManifesto` in `RouletteWheel.tsx` and applying `themeManifesto[theme].font` to the cone's className. Cheap follow-up; not a blocker.
