# Bingo Surface Implementation Plan (Plan 5 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder vertically-stacked Bingo widget (159-line monolithic `src/components/Games/Bingo.tsx`) into the spec's themed bingo surface — themed card frame + 3×3 grid with stamp-on-call markers, side panel with JUST CALLED badge + LINES tracker, and a 1–30 called-track strip below. In-window pulses (line-complete ring on cells, JUST CALLED bouncy entry per draw, "BINGO!" banner sweep on win).

**Architecture:** Mirror Plan 4. Decompose `Bingo.tsx` into a hook (`useBingoGame`) for state and timing plus a small component family in `src/components/Games/Bingo/` (`BingoSurface` orchestrator, `BingoCard`, `BingoCell`, `BingoMarker`, `CalledPanel`, `CalledTrack`). The existing `Bingo.tsx` shrinks to a thin `<GameShell><BingoSurface /></GameShell>` wrapper so `App.tsx` and the `Props` interface are unchanged. The card chrome is **manifesto-driven** (one shape, theme-distinct frame colour + cell tints via existing `border-theme-primary` / `bg-theme-bg` / `text-theme-accent` / `bg-theme-accent` Tailwind classes wired by Plan 1's CSS variables); bespoke per-theme markers (gummy-bear / scarab / alien-blob / bullet-hole / pearl / carved-stone / bat-mark / shuriken) and per-theme card frames (candy-bar / papyrus-scroll / wanted-poster / etc.) are an explicit polish-pass deferral, NOT included in Plan 5. Bingo "ball drop" sounds beyond the existing `playBingoDraw` are deferred. Themed celebration is deferred to Plan 6 (Section 7); Plan 5 keeps the existing GameShell-level confetti/jackpot overlay and adds in-window pulses only (line ring + JUST CALLED bounce + BINGO banner sweep).

**Tech Stack:** React 18 + TypeScript, Framer Motion (`motion/react`, already a dep), Vite, vitest + jsdom. No new dependencies.

---

## Pre-flight

The branch should be created from current `main` (tip after Plan 4 deploy: `ce57ab6`). Use the `superpowers:using-git-worktrees` skill or:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/plan-5-bingo-surface
```

Confirm baseline: `npm run lint && npm test && npx vite build` should be green (lint exit 0, 307/307 tests, build succeeds within ~10s @ ~912 KB JS / ~53 KB CSS).

## File structure overview

**New files (all under `src/components/Games/Bingo/` unless noted):**

| File | Responsibility |
|---|---|
| `src/hooks/useBingoGame.ts` | Game state + timing: bet, board, drawn, drawing, win, message, lastDrawn (computed), play() |
| `src/hooks/useBingoGame.test.ts` | Vitest unit tests for the hook (uses fake timers) |
| `Bingo/BingoMarker.tsx` | Themed marker disk; renders with stamp animation on mount (scale 0.4 → 1 spring overshoot) |
| `Bingo/BingoMarker.test.tsx` | Marker renders, has expected testid |
| `Bingo/BingoCell.tsx` | Single cell: number + marker overlay + last-drawn wiggle + winning-line ring |
| `Bingo/BingoCell.test.tsx` | Marked vs unmarked, last-drawn wiggle, winning-line ring class |
| `Bingo/BingoCard.tsx` | Themed card frame + 3×3 grid of `BingoCell`s; computes per-cell `isWinningLine` from `BingoLines` |
| `Bingo/BingoCard.test.tsx` | 9 cells render, marked-state propagation, winning-line ring on row/col/diag completions |
| `Bingo/CalledPanel.tsx` | Side panel: JUST CALLED badge with bouncy AnimatePresence entry per draw + 4-row LINES tracker |
| `Bingo/CalledPanel.test.tsx` | Badge shows lastDrawn; tracker shows ✓/— per row + Cols&Diagonals row |
| `Bingo/CalledTrack.tsx` | 15×2 grid showing 1–30 with "Called so far · N / 12" caption |
| `Bingo/CalledTrack.test.tsx` | 30 cells render, drawn cells lit, caption text |
| `Bingo/BingoSurface.tsx` | Orchestrator. Composes BingoCard + CalledPanel + CalledTrack. Reads `useBingoGame` (passed as prop). Computes `drawnSet` and `lines` once via `useMemo`. |
| `Bingo/BingoSurface.test.tsx` | Integration: card + panel + track render, drawn propagation, win banner pass-through |
| `Bingo.test.tsx` (in `src/components/Games/`) | Light integration test exercising the GameShell contract end-to-end |

**Modified files:**

| File | What changes |
|---|---|
| `src/components/Games/gameLogic.ts` | Add pure helper `evaluateBingoLines(board, drawn): BingoLines` returning `{ rows: [bool, bool, bool], cols: [bool, bool, bool], diags: [bool, bool] }`. Existing `evaluateBingoBoard`, `evaluateRouletteBet`, `evaluateSlotsResult`, `angleOfPocket` kept verbatim. |
| `src/components/Games/gameLogic.test.ts` | Append tests for `evaluateBingoLines`. |
| `src/components/Games/Bingo.tsx` | Body shrinks from 159 lines to ~36: imports `<BingoSurface>`, lifts state to `useBingoGame`, passes them to GameShell. Props interface unchanged. **Replace `import { ThemeType } from '../../App'` with `import { type ThemeType } from '../../utils/themeManifesto'`** (canonical post-Plan-1 source — same side-fix Plan 4 made for `Roulette.tsx`). Also drop the `useTheme` import (no longer needed; theme tokens are applied via Tailwind classes inside `BingoCard`). |

No changes to: `App.tsx`, `themeManifesto.ts`, `SoundEngine.ts` (`playBingoDraw`/`playWin`/`playLose` reused), `GameShell.tsx`, `useAssets.ts`, `config/games.ts`.

---

## Conventions used in every task

- **Step 1 is always "Write the failing test first."** Steps 2 = run it, observe failure. Steps 3–4 = implement + run again, observe pass. Last step = commit. This is per `superpowers:test-driven-development`.
- **Commit messages** follow Plan 4's convention: `feat(bingo): ...`, `fix(bingo): ...`, `refactor(bingo): ...`, `docs(plan-5): ...`. No `Co-Authored-By` lines (Plans 2-4 did not use them).
- **Imports** for `ThemeType` come from `'../../utils/themeManifesto'` (or `'../../../utils/themeManifesto'` from the `Bingo/` subdir) — the canonical source post-Plan 1 dedup. Do NOT re-import from `'../../App'`. Plan 1's commit `4a60ebe` made App.tsx a re-export, but new code should hit the source directly. Note current `Bingo.tsx:7` still has the wrong import — Task 10 fixes this.
- **vitest-native matchers** — the codebase has no `@testing-library/jest-dom` installed (carryover from Plans 3+4). Adapt any reference test code that uses `.toBeInTheDocument()` / `.toHaveAttribute()` / `.toHaveTextContent()` to vitest-native equivalents per `BalancePill.test.tsx` convention: `expect(el).toBeTruthy()` / `expect(el.getAttribute('foo')).toBe('val')` / `expect(el.textContent).toContain('text')`. Add `import { cleanup } from '@testing-library/react'` and `afterEach(() => cleanup())` to every new component test file.
- **Tests** use `vi.mock` for hooks and modules that would otherwise hit Firebase or window.AudioContext. See `Roulette.test.tsx` (Plan 4) and `Slots.test.tsx` (Plan 3) for the canonical mock layout.
- **One concept per commit.** If a step's diff bleeds into unrelated cleanup, split it into its own commit.

---

## Task 1: `evaluateBingoLines` helper in `gameLogic.ts`

**Goal:** Pure helper that takes a 3×3 board and a drawn-numbers list and returns which of the 8 possible bingo lines are complete: 3 rows + 3 columns + 2 diagonals. Returned shape matches what both `BingoCard` (per-cell ring) and `CalledPanel` (4-row tracker) need: `{ rows: [bool, bool, bool], cols: [bool, bool, bool], diags: [bool, bool] }`. The diagonals are ordered `[main, anti]` where main is `(0,0)→(1,1)→(2,2)` and anti is `(0,2)→(1,1)→(2,0)`.

**Files:**
- Modify: `src/components/Games/gameLogic.ts`
- Modify: `src/components/Games/gameLogic.test.ts`

- [ ] **Step 1: Append the failing tests**

```ts
// in src/components/Games/gameLogic.test.ts (append at end)
import { evaluateBingoLines, type BingoLines } from './gameLogic';

describe('evaluateBingoLines', () => {
  const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  const empty: BingoLines = {
    rows: [false, false, false],
    cols: [false, false, false],
    diags: [false, false],
  };

  it('returns all-false when nothing has been drawn', () => {
    expect(evaluateBingoLines(board, [])).toEqual(empty);
  });

  it('rows[0] is true when the first row is fully drawn', () => {
    const r = evaluateBingoLines(board, [1, 2, 3]);
    expect(r.rows[0]).toBe(true);
    expect(r.rows[1]).toBe(false);
    expect(r.rows[2]).toBe(false);
  });

  it('rows[1] is true when the middle row is fully drawn', () => {
    const r = evaluateBingoLines(board, [4, 5, 6]);
    expect(r.rows[1]).toBe(true);
  });

  it('rows[2] is true when the bottom row is fully drawn', () => {
    const r = evaluateBingoLines(board, [7, 8, 9]);
    expect(r.rows[2]).toBe(true);
  });

  it('cols[0] is true when the left column is fully drawn', () => {
    const r = evaluateBingoLines(board, [1, 4, 7]);
    expect(r.cols[0]).toBe(true);
  });

  it('cols[1] is true when the middle column is fully drawn', () => {
    const r = evaluateBingoLines(board, [2, 5, 8]);
    expect(r.cols[1]).toBe(true);
  });

  it('cols[2] is true when the right column is fully drawn', () => {
    const r = evaluateBingoLines(board, [3, 6, 9]);
    expect(r.cols[2]).toBe(true);
  });

  it('diags[0] is true when the main diagonal (0,0)→(2,2) is drawn', () => {
    const r = evaluateBingoLines(board, [1, 5, 9]);
    expect(r.diags[0]).toBe(true);
    expect(r.diags[1]).toBe(false);
  });

  it('diags[1] is true when the anti-diagonal (0,2)→(2,0) is drawn', () => {
    const r = evaluateBingoLines(board, [3, 5, 7]);
    expect(r.diags[1]).toBe(true);
    expect(r.diags[0]).toBe(false);
  });

  it('combines independent line completions', () => {
    const r = evaluateBingoLines(board, [1, 2, 3, 1, 5, 9]);
    expect(r.rows[0]).toBe(true);
    expect(r.diags[0]).toBe(true);
    expect(r.rows[1]).toBe(false);
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```
Expected: TS error / `evaluateBingoLines is not a function` for the new tests. Existing 12 tests still pass.

- [ ] **Step 3: Implement**

In `src/components/Games/gameLogic.ts`, append (anywhere after the existing exports):

```ts
/** Per-line bingo completion mask. Used by both `BingoCard` (per-cell ring derivation)
 *  and `CalledPanel` (4-row tracker). 3×3 board → 3 rows + 3 cols + 2 diagonals.
 *  diags[0] = main (0,0)→(1,1)→(2,2); diags[1] = anti (0,2)→(1,1)→(2,0). */
export interface BingoLines {
  rows: [boolean, boolean, boolean];
  cols: [boolean, boolean, boolean];
  diags: [boolean, boolean];
}

/** Pure: derive line-completion mask from a 3×3 board + drawn-numbers list.
 *  Existing `evaluateBingoBoard` (boolean "any line complete") is left verbatim;
 *  this is its strictly-additive sibling that returns the per-line breakdown. */
export function evaluateBingoLines(board: number[][], drawn: number[]): BingoLines {
  const drawnSet = new Set(drawn);
  return {
    rows: [
      board[0].every(v => drawnSet.has(v)),
      board[1].every(v => drawnSet.has(v)),
      board[2].every(v => drawnSet.has(v)),
    ],
    cols: [
      board.every(row => drawnSet.has(row[0])),
      board.every(row => drawnSet.has(row[1])),
      board.every(row => drawnSet.has(row[2])),
    ],
    diags: [
      board.every((row, i) => drawnSet.has(row[i])),
      board.every((row, i) => drawnSet.has(row[2 - i])),
    ],
  };
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/gameLogic.test.ts
```
Expected: 22 tests pass (12 prior + 10 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/gameLogic.ts src/components/Games/gameLogic.test.ts
git commit -m "feat(bingo): evaluateBingoLines helper for per-line completion mask"
```

---

## Task 2: `useBingoGame` hook — lift state out of `Bingo.tsx`

**Goal:** Extract `bet`, `board`, `drawn`, `drawing`, `win`, `message` state + the `handlePlay` body from current `Bingo.tsx` into a hook. Same payouts (`bet * 5` on win), same draw cadence (600ms `setInterval`), same `MAX_DRAWS = 12` ceiling, same sound calls. Also expose `lastDrawn` (the last item of `drawn`, or `null`) as a computed convenience so consumers don't have to redo the array indexing. **No semantic change** — this is a literal lift-and-shift, mirroring how `useRouletteGame` lifted Roulette's state in Plan 4 (commit `8fe110f`). `makeBoard` moves into the hook file too (it's only used here).

**Files:**
- Create: `src/hooks/useBingoGame.ts`
- Create: `src/hooks/useBingoGame.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useBingoGame.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBingoGame } from './useBingoGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playBingoDraw: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useBingoGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('starts with drawing=false, drawn=[], default bet=10, win=null', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100 }));
    expect(result.current.drawing).toBe(false);
    expect(result.current.drawn).toEqual([]);
    expect(result.current.bet).toBe(10);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
    expect(result.current.lastDrawn).toBeNull();
  });

  it('initial board is 3 rows × 3 numbers all in 1..30 with no duplicates', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100 }));
    const board = result.current.board;
    expect(board.length).toBe(3);
    for (const row of board) {
      expect(row.length).toBe(3);
      for (const n of row) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(30);
      }
    }
    expect(new Set(board.flat()).size).toBe(9);
  });

  it('play() does nothing when balance < bet', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 5, onUpdateBalance }));
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(false);
    expect(onUpdateBalance).not.toHaveBeenCalled();
  });

  it('play() flips drawing=true and debits the bet', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(true);
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });

  it('play() draws one number per 600ms tick and exposes it via drawn + lastDrawn', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    expect(result.current.drawn.length).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.drawn.length).toBe(1);
    expect(result.current.lastDrawn).toBe(result.current.drawn[0]);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.drawn.length).toBe(2);
    expect(result.current.lastDrawn).toBe(result.current.drawn[1]);
  });

  it('play() resolves by the 12th draw at the latest with drawing=false and a non-null message', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    // 12 ticks @ 600ms = 7200ms; allow +50ms slack.
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(result.current.drawing).toBe(false);
    expect(result.current.message).not.toBeNull();
  });

  it('drawn numbers contain no duplicates', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(new Set(result.current.drawn).size).toBe(result.current.drawn.length);
  });

  it('a second play() call regenerates the board and resets drawn', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(result.current.drawing).toBe(false);
    expect(result.current.drawn.length).toBeGreaterThan(0);
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(true);
    expect(result.current.drawn).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useBingoGame.test.ts
```
Expected: `Cannot find module './useBingoGame'`.

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/useBingoGame.ts
import { useState, useCallback } from 'react';
import { evaluateBingoBoard } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';

export const DRAW_INTERVAL_MS = 600;
export const MAX_DRAWS = 12;
const POOL_SIZE = 30;

function makeBoard(): number[][] {
  const pool = Array.from({ length: POOL_SIZE }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  return [pool.slice(0, 3), pool.slice(3, 6), pool.slice(6, 9)];
}

export interface UseBingoGameOptions {
  theme: ThemeType;
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseBingoGameReturn {
  bet: number;
  setBet: (n: number) => void;
  board: number[][];
  drawn: number[];
  drawing: boolean;
  win: 'jackpot' | 'small' | null;
  message: string | null;
  /** drawn[drawn.length - 1] when drawn is non-empty; null otherwise. */
  lastDrawn: number | null;
  play: () => void;
}

export function useBingoGame(opts: UseBingoGameOptions): UseBingoGameReturn {
  const { theme, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState<number[][]>(() => makeBoard());
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const play = useCallback(() => {
    if (drawing || balance < bet) return;
    setDrawing(true);
    setWin(null);
    setMessage(null);
    setDrawn([]);
    // Capture the freshly-made board in a local so the setInterval closure evaluates
    // against the new board rather than the stale React state. setBoard(...) is async
    // and the first interval tick can't see the new value otherwise. (Same pattern as
    // current Bingo.tsx; preserved verbatim.)
    const currentBoard = makeBoard();
    setBoard(currentBoard);
    onUpdateBalance?.(-bet);

    let drawCount = 0;
    const localDrawn: number[] = [];
    const interval = setInterval(() => {
      drawCount++;
      let n: number;
      do { n = Math.floor(Math.random() * POOL_SIZE) + 1; } while (localDrawn.includes(n));
      localDrawn.push(n);
      setDrawn([...localDrawn]);
      soundEngine.playBingoDraw(theme);
      if (drawCount >= MAX_DRAWS || evaluateBingoBoard(currentBoard, localDrawn)) {
        clearInterval(interval);
        const won = evaluateBingoBoard(currentBoard, localDrawn);
        if (won) {
          const payout = bet * 5;
          onUpdateBalance?.(payout);
          setWin('small');
          setMessage(`Bingo! +${payout}`);
          soundEngine.playWin(theme);
        } else {
          setMessage('No bingo this round.');
          soundEngine.playLose(theme);
        }
        setDrawing(false);
      }
    }, DRAW_INTERVAL_MS);
  }, [drawing, balance, bet, theme, onUpdateBalance]);

  const lastDrawn = drawn.length > 0 ? drawn[drawn.length - 1] : null;

  return {
    bet, setBet,
    board,
    drawn,
    drawing,
    win, message,
    lastDrawn,
    play,
  };
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useBingoGame.test.ts
```
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBingoGame.ts src/hooks/useBingoGame.test.ts
git commit -m "feat(bingo): useBingoGame hook lifts state out of Bingo.tsx"
```

---

## Task 3: `BingoMarker` — themed marker disk with stamp animation

**Goal:** A single, unified themed marker. Renders an absolutely-positioned disk that fills most of its parent cell (`inset-[8%]`), in `bg-theme-accent` with a white border. Stamp animation on mount: `scale: 0.4 → 1` with spring overshoot via Framer Motion (matches the spec's "stamp animation `scale(0.4) → scale(1)` with overshoot"). One unified shape across all 8 themes; bespoke gummy-bear / scarab / alien-blob / bullet-hole / pearl / carved-stone / bat-mark / shuriken variants are an explicit deferral.

**Files:**
- Create: `src/components/Games/Bingo/BingoMarker.tsx`
- Create: `src/components/Games/Bingo/BingoMarker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/BingoMarker.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoMarker } from './BingoMarker';

describe('BingoMarker', () => {
  afterEach(() => cleanup());

  it('renders an element with data-testid="bingo-marker"', () => {
    render(<BingoMarker />);
    expect(screen.getByTestId('bingo-marker')).toBeTruthy();
  });

  it('renders as a div (Framer motion.div)', () => {
    render(<BingoMarker />);
    expect(screen.getByTestId('bingo-marker').tagName.toLowerCase()).toBe('div');
  });

  it('is absolutely positioned (so it overlays its parent cell)', () => {
    render(<BingoMarker />);
    const m = screen.getByTestId('bingo-marker');
    expect(m.className).toContain('absolute');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/BingoMarker.test.tsx
```
Expected: `Cannot find module './BingoMarker'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/BingoMarker.tsx
import { motion } from 'motion/react';

export function BingoMarker() {
  return (
    <motion.div
      data-testid="bingo-marker"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="absolute inset-[8%] rounded-full bg-theme-accent border-[0.4vh] border-white shadow-[0_2px_6px_rgba(0,0,0,0.5)] pointer-events-none"
    />
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/BingoMarker.test.tsx
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/BingoMarker.tsx src/components/Games/Bingo/BingoMarker.test.tsx
git commit -m "feat(bingo): BingoMarker — themed disk with stamp animation"
```

---

## Task 4: `BingoCell` — single cell (number + marker overlay + last-drawn wiggle + winning-line ring)

**Goal:** Render a single bingo cell. Props: `value: number`, `marked: boolean`, `isLastDrawn: boolean`, `isWinningLine: boolean`. The cell shows the number always; the `BingoMarker` is conditionally rendered on top when `marked=true` (Framer Motion handles the stamp animation on mount). Wiggle the cell (`rotate: [0, -10, 10, 0]`) when `isLastDrawn=true` so the just-marked cell catches the eye. Apply a yellow ring + glow when `isWinningLine=true` so cells on completed lines stay visually marked even after subsequent draws. The number stays legible on top of the marker via z-index + drop-shadow. Exposes `data-marked` and `data-winning-line` attributes for tests.

**Files:**
- Create: `src/components/Games/Bingo/BingoCell.tsx`
- Create: `src/components/Games/Bingo/BingoCell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/BingoCell.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoCell } from './BingoCell';

describe('BingoCell', () => {
  afterEach(() => cleanup());

  it('renders the value in the cell text content', () => {
    render(<BingoCell value={17} marked={false} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-cell-17').textContent).toContain('17');
  });

  it('shows no marker when marked=false', () => {
    render(<BingoCell value={5} marked={false} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.queryByTestId('bingo-marker')).toBeNull();
  });

  it('shows the marker when marked=true', () => {
    render(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-marker')).toBeTruthy();
  });

  it('reflects marked state via data-marked attribute', () => {
    const { rerender } = render(
      <BingoCell value={5} marked={false} isLastDrawn={false} isWinningLine={false} />,
    );
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('false');
    rerender(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
  });

  it('reflects winning-line state via data-winning-line attribute', () => {
    const { rerender } = render(
      <BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />,
    );
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('false');
    rerender(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={true} />);
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/BingoCell.test.tsx
```
Expected: `Cannot find module './BingoCell'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/BingoCell.tsx
import { motion } from 'motion/react';
import { BingoMarker } from './BingoMarker';

export interface BingoCellProps {
  value: number;
  marked: boolean;
  /** When true, the cell wiggles to catch the eye (used for the most-recently-drawn cell). */
  isLastDrawn: boolean;
  /** When true, the cell gets a persistent yellow ring (used on cells of completed lines). */
  isWinningLine: boolean;
}

export function BingoCell({ value, marked, isLastDrawn, isWinningLine }: BingoCellProps) {
  return (
    <motion.div
      data-testid={`bingo-cell-${value}`}
      data-marked={marked ? 'true' : 'false'}
      data-winning-line={isWinningLine ? 'true' : 'false'}
      animate={{
        scale: marked ? [1, 1.15, 1] : 1,
        rotate: isLastDrawn ? [0, -10, 10, 0] : 0,
      }}
      transition={{ duration: 0.3 }}
      className={`relative aspect-square flex items-center justify-center rounded-xl text-[3vh] md:text-[4vh] overflow-hidden transition-colors duration-200 ${
        marked ? 'bg-theme-accent/30 text-white' : 'bg-white text-gray-800'
      } ${
        isWinningLine
          ? 'ring-[0.5vh] ring-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.6)]'
          : marked
          ? 'border-b-[0.4vh] border-theme-accent/50'
          : 'border-b-[0.5vh] border-gray-300'
      }`}
    >
      {marked && <BingoMarker />}
      <span className="relative z-10 font-bold drop-shadow-md">{value}</span>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/BingoCell.test.tsx
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/BingoCell.tsx src/components/Games/Bingo/BingoCell.test.tsx
git commit -m "feat(bingo): BingoCell — number + marker + last-drawn wiggle + winning-line ring"
```

---

## Task 5: `BingoCard` — themed card frame + 3×3 grid

**Goal:** Compose 9 `BingoCell`s into a 3×3 grid wrapped in a themed card frame (themed border + dim translucent background + inset shadow). Takes `board: number[][]`, `drawn: Set<number>`, `lastDrawn: number | null`, `lines: BingoLines`. Computes per-cell `isWinningLine` from `lines` (a cell at (i,j) is on a winning line if `lines.rows[i]` OR `lines.cols[j]` OR (`i === j` AND `lines.diags[0]`) OR (`i + j === 2` AND `lines.diags[1]`)). The `win` prop is added in Task 11; for now the card just renders the grid.

**Files:**
- Create: `src/components/Games/Bingo/BingoCard.tsx`
- Create: `src/components/Games/Bingo/BingoCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/BingoCard.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoCard } from './BingoCard';
import type { BingoLines } from '../gameLogic';

const noLines: BingoLines = {
  rows: [false, false, false],
  cols: [false, false, false],
  diags: [false, false],
};

describe('BingoCard', () => {
  afterEach(() => cleanup());

  it('renders the card root with data-testid="bingo-card"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
  });

  it('renders 9 cells (3x3) with the board values', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    for (let v = 1; v <= 9; v++) {
      expect(screen.getByTestId(`bingo-cell-${v}`)).toBeTruthy();
    }
  });

  it('marks cells whose value is in drawn', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([2, 5, 8])}
        lastDrawn={8}
        lines={noLines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-8').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-marked')).toBe('false');
  });

  it('flags isWinningLine on cells of a completed row', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, rows: [true, false, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 2, 3])}
        lastDrawn={3}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-4').getAttribute('data-winning-line')).toBe('false');
  });

  it('flags isWinningLine on cells of a completed column', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, cols: [false, true, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([2, 5, 8])}
        lastDrawn={8}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-8').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('false');
  });

  it('flags isWinningLine on cells of the main diagonal', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, diags: [true, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 5, 9])}
        lastDrawn={9}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-9').getAttribute('data-winning-line')).toBe('true');
  });

  it('flags isWinningLine on cells of the anti-diagonal', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, diags: [false, true] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([3, 5, 7])}
        lastDrawn={7}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-7').getAttribute('data-winning-line')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx
```
Expected: `Cannot find module './BingoCard'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/BingoCard.tsx
import { type ThemeType } from '../../../utils/themeManifesto';
import { type BingoLines } from '../gameLogic';
import { BingoCell } from './BingoCell';

export interface BingoCardProps {
  theme: ThemeType;
  board: number[][];
  drawn: Set<number>;
  lastDrawn: number | null;
  lines: BingoLines;
}

function isWinningCell(i: number, j: number, lines: BingoLines): boolean {
  if (lines.rows[i]) return true;
  if (lines.cols[j]) return true;
  if (i === j && lines.diags[0]) return true;
  if (i + j === 2 && lines.diags[1]) return true;
  return false;
}

export function BingoCard({ theme, board, drawn, lastDrawn, lines }: BingoCardProps) {
  return (
    <div
      data-testid="bingo-card"
      data-theme={theme}
      className="grid grid-cols-3 gap-[1vh] md:gap-[2vh] w-full max-w-[42vh] mx-auto bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.6vh] border-theme-primary"
    >
      {board.map((row, i) =>
        row.map((value, j) => (
          <BingoCell
            key={`${i}-${j}`}
            value={value}
            marked={drawn.has(value)}
            isLastDrawn={value === lastDrawn}
            isWinningLine={isWinningCell(i, j, lines)}
          />
        )),
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/BingoCard.tsx src/components/Games/Bingo/BingoCard.test.tsx
git commit -m "feat(bingo): BingoCard — themed frame + 3x3 grid + per-cell winning-line ring"
```

---

## Task 6: `CalledPanel` — JUST CALLED badge with bouncy entry per draw

**Goal:** A side-panel block with a header strip ("Just called") and a circular badge below it that displays the most recently drawn number. Bouncy entrance per call: `AnimatePresence` keyed on the value so each new draw animates in (`scale: 0 → 1.2 → 1` overshoot, fade in, slide down) and the prior animates out. Exposes `data-testid="called-panel"` and `data-testid="just-called-badge"`. The LINES tracker lands in Task 7.

**Files:**
- Create: `src/components/Games/Bingo/CalledPanel.tsx`
- Create: `src/components/Games/Bingo/CalledPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/CalledPanel.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalledPanel } from './CalledPanel';

describe('CalledPanel', () => {
  afterEach(() => cleanup());

  it('renders the panel root with data-testid="called-panel"', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect(screen.getByTestId('called-panel')).toBeTruthy();
  });

  it('renders the just-called badge container', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect(screen.getByTestId('just-called-badge')).toBeTruthy();
  });

  it('shows the lastDrawn number inside the badge when set', () => {
    render(<CalledPanel lastDrawn={17} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('17');
  });

  it('renders an empty badge when lastDrawn is null', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect((screen.getByTestId('just-called-badge').textContent ?? '').trim()).toBe('');
  });

  it('updates the badge contents when lastDrawn changes', () => {
    const { rerender } = render(<CalledPanel lastDrawn={5} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('5');
    rerender(<CalledPanel lastDrawn={22} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('22');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/CalledPanel.test.tsx
```
Expected: `Cannot find module './CalledPanel'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/CalledPanel.tsx
import { motion, AnimatePresence } from 'motion/react';

export interface CalledPanelProps {
  lastDrawn: number | null;
}

export function CalledPanel({ lastDrawn }: CalledPanelProps) {
  return (
    <div
      data-testid="called-panel"
      className="w-full md:w-[20vh] flex flex-col items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.4vh] border-theme-primary/40 shadow-md"
    >
      <div className="text-[1.5vh] md:text-[1.6vh] uppercase tracking-wider text-theme-text/70 font-semibold">
        Just called
      </div>
      <div
        data-testid="just-called-badge"
        className="w-[10vh] h-[10vh] md:w-[12vh] md:h-[12vh] rounded-full bg-theme-bg/40 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {lastDrawn !== null && (
            <motion.div
              key={lastDrawn}
              initial={{ scale: 0, opacity: 0, y: -20 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              transition={{ scale: { duration: 0.5 } }}
              className="w-full h-full rounded-full flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-white shadow-2xl border-[0.5vh] border-white bg-theme-primary"
            >
              {lastDrawn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/CalledPanel.test.tsx
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/CalledPanel.tsx src/components/Games/Bingo/CalledPanel.test.tsx
git commit -m "feat(bingo): CalledPanel — JUST CALLED badge with bouncy entry per draw"
```

---

## Task 7: `CalledPanel` — LINES tracker (extends Task 6)

**Goal:** Add the 4-row LINES tracker to `CalledPanel`. Per spec: "4 rows showing Row 1 / Row 2 / Row 3 / Cols & Diagonals, each with ✓ or pending." `Cols & Diagonals` is one combined row that shows complete if **any** of the 5 non-row lines (3 cols + 2 diags) is complete. Each row gets `data-testid="lines-tracker-{id}"` (where id is `rows0|rows1|rows2|colsOrDiags`) and `data-complete="true|false"`. The wrapper has `data-testid="lines-tracker"`.

**Files:**
- Modify: `src/components/Games/Bingo/CalledPanel.tsx`
- Modify: `src/components/Games/Bingo/CalledPanel.test.tsx`

- [ ] **Step 1: Append the failing tests** (and update existing render calls to pass the new `lines` prop with `noLines` default)

```tsx
// At the top of the CalledPanel.test.tsx file, import the type and define a default:
import type { BingoLines } from '../gameLogic';

const noLines: BingoLines = {
  rows: [false, false, false],
  cols: [false, false, false],
  diags: [false, false],
};
```

Then **update every existing `render(<CalledPanel ...>)` AND `rerender(<CalledPanel ...>)` call** in this file to add `lines={noLines}` (6 sites total — 4 `render` + 2 `rerender` — task 6 wrote them without the prop). Then append the new tests:

```tsx
  it('renders the lines tracker with 4 rows (Row 1, Row 2, Row 3, Cols & Diagonals)', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('lines-tracker')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows0')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows1')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows2')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-colsOrDiags')).toBeTruthy();
  });

  it('marks Row 1 complete when lines.rows[0]=true', () => {
    const lines: BingoLines = { ...noLines, rows: [true, false, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-rows0').getAttribute('data-complete')).toBe('true');
    expect(screen.getByTestId('lines-tracker-rows1').getAttribute('data-complete')).toBe('false');
    expect(screen.getByTestId('lines-tracker-rows2').getAttribute('data-complete')).toBe('false');
  });

  it('marks Cols & Diagonals complete when ANY column is complete', () => {
    const lines: BingoLines = { ...noLines, cols: [false, true, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('true');
  });

  it('marks Cols & Diagonals complete when ANY diagonal is complete', () => {
    const lines: BingoLines = { ...noLines, diags: [true, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('true');
  });

  it('marks Cols & Diagonals incomplete when no col or diag is complete', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('false');
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/CalledPanel.test.tsx
```
Expected: TS error on the existing tests (because `lines` is now required and you've added it everywhere), then 5 new tests fail at runtime (`lines-tracker` testid missing). Once the implementation in Step 3 lands, all 10 tests pass.

- [ ] **Step 3: Modify `CalledPanel.tsx`**

Replace the file body:

```tsx
// src/components/Games/Bingo/CalledPanel.tsx
import { motion, AnimatePresence } from 'motion/react';
import { type BingoLines } from '../gameLogic';

export interface CalledPanelProps {
  lastDrawn: number | null;
  lines: BingoLines;
}

const TRACKER_ROW_LABELS: Array<{ id: string; label: string }> = [
  { id: 'rows0', label: 'Row 1' },
  { id: 'rows1', label: 'Row 2' },
  { id: 'rows2', label: 'Row 3' },
  { id: 'colsOrDiags', label: 'Cols & Diagonals' },
];

function isComplete(id: string, lines: BingoLines): boolean {
  if (id === 'rows0') return lines.rows[0];
  if (id === 'rows1') return lines.rows[1];
  if (id === 'rows2') return lines.rows[2];
  // colsOrDiags
  return lines.cols.some(b => b) || lines.diags.some(b => b);
}

export function CalledPanel({ lastDrawn, lines }: CalledPanelProps) {
  return (
    <div
      data-testid="called-panel"
      className="w-full md:w-[22vh] flex flex-col items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.4vh] border-theme-primary/40 shadow-md"
    >
      <div className="text-[1.5vh] md:text-[1.6vh] uppercase tracking-wider text-theme-text/70 font-semibold">
        Just called
      </div>
      <div
        data-testid="just-called-badge"
        className="w-[10vh] h-[10vh] md:w-[12vh] md:h-[12vh] rounded-full bg-theme-bg/40 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {lastDrawn !== null && (
            <motion.div
              key={lastDrawn}
              initial={{ scale: 0, opacity: 0, y: -20 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              transition={{ scale: { duration: 0.5 } }}
              className="w-full h-full rounded-full flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-white shadow-2xl border-[0.5vh] border-white bg-theme-primary"
            >
              {lastDrawn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div data-testid="lines-tracker" className="w-full flex flex-col gap-1.5 mt-1">
        {TRACKER_ROW_LABELS.map(({ id, label }) => {
          const complete = isComplete(id, lines);
          return (
            <div
              key={id}
              data-testid={`lines-tracker-${id}`}
              data-complete={complete ? 'true' : 'false'}
              className={`flex items-center justify-between text-[1.6vh] md:text-[1.7vh] px-3 py-1 rounded-md transition-colors ${
                complete
                  ? 'bg-theme-accent/30 text-white font-semibold'
                  : 'bg-theme-bg/30 text-theme-text/70'
              }`}
            >
              <span>{label}</span>
              <span aria-hidden="true">{complete ? '✓' : '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/CalledPanel.test.tsx
```
Expected: 10 tests pass (5 prior + 5 new). Make sure you updated all 6 existing render/rerender call sites to pass `lines={noLines}` — otherwise the prior tests fail with TS error or `lines is undefined` runtime error.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/CalledPanel.tsx src/components/Games/Bingo/CalledPanel.test.tsx
git commit -m "feat(bingo): CalledPanel — LINES tracker (Row1/Row2/Row3/Cols&Diagonals)"
```

---

## Task 8: `CalledTrack` — 1–30 strip with "Called so far · N / 12" caption

**Goal:** Below the card+panel pair, render a 15-column × 2-row grid showing all 30 numbers in the bingo pool. Numbers in `drawn` light up in `bg-theme-accent`; the rest sit dimmed in `bg-theme-bg/40`. Caption above the grid: `Called so far · N / 12` where N is `drawn.size` and 12 is the existing `MAX_DRAWS` ceiling.

**Files:**
- Create: `src/components/Games/Bingo/CalledTrack.tsx`
- Create: `src/components/Games/Bingo/CalledTrack.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/CalledTrack.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalledTrack } from './CalledTrack';

describe('CalledTrack', () => {
  afterEach(() => cleanup());

  it('renders the track root with data-testid="called-track"', () => {
    render(<CalledTrack theme="sweets" drawn={new Set()} />);
    expect(screen.getByTestId('called-track')).toBeTruthy();
  });

  it('renders 30 cells (1..30) inside the track', () => {
    render(<CalledTrack theme="sweets" drawn={new Set()} />);
    for (let n = 1; n <= 30; n++) {
      expect(screen.getByTestId(`called-track-${n}`)).toBeTruthy();
    }
  });

  it('marks data-drawn="true" on cells whose number is in drawn', () => {
    render(<CalledTrack theme="sweets" drawn={new Set([5, 17, 22])} />);
    expect(screen.getByTestId('called-track-5').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-17').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-22').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-1').getAttribute('data-drawn')).toBe('false');
  });

  it('shows the caption "Called so far · N / 12" with N = drawn.size', () => {
    render(<CalledTrack theme="sweets" drawn={new Set([5, 17, 22])} />);
    const text = screen.getByTestId('called-track').textContent ?? '';
    expect(text).toContain('Called so far');
    expect(text).toContain('3');
    expect(text).toContain('12');
  });

  it('caption updates when drawn changes', () => {
    const { rerender } = render(<CalledTrack theme="sweets" drawn={new Set([1])} />);
    expect(screen.getByTestId('called-track').textContent).toContain('1');
    rerender(<CalledTrack theme="sweets" drawn={new Set([1, 2, 3, 4, 5, 6, 7])} />);
    expect(screen.getByTestId('called-track').textContent).toContain('7');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/CalledTrack.test.tsx
```
Expected: `Cannot find module './CalledTrack'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/CalledTrack.tsx
import { type ThemeType } from '../../../utils/themeManifesto';
import { MAX_DRAWS } from '../../../hooks/useBingoGame';

const POOL = Array.from({ length: 30 }, (_, i) => i + 1);

export interface CalledTrackProps {
  theme: ThemeType;
  drawn: Set<number>;
}

export function CalledTrack({ theme, drawn }: CalledTrackProps) {
  return (
    <div
      data-testid="called-track"
      data-theme={theme}
      className="w-full max-w-2xl flex flex-col gap-2 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.3vh] border-theme-primary/40"
    >
      <div className="text-[1.5vh] md:text-[1.6vh] uppercase tracking-wider text-theme-text/70 font-semibold flex justify-between items-baseline">
        <span>Called so far</span>
        <span className="text-theme-accent normal-case tracking-normal">
          <span className="font-bold">{drawn.size}</span>
          <span className="opacity-60"> / {MAX_DRAWS}</span>
        </span>
      </div>
      <div
        className="grid gap-1 md:gap-1.5"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {POOL.map(n => {
          const isDrawn = drawn.has(n);
          return (
            <div
              key={n}
              data-testid={`called-track-${n}`}
              data-drawn={isDrawn ? 'true' : 'false'}
              className={`aspect-square flex items-center justify-center rounded text-[1.4vh] md:text-[1.6vh] font-bold transition-colors duration-200 ${
                isDrawn
                  ? 'bg-theme-accent text-theme-bg shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                  : 'bg-theme-bg/40 text-theme-text/40 border border-theme-primary/20'
              }`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/CalledTrack.test.tsx
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/CalledTrack.tsx src/components/Games/Bingo/CalledTrack.test.tsx
git commit -m "feat(bingo): CalledTrack — 1–30 strip with N/12 caption"
```

---

## Task 9: `BingoSurface` orchestrator

**Goal:** Compose `BingoCard` + `CalledPanel` + `CalledTrack` into a single surface. Pure presenter (analog of Plan 4's `RouletteSurface` and Plan 3's `SlotMachine`). Reads `theme` and `game` (`UseBingoGameReturn`) as props. Computes `drawnSet` and `lines` once via `useMemo` (the card and the track both consume `drawn` as a Set; the panel and the card both consume `lines` — single derivation, no duplicate work). Layout: card-and-panel side-by-side on desktop (`md:flex-row`), stacked on mobile (`flex-col`); called-track always below. **Applies `themeManifesto[theme].font` to the outer wrapper so cell numbers, the JUST CALLED badge, the called-track numbers, and the BINGO banner inherit the theme display font via CSS cascade.** This preserves the theme-font behaviour the current `Bingo.tsx` got from `useTheme()`, without each leaf component needing to know about the manifesto.

**Files:**
- Create: `src/components/Games/Bingo/BingoSurface.tsx`
- Create: `src/components/Games/Bingo/BingoSurface.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Bingo/BingoSurface.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoSurface } from './BingoSurface';
import type { UseBingoGameReturn } from '../../../hooks/useBingoGame';

const baseGame: UseBingoGameReturn = {
  bet: 10,
  setBet: () => {},
  board: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  drawn: [],
  drawing: false,
  win: null,
  message: null,
  lastDrawn: null,
  play: () => {},
};

describe('BingoSurface', () => {
  afterEach(() => cleanup());

  it('renders the card, called panel, and called track', () => {
    render(<BingoSurface theme="sweets" game={baseGame} />);
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
    expect(screen.getByTestId('called-panel')).toBeTruthy();
    expect(screen.getByTestId('called-track')).toBeTruthy();
  });

  it('marks cells whose values are in drawn', () => {
    render(
      <BingoSurface
        theme="sweets"
        game={{ ...baseGame, drawn: [2, 5], lastDrawn: 5 }}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-marked')).toBe('false');
  });

  it('the just-called badge shows lastDrawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [2], lastDrawn: 2 }} />,
    );
    expect(screen.getByTestId('just-called-badge').textContent).toContain('2');
  });

  it('the called-track lights cells in drawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [2, 5, 8], lastDrawn: 8 }} />,
    );
    expect(screen.getByTestId('called-track-2').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-5').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-8').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-1').getAttribute('data-drawn')).toBe('false');
  });

  it('flags lines tracker Row 1 complete when row 1 is fully drawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3 }} />,
    );
    expect(screen.getByTestId('lines-tracker-rows0').getAttribute('data-complete')).toBe('true');
  });

  it('flags winning-line cells on completed row', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3 }} />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/BingoSurface.test.tsx
```
Expected: `Cannot find module './BingoSurface'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Bingo/BingoSurface.tsx
import { useMemo } from 'react';
import { themeManifesto, type ThemeType } from '../../../utils/themeManifesto';
import { type UseBingoGameReturn } from '../../../hooks/useBingoGame';
import { evaluateBingoLines } from '../gameLogic';
import { BingoCard } from './BingoCard';
import { CalledPanel } from './CalledPanel';
import { CalledTrack } from './CalledTrack';

export interface BingoSurfaceProps {
  theme: ThemeType;
  game: UseBingoGameReturn;
}

export function BingoSurface({ theme, game }: BingoSurfaceProps) {
  const drawnSet = useMemo(() => new Set(game.drawn), [game.drawn]);
  const lines = useMemo(
    () => evaluateBingoLines(game.board, game.drawn),
    [game.board, game.drawn],
  );
  const themeFont = themeManifesto[theme].font;
  return (
    <div
      data-testid="bingo-surface"
      className={`flex flex-col items-center gap-4 md:gap-6 w-full ${themeFont}`}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 w-full max-w-4xl">
        <BingoCard
          theme={theme}
          board={game.board}
          drawn={drawnSet}
          lastDrawn={game.lastDrawn}
          lines={lines}
        />
        <CalledPanel lastDrawn={game.lastDrawn} lines={lines} />
      </div>
      <CalledTrack theme={theme} drawn={drawnSet} />
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/BingoSurface.test.tsx
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Bingo/BingoSurface.tsx src/components/Games/Bingo/BingoSurface.test.tsx
git commit -m "feat(bingo): BingoSurface orchestrator (card + called panel + called track)"
```

---

## Task 10: Replace `Bingo.tsx` body with the BingoSurface wrapper

**Goal:** `Bingo.tsx` shrinks from 159 lines to ~36. It still renders inside `GameShell`. Props interface unchanged so `App.tsx` import stays unchanged. **Also fixes the `ThemeType` import path** from `'../../App'` to `'../../utils/themeManifesto'` (canonical post-Plan-1 source — same side-fix Plan 4 did for `Roulette.tsx`). The `useTheme` import is dropped (no longer needed; theme tokens flow via Tailwind classes inside the surface components).

**Files:**
- Modify: `src/components/Games/Bingo.tsx`
- Create: `src/components/Games/Bingo.test.tsx` (light integration test — there's NO existing `Bingo.test.tsx` in the repo; this is a fresh file)

- [ ] **Step 1: Confirm there is no existing Bingo.test.tsx**

```bash
ls -la src/components/Games/Bingo.test.tsx 2>&1
```
Expected: `No such file or directory`. (If the file unexpectedly exists, READ it and merge the new tests into the existing describe block instead of creating a new file — but the canonical state is that it doesn't exist.)

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/Games/Bingo.test.tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { Bingo } from './Bingo';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: {
    playBingoDraw: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
    setMuted: vi.fn(),
  },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: { bg_bingo_sweets: 'https://x/bg.png', bingo_sweets: 'https://x/icon.png' },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderBingo = (overrides: Partial<React.ComponentProps<typeof Bingo>> = {}) =>
  render(
    <AudioControlsProvider>
      <Bingo
        name="Sweet Bingo"
        theme="sweets"
        balance={100}
        onUpdateBalance={vi.fn()}
        onBack={vi.fn()}
        {...overrides}
      />
    </AudioControlsProvider>,
  );

describe('Bingo (integration)', () => {
  afterEach(() => cleanup());

  it('renders the bingo card inside GameShell', () => {
    renderBingo();
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
  });

  it('renders 9 cells (3x3 board)', () => {
    renderBingo();
    const cells = screen.getAllByTestId(/^bingo-cell-/);
    expect(cells.length).toBe(9);
  });

  it('renders the called panel with JUST CALLED badge + LINES tracker', () => {
    renderBingo();
    expect(screen.getByTestId('called-panel')).toBeTruthy();
    expect(screen.getByTestId('just-called-badge')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker')).toBeTruthy();
  });

  it('renders the called track strip (1-30)', () => {
    renderBingo();
    expect(screen.getByTestId('called-track')).toBeTruthy();
    for (let n = 1; n <= 30; n++) {
      expect(screen.getByTestId(`called-track-${n}`)).toBeTruthy();
    }
  });

  it('hero button label reads "PLAY BINGO" before drawing starts', () => {
    renderBingo();
    expect(screen.getByRole('button', { name: /play bingo/i })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo.test.tsx
```
Expected: today's `Bingo.tsx` does NOT render `<BingoCard>` (only the placeholder grid) — assertion #1 fails (`bingo-card` testid missing); #3 + #4 also fail (`called-panel` / `called-track` testids missing). Assertions #2 and #5 may pass against the existing implementation (the placeholder also renders 9 cells via the old grid markup using a different pattern, but its testids don't match `^bingo-cell-` since the old code used `key={i}-{j}` not testids).

- [ ] **Step 4: Replace `Bingo.tsx`**

```tsx
// src/components/Games/Bingo.tsx
import { GameShell } from './GameShell';
import { useBingoGame } from '../../hooks/useBingoGame';
import { BingoSurface } from './Bingo/BingoSurface';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Bingo({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const game = useBingoGame({ theme, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_bingo_${theme}`}
      extraAssetKeys={[`bingo_${theme}`]}
      gameType="bingo"
      win={game.win}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.play}
      playLabel={game.drawing ? 'DRAWING...' : 'PLAY BINGO'}
      playDisabled={game.drawing || balance < game.bet}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <BingoSurface theme={theme} game={game} />
    </GameShell>
  );
}
```

- [ ] **Step 5: Run all bingo tests and observe PASS**

```bash
npx vitest run src/components/Games/Bingo.test.tsx src/components/Games/Bingo/ src/hooks/useBingoGame.test.ts
```
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/Bingo.tsx src/components/Games/Bingo.test.tsx
git commit -m "refactor(bingo): Bingo.tsx is now a thin GameShell + BingoSurface wrapper"
```

---

## Task 11: In-window win pulses — BINGO! banner sweep on the card

**Goal:** When the round lands on a win (`game.win !== null`), a "BINGO!" banner sweeps across the card from left to right, fading in and out over ~1.8s. Per spec: *"BINGO!" banner sweeps across the card in theme display font.* Per-cell winning-line rings are already wired (Task 5 + Task 9 surface). The banner is the new piece. To overlay the banner on the card, `BingoCard`'s root needs to be a positioned wrapper around the grid; the banner becomes a sibling of the grid inside that wrapper. The win prop is added to `BingoCard` (optional, defaults to `null` so existing test sites stay valid).

**Files:**
- Modify: `src/components/Games/Bingo/BingoCard.tsx`
- Modify: `src/components/Games/Bingo/BingoCard.test.tsx`
- Modify: `src/components/Games/Bingo/BingoSurface.tsx` (pass `game.win` through)
- Modify: `src/components/Games/Bingo/BingoSurface.test.tsx` (assert banner shows on win)

- [ ] **Step 1: Append the failing tests** to `BingoCard.test.tsx`

```tsx
  it('does not render the BINGO banner when win is null (or unset)', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    expect(screen.queryByTestId('bingo-win-banner')).toBeNull();
  });

  it('renders the BINGO banner when win="small"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 2, 3])}
        lastDrawn={3}
        lines={{ ...noLines, rows: [true, false, false] }}
        win="small"
      />,
    );
    const banner = screen.getByTestId('bingo-win-banner');
    expect(banner.textContent).toContain('BINGO');
  });

  it('renders the BINGO banner when win="jackpot"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set()}
        lastDrawn={null}
        lines={noLines}
        win="jackpot"
      />,
    );
    expect(screen.getByTestId('bingo-win-banner')).toBeTruthy();
  });
```

Append to `BingoSurface.test.tsx`:

```tsx
  it('passes win through to BingoCard so the BINGO banner shows on win', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3, win: 'small' }} />,
    );
    expect(screen.getByTestId('bingo-win-banner')).toBeTruthy();
  });

  it('does not show the BINGO banner when win is null', () => {
    render(<BingoSurface theme="sweets" game={baseGame} />);
    expect(screen.queryByTestId('bingo-win-banner')).toBeNull();
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx src/components/Games/Bingo/BingoSurface.test.tsx
```
Expected: 5 new tests fail (`win` prop unknown on BingoCard; `bingo-win-banner` testid missing).

- [ ] **Step 3: Modify `BingoCard.tsx`**

Restructure: outer wrapper is now `relative` (so the banner can absolutely-position over the grid); the existing grid markup moves into a child div; the banner becomes a sibling of the grid, conditionally rendered on `win !== null`.

```tsx
// src/components/Games/Bingo/BingoCard.tsx
import { motion } from 'motion/react';
import { type ThemeType } from '../../../utils/themeManifesto';
import { type BingoLines } from '../gameLogic';
import { BingoCell } from './BingoCell';

export interface BingoCardProps {
  theme: ThemeType;
  board: number[][];
  drawn: Set<number>;
  lastDrawn: number | null;
  lines: BingoLines;
  win?: 'jackpot' | 'small' | null;
}

function isWinningCell(i: number, j: number, lines: BingoLines): boolean {
  if (lines.rows[i]) return true;
  if (lines.cols[j]) return true;
  if (i === j && lines.diags[0]) return true;
  if (i + j === 2 && lines.diags[1]) return true;
  return false;
}

export function BingoCard({ theme, board, drawn, lastDrawn, lines, win = null }: BingoCardProps) {
  return (
    <div
      data-testid="bingo-card"
      data-theme={theme}
      className="relative w-full max-w-[42vh] mx-auto"
    >
      <div className="grid grid-cols-3 gap-[1vh] md:gap-[2vh] bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.6vh] border-theme-primary">
        {board.map((row, i) =>
          row.map((value, j) => (
            <BingoCell
              key={`${i}-${j}`}
              value={value}
              marked={drawn.has(value)}
              isLastDrawn={value === lastDrawn}
              isWinningLine={isWinningCell(i, j, lines)}
            />
          )),
        )}
      </div>
      {win !== null && (
        <motion.div
          data-testid="bingo-win-banner"
          initial={{ x: '-120%', opacity: 0, rotate: -8 }}
          animate={{ x: '120%', opacity: [0, 1, 1, 0], rotate: -8 }}
          transition={{ duration: 1.8, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[8vh] md:text-[10vh] font-black tracking-wider text-yellow-300 drop-shadow-[0_0_24px_rgba(250,204,21,0.85)] pointer-events-none z-30 select-none"
        >
          BINGO!
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Modify `BingoSurface.tsx`** to pass `win` through

Replace the `<BingoCard>` invocation:

```tsx
        <BingoCard
          theme={theme}
          board={game.board}
          drawn={drawnSet}
          lastDrawn={game.lastDrawn}
          lines={lines}
          win={game.win}
        />
```

- [ ] **Step 5: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx src/components/Games/Bingo/BingoSurface.test.tsx
```
Expected: BingoCard 10 (7 prior + 3 new), BingoSurface 8 (6 prior + 2 new).

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/Bingo/BingoCard.tsx src/components/Games/Bingo/BingoCard.test.tsx src/components/Games/Bingo/BingoSurface.tsx src/components/Games/Bingo/BingoSurface.test.tsx
git commit -m "feat(bingo): in-window win pulse — BINGO! banner sweep across the card"
```

---

## Task 12: Verification gate

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
Expected: All test files pass. Plan 4 baseline was 307/307 across 52 files; Plan 5 adds 8 new test files — `useBingoGame`, `BingoMarker`, `BingoCell`, `BingoCard`, `CalledPanel`, `CalledTrack`, `BingoSurface`, and `Bingo` integration — totalling roughly 53 new test cases. Plus 10 new tests in the existing `gameLogic.test.ts`. Final expected: roughly **60 files / 370 tests** (small variance OK depending on edge-case tweaks).

- [ ] **Step 3: Build**

```bash
npx vite build
```
Expected: succeeds in ~10s. Plan 4 finished at 911.56 KB JS / 52.93 KB CSS. Plan 5 should add ≤30 KB JS (no new deps; new files are small components). If JS jumps by more than 50 KB net, investigate before committing.

- [ ] **Step 4: Manual browser pass — checklist for the engineer**

Run dev servers:

```bash
npm run dev:server   # terminal 1
npm run dev          # terminal 2
```

Open `localhost:3000` (or the Cloud Shell preview URL). Walk through:

1. **Lobby → click any sweets bingo game** (or any theme).
2. **Bingo renders inside the Gemini bg art + backdrop blur.** The card sits centred on desktop with the called panel to its right; on mobile they stack vertically.
3. **Card shows 9 cells (3×3)** with random values from 1–30. Numbers are black on white. Themed border colour matches the theme primary.
4. **Side panel** has "Just called" header with an empty circular slot below it, then 4 LINES tracker rows (Row 1 / Row 2 / Row 3 / Cols & Diagonals) all showing —.
5. **Below the card+panel:** a 15×2 strip showing 1–30 dimmed, with caption "Called so far · 0 / 12".
6. **Click PLAY BINGO.** Hero button label changes to "DRAWING..." and the side panel's "Just called" badge bounces in with the first drawn number ~600ms later. The corresponding cell on the card (if any) gets the marker stamp animation. The corresponding cell on the called-track lights up.
7. **Each subsequent draw** (every 600ms): badge animates the new number in, prior animates out; cell markers stamp on; called-track cells light. Sound plays.
8. **When a row/col/diagonal completes:** the 3 cells on that line get a yellow ring + glow (persists). The corresponding LINES tracker row in the side panel switches to ✓ and gets a tinted bg.
9. **On a win:** "BINGO!" banner sweeps across the card left-to-right (~1.8s, fades in then out, slight rotation). Side-panel tracker shows the winning line (and "Cols & Diagonals" too if the win was a col/diag). Balance pill counts up.
10. **On a no-win** (12 draws without a bingo): hero button switches back to "PLAY BINGO", message says "No bingo this round." in the GameShell status line. No banner, no winning-line ring.
11. **Switch themes** in the lobby (sweets → space → vampire → ninja). Each theme's card border, marker colour, panel border, called-track lit-cell colour, and badge bg shift via theme tokens. Card layout shape stays the same (intended — bespoke shapes deferred).
12. **Slots + Roulette regression check.** Click each from the lobby. They should still work end-to-end — Plan 5 didn't touch them, but verify nothing leaked.

- [ ] **Step 5: No commit in this task.** If any gate fails, file the failure as a follow-up sub-task in Task 13's notes and decide whether to land what's done or block the PR. Do NOT pad with commented-out / WIP code.

---

## Task 13: Plan 5 progress doc

**Goal:** Capture a pause point so the next session can pick up cleanly. Mirrors the structure of `2026-05-11-plan-4-status.md`.

**Files:**
- Create: `docs/superpowers/progress/2026-05-11-plan-5-status.md`

- [ ] **Step 1: Write the doc**

The doc should cover:

1. **TL;DR** — what shipped, branch + tip, test counts, build size.
2. **Branch state** — name, tip SHA, divergence from main, push status, PR URL (if opened), CI gates.
3. **What landed** — task-by-task summary in spec order. Reference each task by its commit SHA (run `git log --oneline main..HEAD` after the work is done to populate).
4. **Deviations from the literal plan** — any places the implementer chose a different approach. Critical for future-you. Likely deviations to watch for:
   - vitest-native matcher adaptation (carry-over from Plans 3 + 4 — should be uniform).
   - The Task 7 update of Task 6's render calls (5 sites needed `lines={noLines}` added).
   - Any layout adjustments after the Task 12 manual browser pass (e.g., the badge container's empty-state height, the called-panel width on mobile).
   - Anything else the implementer chose differently.
5. **Known limitations / things to revisit** — bespoke per-theme markers / card frames / called-badge variants / called-track decoration (deferred), per-cell stamp sound + BINGO! fanfare audio (deferred), ThemedCelebration (deferred to Plan 6 / Section 7), `prefers-reduced-motion` behaviour for marker-stamp + banner-sweep (defaulted to "animate always; only existing GameShell overlay respects the pref"), `MAX_DRAWS` exported from hook but the literal `12` is still hard-coded in `CalledTrack` (small DRY follow-up).
6. **Tasks for the next session** — open PR → merge → deploy → start Plan 6 (Section 7 — themed celebration system).
7. **Where to find things** — links to spec, plan, this doc, prior plan/progress docs.
8. **Sanity checks to run on next session start** — the same git/npm sequence as Plan 4's progress doc.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/progress/2026-05-11-plan-5-status.md
git commit -m "docs(plan-5): commit Plan 5 progress note"
```

---

## After Plan 5

Per Plan 4's pattern (now the canonical workflow):

1. **User does fresh manual browser pass** on the latest tip (Task 12 Step 4 is the checklist).
2. **Open PR** with title `Plan 5: Bingo surface — themed card + called panel + called track`.
3. **Merge to `main`** via fast-forward; delete the feature branch local + origin.
4. **Deploy** via `./deploy/deploy.sh deploy`.
5. **Start Plan 6** (Section 7 — themed win/loss celebration system). Atoms ready then will include all Plan 5 work plus everything Plans 1+2+3+4 built. **Plan 6 is the last plan in the redesign**; it touches all 3 game surfaces (Slots/Roulette/Bingo) by upgrading the GameShell-level overlay into per-theme celebrations.

---

## Self-review notes (filled by the planner)

**Spec coverage check (Section 6):**
- Themed card frame replacing hot-pink heavy border: ✓ Task 5 (unified shape with `border-theme-primary` + `bg-theme-bg/80`; bespoke per-theme variants deferred per scoping decision)
- 3×3 number grid kept (existing `makeBoard` + `evaluateBingoBoard` reused): ✓ Task 2 (hook holds `makeBoard` and reuses `evaluateBingoBoard` verbatim)
- Cells: white rounded squares with the number: ✓ Task 4 (white bg when unmarked; theme-tinted bg + marker overlay when marked)
- Marker overlay with stamp animation `scale(0.4) → scale(1)` overshoot, per-theme variants: ◐ Task 3 ships unified themed disk with spring overshoot; bespoke per-theme variants deferred
- Line-complete highlight (yellow ring on completed line cells, persists): ✓ Tasks 1 + 5 (`evaluateBingoLines` + per-cell `isWinningLine` ring)
- Side panel JUST CALLED themed circular badge with bouncy entry per call, per-theme variants: ◐ Task 6 ships unified `bg-theme-primary` badge with spring overshoot; bespoke per-theme variants (candy ball / hieroglyph cartouche / holographic orb / kanji-stamp) deferred
- Side panel LINES tracker (4 rows): ✓ Task 7
- Called-so-far track (15×2 grid showing all 30, lit cells stay lit, "Called so far · N / 12" caption): ✓ Task 8
- "BINGO!" banner sweep on win in theme display font: ✓ Task 11 (banner inherits theme display font from `BingoSurface`'s wrapper, which applies `themeManifesto[theme].font`); banner's own className adds `font-black` for weight on top of the theme font family
- Triggers Section 7 themed celebration: DEFERRED to Plan 6 per scoping decision (existing GameShell-level overlay still fires)
- Win amount counter ticks up in balance pill: EXISTING (lives in upstream `BalancePill` from Plan 2; not changed by Plan 5)
- New components: `BingoCard`, `BingoCell`, `BingoMarker`, `CalledPanel`, `CalledTrack`, `useBingoGame`: ✓ Tasks 2-9 (plus `BingoSurface` orchestrator added beyond strict spec list, justified by Plan-3+4-mirror composition)
- Existing `makeBoard` + `evaluateBingoBoard` kept verbatim: ✓ (only `gameLogic.ts` change is the additive `evaluateBingoLines` helper in Task 1; `makeBoard` moves location into the hook but its body is byte-identical)

**Type consistency check:**
- `BingoLines` defined in Task 1; consumed by `BingoCard` (Task 5), `CalledPanel` (Task 7), `BingoSurface` (Task 9). ✓
- `UseBingoGameReturn` defined in Task 2; re-imported by `BingoSurface` (Task 9). ✓
- `BingoCardProps` extended in Task 11 with optional `win?` prop; defaults to `null` so existing call sites don't break. ✓
- All component testids — `bingo-surface`, `bingo-card`, `bingo-cell-{n}`, `bingo-marker`, `called-panel`, `just-called-badge`, `lines-tracker`, `lines-tracker-{rows0|rows1|rows2|colsOrDiags}`, `called-track`, `called-track-{n}`, `bingo-win-banner` — used consistently across tests. ✓
- `MAX_DRAWS = 12` and `DRAW_INTERVAL_MS = 600` exported from `useBingoGame`; `CalledTrack` imports `MAX_DRAWS` for the caption. ✓ (Task 1 had to be careful to set them as `export const` not `const` for this re-import to work.)

**Placeholder scan:**
- No "TBD" or "implement later" steps.
- Every code step shows the actual code.
- Every test step shows the actual test code with concrete assertions.
- Commit messages are explicit.

**Known imperfections to flag for the implementer:**
- Task 7's literal step instructs the implementer to update Task 6's existing render calls (5 sites) to add `lines={noLines}` once the prop is required. This is a micro-task within Step 1 — easy to forget. If TS compile fails on test 6 after Task 7's implementation, it's almost certainly the missing `lines={noLines}` on a render call.
- The theme-font cascade from `BingoSurface` reaches ALL descendants including the LINES tracker labels ("Row 1", "Cols & Diagonals") and the "Just called" header text. This is intentional (cohesive theme look) but if a particular theme's display font reads poorly at the small sizes used by those labels, override locally with `font-sans` on the specific element. The `font-black` on the BINGO banner stacks with the theme font family (so e.g. for sweets the banner is heavy-weight Chewy, not heavy-weight Inter).
- Task 8's `CalledTrack` uses inline `style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}` because Tailwind's default `grid-cols-*` only goes to 12. Tailwind v4 should support arbitrary grid-cols (`grid-cols-[repeat(15,minmax(0,1fr))]`), but inline style is a guaranteed fallback if the arbitrary-value syntax breaks for any reason. The implementer can swap to the arbitrary-value syntax if preferred.
- Task 4's BingoCell `aspect-square` forces a 1:1 aspect ratio on each cell. On very narrow viewports the cell can shrink to where the marker disk + number text overlap awkwardly. Acceptable for v1; `min-h-[5vh]` on the wrapper would be a cheap follow-up.
- The `MAX_DRAWS` constant is exported from `useBingoGame.ts` and imported in `CalledTrack.tsx`. This creates a dependency from a UI component into a hook module. Some teams would prefer the constant lives in a neutral location (`src/lib/constants.ts` or similar). The hook is the natural source-of-truth for now since the value drives both game logic AND the UI caption — but watch for it leaking further if other components want it later.
- Hook tests don't exercise the WIN path (they verify `play()` resolves with `message != null` but don't force a board such that the random draws actually complete a line). This is acceptable because: (a) the `evaluateBingoBoard` function is independently tested, (b) the win/lose branches in the hook are byte-identical to the prior production code (this is a lift-and-shift), (c) forcing a deterministic board would require mocking `Math.random()` which is brittle. The win path IS exercised end-to-end in the manual browser pass (Task 12 Step 4 §9).
- Tests use the literal `2500`/`600`/`12` integers in places where importing `SETTLE_MS` / `DRAW_INTERVAL_MS` / `MAX_DRAWS` from the hook would be cleaner. Plan 4 had the same pattern with `SETTLE_MS`. If a future plan tunes these timings, tests will need updating in lockstep.
