# Slots Surface Implementation Plan (Plan 3 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the bare-card Slots widget into a real slot machine — themed chassis, 3 reels × 3 visible symbols (middle row = payline), vertical-scroll spin with staggered stops, illuminated payline strip, in-window win pulses. Folds in two long-standing bugs in the same PR.

**Architecture:** Decompose the current monolithic `src/components/Games/Slots.tsx` (167 lines, all responsibilities mixed) into a hook (`useSlotsGame`) for state and timing plus a small component family in `src/components/Games/Slots/` (`SlotMachine` orchestrator, `SlotChassis` themed wrapper, `SlotReel`, `SlotSymbol`, `PaylineStrip`, `BottomLedBar`). The existing `Slots.tsx` shrinks to a thin `<GameShell><SlotMachine /></GameShell>` wrapper so `App.tsx` and the `Props` interface are unchanged. The chassis is **manifesto-driven** (one shape, theme-distinct colours/border via `themeManifesto.surface`/`border` tokens); bespoke per-theme chassis shapes (sarcophagus, neon grid, etc.) are deferred to a polish pass. Per-reel click sounds are deferred (no new audio assets). Themed celebration (jackpot takeover, particle field) is deferred to the future Plan 6 (Section 7); Plan 3 keeps the existing GameShell-level confetti and adds in-window pulses (payline glow + winning-symbol ring).

**Tech Stack:** React 18 + TypeScript, Framer Motion (`motion/react`, already a dep), Vite, vitest + jsdom. No new dependencies.

---

## Pre-flight

The branch should be created from current `main` (tip after Plan 2 deploy: `1973d1c`). Use the `superpowers:using-git-worktrees` skill or:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/plan-3-slots-surface
```

Confirm baseline: `npm run lint && npm test && npx vite build` should be green (lint exit 0, 219/219 tests, build succeeds within ~10s).

## File structure overview

**New files (all under `src/components/Games/Slots/` unless noted):**

| File | Responsibility |
|---|---|
| `src/hooks/useSlotsGame.ts` | Game state + timing: bet, reelStates, spinning, win, message, spin(), perReelStop(i) |
| `src/hooks/useSlotsGame.test.ts` | Vitest unit tests for the hook (uses fake timers) |
| `Slots/SlotSymbol.tsx` | One symbol cell. Routes between `<img>` for `https://` URLs (Gemini signed URLs) and `<span>` for emoji/text. Includes the `data:`-prefix bug fix. |
| `Slots/SlotSymbol.test.tsx` | url-vs-emoji branch test |
| `Slots/SlotReel.tsx` | One reel: 3 visible cells (top dim · middle bright · bottom dim) + Framer-Motion vertical scroll during spin |
| `Slots/SlotReel.test.tsx` | Static layout + spin animation classes |
| `Slots/SlotChassis.tsx` | Themed wrapper. Reads `useTheme()`, applies `data-surface` attribute, themed border + inset shadow |
| `Slots/SlotChassis.test.tsx` | Renders correct `data-surface` per theme |
| `Slots/PaylineStrip.tsx` | Horizontal LED strip across middle row. `data-state="idle" \| "win"` |
| `Slots/PaylineStrip.test.tsx` | Idle vs win class assertion |
| `Slots/BottomLedBar.tsx` | Bottom decorative bar. `data-state="idle" \| "small" \| "jackpot"` |
| `Slots/BottomLedBar.test.tsx` | data-state assertion |
| `Slots/SlotMachine.tsx` | Orchestrator. Composes Chassis + PaylineStrip + 3 SlotReels + BottomLedBar. Reads `useSlotsGame` |
| `Slots/SlotMachine.test.tsx` | Integration: renders 3 reels, payline state changes on win |
| `Slots.test.tsx` (in `src/components/Games/`) | Light integration test that exercises the GameShell contract end-to-end |

**Modified files:**

| File | What changes |
|---|---|
| `src/components/Games/Slots.tsx` | Body shrinks from 167 lines to ~30: imports `<SlotMachine>`, lifts bet/balance/spin from useSlotsGame, passes them to GameShell. Props interface unchanged. |

No changes to: `App.tsx`, `gameLogic.ts` (`evaluateSlotsResult` kept verbatim), `themeManifesto.ts`, `SoundEngine.ts` (`playSlotSpin` reused), `GameShell.tsx`, `useAssets.ts`, `config/games.ts`.

---

## Conventions used in every task

- **Step 1 is always "Write the failing test first."** Steps 2 = run it, observe failure. Steps 3–4 = implement + run again, observe pass. Last step = commit. This is per `superpowers:test-driven-development`.
- **Commit messages** follow Plan 2's convention: `feat(slots): ...`, `fix(slots): ...`, `refactor(slots): ...`, `docs(plan-3): ...`. No `Co-Authored-By` lines (Plan 2 did not use them).
- **Imports** for `ThemeType` come from `'../../utils/themeManifesto'` (the canonical source post-Plan 1 dedup). Do NOT re-import from `'../../App'` — Plan 1's commit `4a60ebe` made App.tsx a re-export, but new code should hit the source directly.
- **Tests** use `vi.mock` for hooks where they would otherwise hit Firebase or window.AudioContext. See `GameShell.test.tsx` for the canonical mock layout.
- **One concept per commit.** If a step's diff bleeds into unrelated cleanup, split it into its own commit.

---

## Task 1: `useSlotsGame` hook — lift state, no behaviour change

**Goal:** Extract `bet`, `reels`, `spinning`, `win`, `message` state + the `handleSpin` body from current `Slots.tsx` into a hook. Behaviour is unchanged in this task — the goal is a clean state surface so later tasks can iterate without churning the React component too.

**Files:**
- Create: `src/hooks/useSlotsGame.ts`
- Create: `src/hooks/useSlotsGame.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useSlotsGame.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlotsGame } from './useSlotsGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playSlotSpin: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useSlotsGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const symbols = ['🍭', '🧁', '🍬', '🍩'];

  it('starts with spinning=false, win=null, default bet=10', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    expect(result.current.spinning).toBe(false);
    expect(result.current.win).toBeNull();
    expect(result.current.bet).toBe(10);
  });

  it('spin() flips spinning=true and clears prior win/message', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
  });

  it('spin() resolves to a final state after 20 cycles × 100ms', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });
    act(() => { vi.advanceTimersByTime(20 * 100 + 50); });
    expect(result.current.spinning).toBe(false);
    expect(onUpdateBalance).toHaveBeenCalledWith(-10); // bet deducted at spin start
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: `Cannot find module './useSlotsGame'` or similar.

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/useSlotsGame.ts
import { useState, useRef, useCallback } from 'react';
import { evaluateSlotsResult } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';

export interface UseSlotsGameOptions {
  theme: ThemeType;
  /** Symbol pool for this theme (Gemini URLs or emoji fallbacks). */
  symbols: string[];
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseSlotsGameReturn {
  bet: number;
  setBet: (n: number) => void;
  reels: string[];
  spinning: boolean;
  win: 'jackpot' | 'small' | null;
  message: string | null;
  spin: () => void;
}

export function useSlotsGame(opts: UseSlotsGameOptions): UseSlotsGameReturn {
  const { theme, symbols, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(['', '', '']);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Keep the latest props readable from inside setInterval without re-creating the spin closure.
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const spin = useCallback(() => {
    if (spinning || balance < bet || symbols.length === 0) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance?.(-bet);
    soundEngine.playSlotSpin(theme, 2000);

    const pick = () => symbolsRef.current[Math.floor(Math.random() * symbolsRef.current.length)];
    let spins = 0;
    const interval = setInterval(() => {
      setReels([pick(), pick(), pick()]);
      spins++;
      if (spins > 20) {
        clearInterval(interval);
        const finalReels = [pick(), pick(), pick()];
        setReels(finalReels);

        const result = evaluateSlotsResult(finalReels);
        if (result === 'jackpot') {
          const payout = bet * 50;
          onUpdateBalance?.(payout);
          setWin('jackpot');
          setMessage(`JACKPOT! +${payout}`);
          soundEngine.playWin(theme);
        } else if (result === 'small') {
          const payout = bet * 3;
          onUpdateBalance?.(payout);
          setWin('small');
          setMessage(`Small win: +${payout}`);
          soundEngine.playWin(theme);
        } else {
          setMessage('No match. Try again.');
          soundEngine.playLose(theme);
        }
        setSpinning(false);
      }
    }, 100);
  }, [bet, balance, theme, spinning, onUpdateBalance, symbols.length]);

  return { bet, setBet, reels, spinning, win, message, spin };
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSlotsGame.ts src/hooks/useSlotsGame.test.ts
git commit -m "feat(slots): useSlotsGame hook lifts spin state out of Slots.tsx"
```

---

## Task 2: `SlotSymbol` — URL/emoji renderer (fixes `data:`-prefix bug)

**Goal:** Single cell that renders an `<img>` for `https://` URLs (Gemini signed GCS URLs) and a styled `<span>` for emoji fallbacks. Fixes the latent bug at current `Slots.tsx:148` where `symbol.startsWith('data:')` rejects every Gemini URL because they're signed GCS URLs (`https://storage.googleapis.com/...`), not data URIs.

**Files:**
- Create: `src/components/Games/Slots/SlotSymbol.tsx`
- Create: `src/components/Games/Slots/SlotSymbol.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/SlotSymbol.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotSymbol } from './SlotSymbol';

describe('SlotSymbol', () => {
  it('renders an <img> when src is an https URL (Gemini signed URL)', () => {
    render(<SlotSymbol src="https://storage.googleapis.com/x/y.png" alt="sweet" />);
    const img = screen.getByRole('img', { name: 'sweet' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://storage.googleapis.com/x/y.png');
  });

  it('renders an <img> when src is an http URL (rare, but symmetric)', () => {
    render(<SlotSymbol src="http://example.com/x.png" alt="sweet" />);
    expect(screen.getByRole('img', { name: 'sweet' })).toBeInTheDocument();
  });

  it('renders text (no img) when src is an emoji fallback', () => {
    render(<SlotSymbol src="🍭" alt="sweet" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('🍭')).toBeInTheDocument();
  });

  it('renders text (no img) when src is empty', () => {
    render(<SlotSymbol src="" alt="sweet" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/SlotSymbol.test.tsx
```
Expected: `Cannot find module './SlotSymbol'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/SlotSymbol.tsx
import { motion } from 'motion/react';

export interface SlotSymbolProps {
  /** Either a Gemini signed URL (https://...) or an emoji/text fallback. */
  src: string;
  /** Accessibility label. */
  alt: string;
  /** True when this symbol is part of a winning payline; adds ring + scale pulse. */
  winning?: boolean;
}

const URL_RE = /^https?:\/\//;

export function SlotSymbol({ src, alt, winning = false }: SlotSymbolProps) {
  const isUrl = URL_RE.test(src);
  return (
    <motion.div
      data-testid="slot-symbol"
      data-winning={winning ? 'true' : 'false'}
      animate={winning ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: winning ? 3 : 0 }}
      className={`w-full h-full flex items-center justify-center overflow-hidden ${winning ? 'ring-[0.5vh] ring-yellow-400' : ''}`}
    >
      {isUrl ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span aria-label={alt}>{src}</span>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotSymbol.test.tsx
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotSymbol.tsx src/components/Games/Slots/SlotSymbol.test.tsx
git commit -m "feat(slots): SlotSymbol renders <img> for Gemini https URLs (fixes data:-prefix bug)"
```

---

## Task 3: `SlotReel` — static three-cell layout (top dim · middle bright · bottom dim)

**Goal:** Render `{ top, middle, bottom }` as three vertically stacked SlotSymbol cells. Top + bottom dimmed (opacity-50, slight blur, scale-95); middle bright. No spin animation in this task — static layout only. Animation lands in Task 9.

**Files:**
- Create: `src/components/Games/Slots/SlotReel.tsx`
- Create: `src/components/Games/Slots/SlotReel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/SlotReel.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotReel } from './SlotReel';

describe('SlotReel', () => {
  const cells = { top: '🍭', middle: '🧁', bottom: '🍬' };

  it('renders all three cells in order top → middle → bottom', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} />);
    const symbols = screen.getAllByTestId('slot-symbol');
    expect(symbols).toHaveLength(3);
    expect(symbols[0]).toHaveTextContent('🍭');
    expect(symbols[1]).toHaveTextContent('🧁');
    expect(symbols[2]).toHaveTextContent('🍬');
  });

  it('marks middle cell as bright and top/bottom as dim via data-state', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} />);
    const reel = screen.getByTestId('slot-reel');
    const cellEls = reel.querySelectorAll('[data-cell]');
    expect(cellEls[0]).toHaveAttribute('data-cell', 'top');
    expect(cellEls[1]).toHaveAttribute('data-cell', 'middle');
    expect(cellEls[2]).toHaveAttribute('data-cell', 'bottom');
    expect(cellEls[0]).toHaveAttribute('data-state', 'dim');
    expect(cellEls[1]).toHaveAttribute('data-state', 'bright');
    expect(cellEls[2]).toHaveAttribute('data-state', 'dim');
  });

  it('exposes data-reel-index for orchestrator wiring', () => {
    render(<SlotReel cells={cells} index={2} spinning={false} />);
    expect(screen.getByTestId('slot-reel')).toHaveAttribute('data-reel-index', '2');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/SlotReel.test.tsx
```
Expected: `Cannot find module './SlotReel'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/SlotReel.tsx
import { SlotSymbol } from './SlotSymbol';

export interface ReelCells {
  top: string;
  middle: string;
  bottom: string;
}

export interface SlotReelProps {
  cells: ReelCells;
  /** 0-based reel position; used for staggered stop timing later. */
  index: number;
  spinning: boolean;
  /** True when this reel is part of a winning payline (middle cell wins). */
  winning?: boolean;
}

const cellOrder = ['top', 'middle', 'bottom'] as const;

export function SlotReel({ cells, index, spinning, winning = false }: SlotReelProps) {
  return (
    <div
      data-testid="slot-reel"
      data-reel-index={index}
      data-spinning={spinning ? 'true' : 'false'}
      className="flex flex-col gap-1 w-[15vh] md:w-[20vh] h-[36vh] md:h-[48vh]"
    >
      {cellOrder.map((position) => {
        const symbol = cells[position];
        const isMiddle = position === 'middle';
        return (
          <div
            key={position}
            data-cell={position}
            data-state={isMiddle ? 'bright' : 'dim'}
            className={`flex-1 bg-white rounded-lg flex items-center justify-center text-[6vh] md:text-[8vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-[0.3vh] border-gray-200 overflow-hidden ${
              isMiddle ? '' : 'opacity-50 scale-95 blur-[1px]'
            }`}
          >
            <SlotSymbol src={symbol} alt={`reel-${index}-${position}`} winning={isMiddle && winning} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotReel.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotReel.tsx src/components/Games/Slots/SlotReel.test.tsx
git commit -m "feat(slots): SlotReel three-cell layout (top dim · middle bright · bottom dim)"
```

---

## Task 4: `SlotChassis` — themed wrapper driven by manifesto tokens

**Goal:** Themed frame around the slot window. Reads `useTheme()`, applies `data-surface` + `data-border` attributes, renders a themed border + inset shadow + theme-coloured backdrop. One shape; the per-theme distinction comes from the colour/border tokens (per the answered scoping question). Bespoke per-theme chassis shapes (sarcophagus, neon grid, etc.) are an explicit deferral.

**Files:**
- Create: `src/components/Games/Slots/SlotChassis.tsx`
- Create: `src/components/Games/Slots/SlotChassis.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/SlotChassis.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotChassis } from './SlotChassis';
import { THEME_NAMES } from '../../../utils/themeManifesto';

describe('SlotChassis', () => {
  it('renders children inside a frame', () => {
    render(<SlotChassis theme="sweets"><div data-testid="inner">x</div></SlotChassis>);
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });

  it.each(THEME_NAMES)('exposes data-surface and data-border for theme %s', (theme) => {
    render(<SlotChassis theme={theme}>x</SlotChassis>);
    const frame = screen.getByTestId('slot-chassis');
    expect(frame).toHaveAttribute('data-theme', theme);
    expect(frame).toHaveAttribute('data-surface'); // value comes from manifesto; just assert presence
    expect(frame).toHaveAttribute('data-border');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/SlotChassis.test.tsx
```
Expected: `Cannot find module './SlotChassis'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/SlotChassis.tsx
import { type ReactNode } from 'react';
import { themeManifesto, type ThemeType } from '../../../utils/themeManifesto';

export interface SlotChassisProps {
  theme: ThemeType;
  children: ReactNode;
}

export function SlotChassis({ theme, children }: SlotChassisProps) {
  const m = themeManifesto[theme];
  return (
    <div
      data-testid="slot-chassis"
      data-theme={theme}
      data-surface={m.surface}
      data-border={m.border}
      className="bg-theme-bg/80 p-4 md:p-6 rounded-2xl border-[0.8vh] border-theme-primary shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative w-full max-w-[80vh] mx-auto"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none rounded-xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotChassis.test.tsx
```
Expected: 9 passed (1 base + 8 theme cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotChassis.tsx src/components/Games/Slots/SlotChassis.test.tsx
git commit -m "feat(slots): SlotChassis manifesto-driven themed frame"
```

---

## Task 5: `PaylineStrip` — horizontal LED strip across middle row

**Goal:** A horizontal strip with arrow markers on both sides indicating the payline (middle row). Two states: `idle` (subtle theme-accent glow) and `win` (pulse outward from centre). Theme accent inherited via existing CSS custom prop.

**Files:**
- Create: `src/components/Games/Slots/PaylineStrip.tsx`
- Create: `src/components/Games/Slots/PaylineStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/PaylineStrip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaylineStrip } from './PaylineStrip';

describe('PaylineStrip', () => {
  it('defaults to idle state', () => {
    render(<PaylineStrip winning={false} />);
    expect(screen.getByTestId('payline-strip')).toHaveAttribute('data-state', 'idle');
  });

  it('switches to win state when winning is true', () => {
    render(<PaylineStrip winning={true} />);
    expect(screen.getByTestId('payline-strip')).toHaveAttribute('data-state', 'win');
  });

  it('renders left and right arrow markers', () => {
    render(<PaylineStrip winning={false} />);
    expect(screen.getByTestId('payline-arrow-left')).toBeInTheDocument();
    expect(screen.getByTestId('payline-arrow-right')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/PaylineStrip.test.tsx
```
Expected: `Cannot find module './PaylineStrip'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/PaylineStrip.tsx
import { motion } from 'motion/react';

export interface PaylineStripProps {
  winning: boolean;
}

export function PaylineStrip({ winning }: PaylineStripProps) {
  return (
    <div
      data-testid="payline-strip"
      data-state={winning ? 'win' : 'idle'}
      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10"
    >
      <div data-testid="payline-arrow-left" className="text-theme-accent text-[3vh] md:text-[4vh] -ml-[1vh]" aria-hidden>▶</div>
      <motion.div
        animate={winning ? { opacity: [0.3, 1, 0.3], scaleY: [1, 1.6, 1] } : { opacity: 0.3, scaleY: 1 }}
        transition={winning ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className="flex-1 h-[0.6vh] mx-2 rounded-full bg-theme-accent shadow-[0_0_12px_var(--theme-accent,_currentColor)]"
      />
      <div data-testid="payline-arrow-right" className="text-theme-accent text-[3vh] md:text-[4vh] -mr-[1vh]" aria-hidden>◀</div>
    </div>
  );
}
```

Note: `text-theme-accent`, `bg-theme-accent`, and the CSS custom prop `--theme-accent` are already wired in Plan 1's `src/index.css` per `:root[data-theme="..."]` rules. No new tokens needed.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/PaylineStrip.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/PaylineStrip.tsx src/components/Games/Slots/PaylineStrip.test.tsx
git commit -m "feat(slots): PaylineStrip — LED across middle row, pulses on win"
```

---

## Task 6: `BottomLedBar` — idle / small / jackpot states

**Goal:** Bottom decorative bar inside the chassis. Three discrete states: `idle` (gentle theme glow), `small` (chase pattern), `jackpot` (stronger sweep + brighter).

**Files:**
- Create: `src/components/Games/Slots/BottomLedBar.tsx`
- Create: `src/components/Games/Slots/BottomLedBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/BottomLedBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomLedBar } from './BottomLedBar';

describe('BottomLedBar', () => {
  it('idle state when win is null', () => {
    render(<BottomLedBar win={null} />);
    expect(screen.getByTestId('bottom-led-bar')).toHaveAttribute('data-state', 'idle');
  });
  it('small state for small win', () => {
    render(<BottomLedBar win="small" />);
    expect(screen.getByTestId('bottom-led-bar')).toHaveAttribute('data-state', 'small');
  });
  it('jackpot state for jackpot win', () => {
    render(<BottomLedBar win="jackpot" />);
    expect(screen.getByTestId('bottom-led-bar')).toHaveAttribute('data-state', 'jackpot');
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/BottomLedBar.test.tsx
```
Expected: `Cannot find module './BottomLedBar'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/BottomLedBar.tsx
import { motion } from 'motion/react';

export interface BottomLedBarProps {
  win: 'jackpot' | 'small' | null;
}

const variants = {
  idle: { backgroundPosition: '0% 50%', opacity: 0.5 },
  small: { backgroundPosition: ['0% 50%', '100% 50%'], opacity: 0.85 },
  jackpot: { backgroundPosition: ['0% 50%', '100% 50%'], opacity: 1 },
} as const;

export function BottomLedBar({ win }: BottomLedBarProps) {
  const state: keyof typeof variants = win ?? 'idle';
  const repeat = win ? Infinity : 0;
  const duration = win === 'jackpot' ? 0.6 : win === 'small' ? 1.0 : 0.2;
  return (
    <motion.div
      data-testid="bottom-led-bar"
      data-state={state}
      animate={variants[state]}
      transition={{ duration, repeat, ease: 'linear' }}
      className="h-[1vh] mt-3 rounded-full bg-[length:200%_100%] bg-gradient-to-r from-transparent via-theme-accent to-transparent"
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/BottomLedBar.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/BottomLedBar.tsx src/components/Games/Slots/BottomLedBar.test.tsx
git commit -m "feat(slots): BottomLedBar — idle glow, small chase, jackpot sweep"
```

---

## Task 7: `useSlotsGame` — extend to 3-row reel state

**Goal:** Replace `reels: string[3]` with `reelStates: ReelCells[3]` so each reel exposes `{ top, middle, bottom }`. The middle row is the payline (what `evaluateSlotsResult` evaluates). Top + bottom are picked from the same symbol pool. This task does NOT change the spin timing or animation — that's Task 9.

**Files:**
- Modify: `src/hooks/useSlotsGame.ts`
- Modify: `src/hooks/useSlotsGame.test.ts`

- [ ] **Step 1: Update the failing test first**

Append to `src/hooks/useSlotsGame.test.ts`:

```ts
  it('exposes reelStates with {top, middle, bottom} per reel', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    expect(result.current.reelStates).toHaveLength(3);
    for (const r of result.current.reelStates) {
      expect(r).toHaveProperty('top');
      expect(r).toHaveProperty('middle');
      expect(r).toHaveProperty('bottom');
    }
  });

  it('after spin, middle row symbols are the payline (used by evaluateSlotsResult)', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    act(() => { result.current.spin(); });
    act(() => { vi.advanceTimersByTime(20 * 100 + 50); });
    const payline = result.current.reelStates.map(r => r.middle);
    // Symbols must come from the configured pool (no leakage of empty strings).
    for (const sym of payline) expect(symbols).toContain(sym);
  });
```

Also update the existing `'spin() resolves to a final state'` test to assert `result.current.reelStates[0].middle !== ''` instead of `result.current.reels[0] !== ''`.

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: `result.current.reelStates is undefined` for the new tests; the modified test fails for the same reason.

- [ ] **Step 3: Modify `useSlotsGame`**

Replace the `reels` state and the `pick` body:

```ts
// at top of file, after imports
import type { ReelCells } from '../components/Games/Slots/SlotReel';

// in UseSlotsGameReturn, replace `reels: string[]` with:
  reelStates: [ReelCells, ReelCells, ReelCells];

// in the hook body, replace `useState<string[]>(['', '', ''])` with:
  const emptyCells: ReelCells = { top: '', middle: '', bottom: '' };
  const [reelStates, setReelStates] = useState<[ReelCells, ReelCells, ReelCells]>([emptyCells, emptyCells, emptyCells]);

// replace the pick / setReels / finalReels block inside spin():
    const pick = () => symbolsRef.current[Math.floor(Math.random() * symbolsRef.current.length)];
    const pickReel = (): ReelCells => ({ top: pick(), middle: pick(), bottom: pick() });
    let spins = 0;
    const interval = setInterval(() => {
      setReelStates([pickReel(), pickReel(), pickReel()]);
      spins++;
      if (spins > 20) {
        clearInterval(interval);
        const finalReels: [ReelCells, ReelCells, ReelCells] = [pickReel(), pickReel(), pickReel()];
        setReelStates(finalReels);

        const payline = finalReels.map(r => r.middle);
        const result = evaluateSlotsResult(payline);
        // ...rest of the win-handling block stays identical
```

Remove the now-unused `reels` state and the `reels` field from the returned object.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: 5 passed (3 original + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSlotsGame.ts src/hooks/useSlotsGame.test.ts
git commit -m "feat(slots): useSlotsGame — three-row reel state (middle row = payline)"
```

---

## Task 8: Reel-init effect re-runs on URL change (fixes stuck-on-emoji bug)

**Goal:** The current `Slots.tsx:48-53` initializes reels once when `reels[0] === ''` and never re-runs. If `useAssets` returns emoji fallbacks first (cache miss in flight) and later resolves to URLs, the reels stay on emojis until the user spins. Replace the one-shot guard with an effect that re-runs whenever the symbol URL pool changes — but only while NOT spinning, so a mid-spin asset refresh doesn't yank symbols out from under the animation.

**Files:**
- Modify: `src/hooks/useSlotsGame.ts`
- Modify: `src/hooks/useSlotsGame.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/hooks/useSlotsGame.test.ts`:

```ts
  it('reel-init effect re-runs when symbol URLs change (not stuck on emoji fallbacks)', () => {
    const initial = ['🍭', '🧁', '🍬', '🍩'];
    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) =>
        useSlotsGame({ theme: 'sweets', symbols, balance: 100 }),
      { initialProps: { symbols: initial } }
    );
    // Initial state — middle is one of the emoji fallbacks.
    const firstMiddle = result.current.reelStates[0].middle;
    expect(initial).toContain(firstMiddle);

    // Simulate Gemini URLs landing.
    const urls = [
      'https://storage.googleapis.com/x/1.png',
      'https://storage.googleapis.com/x/2.png',
      'https://storage.googleapis.com/x/3.png',
      'https://storage.googleapis.com/x/4.png',
    ];
    rerender({ symbols: urls });

    // After re-render, reels pick up the new pool.
    for (const r of result.current.reelStates) {
      expect(urls).toContain(r.middle);
    }
  });

  it('does NOT reinitialise reels mid-spin when the symbol pool changes', () => {
    const initial = ['🍭', '🧁', '🍬', '🍩'];
    const urls = ['https://storage.googleapis.com/a.png', 'https://storage.googleapis.com/b.png'];
    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) =>
        useSlotsGame({ theme: 'sweets', symbols, balance: 100 }),
      { initialProps: { symbols: initial } }
    );
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    rerender({ symbols: urls });
    // Still spinning; reels not snapped to a stable state from the new pool.
    expect(result.current.spinning).toBe(true);
    // After spin completes, the new pool drives the final state.
    act(() => { vi.advanceTimersByTime(20 * 100 + 50); });
    expect(result.current.spinning).toBe(false);
    for (const r of result.current.reelStates) {
      expect(urls).toContain(r.middle);
    }
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: the new "re-runs when URLs change" test fails because reels are never re-initialised after the first non-empty pool.

- [ ] **Step 3: Add the effect**

In `useSlotsGame.ts`, after `setReelStates` and before `spin`, add:

```ts
import { useEffect } from 'react';

// (after the useState calls in the hook body)
useEffect(() => {
  if (spinning) return; // do not yank symbols out from under the animation
  if (symbols.length === 0) return;
  const pick = () => symbols[Math.floor(Math.random() * symbols.length)];
  setReelStates([
    { top: pick(), middle: pick(), bottom: pick() },
    { top: pick(), middle: pick(), bottom: pick() },
    { top: pick(), middle: pick(), bottom: pick() },
  ]);
  // Joining symbols into a single key keeps the effect's identity stable across
  // identical pools (e.g. assets re-rendering with the same URLs).
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [symbols.join('|'), spinning]);
```

The `symbols.join('|')` pattern is a deliberate workaround for React's referential dep check on array props — without it, every `useAssets` re-render with the same URLs would re-fire the effect and randomise the displayed symbols.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSlotsGame.ts src/hooks/useSlotsGame.test.ts
git commit -m "fix(slots): reel-init effect re-runs when symbol URLs land (no more stuck emoji)"
```

---

## Task 9: `SlotReel` vertical-scroll spin animation

**Goal:** Replace the static reel layout with a vertical-scroll animation while `spinning=true`. Build a virtual stack of 12 symbols per reel; translate it upward by `12 × cellHeight` over the spin duration with the spec's easing curve `cubic-bezier(0.15, 0, 0.25, 1)`. On stop, snap back to position 0 with the new `{top, middle, bottom}` visible. Apply motion blur during scroll. Spin durations are staggered per reel index: 1.5s / 2.0s / 2.5s.

**Files:**
- Modify: `src/components/Games/Slots/SlotReel.tsx`
- Modify: `src/components/Games/Slots/SlotReel.test.tsx`

- [ ] **Step 1: Add the failing test**

Append to `SlotReel.test.tsx`:

```tsx
  it('renders the spin scroll stack while spinning', () => {
    render(<SlotReel cells={cells} index={0} spinning={true} pool={['🍭','🧁','🍬','🍩']} />);
    const stack = screen.getByTestId('slot-reel-stack');
    expect(stack).toBeInTheDocument();
    // 12-deep virtual stack + the 3 final cells stays in DOM during spin.
    const stackCells = stack.querySelectorAll('[data-stack-cell]');
    expect(stackCells.length).toBeGreaterThanOrEqual(12);
  });

  it('does NOT render the spin stack when spinning=false (snaps to static cells)', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} pool={['🍭']} />);
    expect(screen.queryByTestId('slot-reel-stack')).not.toBeInTheDocument();
  });

  it('staggers stop duration by reel index (1.5s / 2.0s / 2.5s)', () => {
    const { rerender } = render(<SlotReel cells={cells} index={0} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel')).toHaveAttribute('data-stop-duration', '1500');
    rerender(<SlotReel cells={cells} index={1} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel')).toHaveAttribute('data-stop-duration', '2000');
    rerender(<SlotReel cells={cells} index={2} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel')).toHaveAttribute('data-stop-duration', '2500');
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/SlotReel.test.tsx
```
Expected: stack-related tests fail (no stack rendered); duration tests fail (no `data-stop-duration` attribute).

- [ ] **Step 3: Modify `SlotReel.tsx`**

```tsx
// src/components/Games/Slots/SlotReel.tsx
import { motion } from 'motion/react';
import { SlotSymbol } from './SlotSymbol';

export interface ReelCells {
  top: string;
  middle: string;
  bottom: string;
}

export interface SlotReelProps {
  cells: ReelCells;
  /** 0-based reel position; drives staggered stop timing. */
  index: number;
  spinning: boolean;
  /** Symbol pool used to populate the spin scroll stack. Required when spinning. */
  pool?: string[];
  /** True when the middle cell is part of a winning payline. */
  winning?: boolean;
}

const STAGGER_MS = [1500, 2000, 2500] as const;
const STACK_DEPTH = 12;
const cellOrder = ['top', 'middle', 'bottom'] as const;
const SPIN_EASE = [0.15, 0, 0.25, 1] as const;

export function SlotReel({ cells, index, spinning, pool = [], winning = false }: SlotReelProps) {
  const stopDuration = STAGGER_MS[Math.min(index, STAGGER_MS.length - 1)];

  // Build the 12-deep scroll stack: random pool symbols on top, then the final 3 cells at the bottom
  // so the visual destination is always {top, middle, bottom} when y settles at 0.
  const stack = (() => {
    if (!spinning || pool.length === 0) return [];
    const out: string[] = [];
    for (let i = 0; i < STACK_DEPTH; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
    out.push(cells.top, cells.middle, cells.bottom);
    return out;
  })();

  return (
    <div
      data-testid="slot-reel"
      data-reel-index={index}
      data-spinning={spinning ? 'true' : 'false'}
      data-stop-duration={stopDuration}
      className="flex flex-col gap-1 w-[15vh] md:w-[20vh] h-[36vh] md:h-[48vh] overflow-hidden relative"
    >
      {spinning ? (
        <motion.div
          data-testid="slot-reel-stack"
          initial={{ y: `-${STACK_DEPTH * 100}%` }}
          animate={{ y: 0 }}
          transition={{ duration: stopDuration / 1000, ease: SPIN_EASE }}
          className="flex flex-col gap-1 absolute inset-x-0 top-0 will-change-transform"
          style={{ filter: 'blur(2px)' }}
        >
          {stack.map((symbol, i) => {
            const isFinalMiddle = i === stack.length - 2; // last triplet is top/middle/bottom in order
            return (
              <div
                key={i}
                data-stack-cell={i}
                className="h-[12vh] md:h-[16vh] bg-white rounded-lg flex items-center justify-center text-[6vh] md:text-[8vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-[0.3vh] border-gray-200 overflow-hidden"
              >
                <SlotSymbol src={symbol} alt={`reel-${index}-stack-${i}`} winning={false} />
              </div>
            );
          })}
        </motion.div>
      ) : (
        cellOrder.map((position) => {
          const symbol = cells[position];
          const isMiddle = position === 'middle';
          return (
            <div
              key={position}
              data-cell={position}
              data-state={isMiddle ? 'bright' : 'dim'}
              className={`flex-1 bg-white rounded-lg flex items-center justify-center text-[6vh] md:text-[8vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-[0.3vh] border-gray-200 overflow-hidden ${
                isMiddle ? '' : 'opacity-50 scale-95 blur-[1px]'
              }`}
            >
              <SlotSymbol src={symbol} alt={`reel-${index}-${position}`} winning={isMiddle && winning} />
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotReel.test.tsx
```
Expected: 6 passed (3 original static-layout tests + 3 new spin-stack tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotReel.tsx src/components/Games/Slots/SlotReel.test.tsx
git commit -m "feat(slots): SlotReel vertical-scroll spin with staggered stop durations"
```

---

## Task 10: `useSlotsGame` — staggered stop timing aligned with SlotReel

**Goal:** Today, `useSlotsGame.spin()` resolves at `21 × 100ms = 2.1s` — a single instant where every reel snaps. With staggered visual stops at 1.5/2.0/2.5s in `SlotReel`, the hook must align: spinning state stays `true` until reel index 2 completes (2.5s), and the final win evaluation fires at that point. We don't try to drive each reel's payline reveal independently — too much state for too little visual gain — but the spin duration matches the slowest reel.

**Files:**
- Modify: `src/hooks/useSlotsGame.ts`
- Modify: `src/hooks/useSlotsGame.test.ts`

- [ ] **Step 1: Update the failing test**

Replace the existing `'spin() resolves to a final state after 20 cycles × 100ms'` test with:

```ts
  it('spin() spinning state lasts ~2500ms (longest reel stop)', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });

    // At 2400ms, still spinning (only reels 0+1 have stopped visually).
    act(() => { vi.advanceTimersByTime(2400); });
    expect(result.current.spinning).toBe(true);

    // At 2600ms, all three reels have settled and the win has been evaluated.
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.spinning).toBe(false);

    // Bet was deducted at the start; nothing else happens between deduct and possible payout.
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: still spinning check at 2400ms passes; the no-longer-spinning check at 2600ms fails because today the resolution is at 2100ms.

- [ ] **Step 3: Update `useSlotsGame.ts`**

Replace the spin body's `setInterval` block with:

```ts
    soundEngine.playSlotSpin(theme, 2500);
    const pickReel = (): ReelCells => ({ top: pick(), middle: pick(), bottom: pick() });

    // Live cycling for the visual reel-state change while spinning is still useful as a fallback
    // when SlotReel's animated stack isn't visible (test/jsdom environments). Cap at the slowest
    // reel duration so cycling stops in lockstep with the visual.
    const cycleInterval = setInterval(() => {
      setReelStates([pickReel(), pickReel(), pickReel()]);
    }, 100);

    const settleTimeout = setTimeout(() => {
      clearInterval(cycleInterval);
      const finalReels: [ReelCells, ReelCells, ReelCells] = [pickReel(), pickReel(), pickReel()];
      setReelStates(finalReels);

      const payline = finalReels.map(r => r.middle);
      const result = evaluateSlotsResult(payline);
      if (result === 'jackpot') {
        const payout = bet * 50;
        onUpdateBalance?.(payout);
        setWin('jackpot');
        setMessage(`JACKPOT! +${payout}`);
        soundEngine.playWin(theme);
      } else if (result === 'small') {
        const payout = bet * 3;
        onUpdateBalance?.(payout);
        setWin('small');
        setMessage(`Small win: +${payout}`);
        soundEngine.playWin(theme);
      } else {
        setMessage('No match. Try again.');
        soundEngine.playLose(theme);
      }
      setSpinning(false);
    }, 2500);

    // No need to return a cleanup from spin() itself — the spin function is invoked imperatively;
    // the interval + timeout always reach completion within 2.5s and clean themselves up.
```

Remove the now-unused `spins` counter and `if (spins > 20)` block.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/hooks/useSlotsGame.test.ts
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSlotsGame.ts src/hooks/useSlotsGame.test.ts
git commit -m "refactor(slots): useSlotsGame settles at 2.5s to match SlotReel's slowest stop"
```

---

## Task 11: `SlotMachine` orchestrator

**Goal:** Compose `SlotChassis` + `PaylineStrip` + 3 `SlotReel`s + `BottomLedBar`. Reads `useSlotsGame`. Owns the symbol pool wiring (currentSymbols computed from `useAssets` data) and passes the right props down. Exposes `bet`, `setBet`, `spin`, `spinning`, `win`, `message` upwards via a render-prop or via a separate `useSlotsGame` call by the parent — picked here as **render-prop** so `Slots.tsx` (Task 12) can hand them to `<GameShell>` without re-running `useSlotsGame`.

**Files:**
- Create: `src/components/Games/Slots/SlotMachine.tsx`
- Create: `src/components/Games/Slots/SlotMachine.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Games/Slots/SlotMachine.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotMachine } from './SlotMachine';

vi.mock('../../../utils/SoundEngine', () => ({
  soundEngine: { playSlotSpin: vi.fn(), playWin: vi.fn(), playLose: vi.fn() },
}));

vi.mock('../../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: {
      sweets_1: 'https://storage.googleapis.com/x/1.png',
      sweets_2: 'https://storage.googleapis.com/x/2.png',
      sweets_3: 'https://storage.googleapis.com/x/3.png',
      sweets_4: 'https://storage.googleapis.com/x/4.png',
    },
    loading: false,
  }),
}));

describe('SlotMachine', () => {
  it('renders the chassis, payline, three reels, and the bottom LED bar', () => {
    render(
      <SlotMachine theme="sweets" balance={100}>
        {() => null}
      </SlotMachine>
    );
    expect(screen.getByTestId('slot-chassis')).toBeInTheDocument();
    expect(screen.getByTestId('payline-strip')).toBeInTheDocument();
    expect(screen.getAllByTestId('slot-reel')).toHaveLength(3);
    expect(screen.getByTestId('bottom-led-bar')).toBeInTheDocument();
  });

  it('exposes bet/setBet/spin/spinning/win/message via the children render prop', () => {
    const child = vi.fn(() => null);
    render(<SlotMachine theme="sweets" balance={100}>{child}</SlotMachine>);
    expect(child).toHaveBeenCalled();
    const ctx = child.mock.calls[0][0];
    expect(typeof ctx.bet).toBe('number');
    expect(typeof ctx.setBet).toBe('function');
    expect(typeof ctx.spin).toBe('function');
    expect(typeof ctx.spinning).toBe('boolean');
    expect(ctx.win).toBeNull();
    expect(ctx.message).toBeNull();
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots/SlotMachine.test.tsx
```
Expected: `Cannot find module './SlotMachine'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/Games/Slots/SlotMachine.tsx
import { type ReactNode, useMemo } from 'react';
import { useAssets } from '../../../hooks/useAssets';
import { useSlotsGame, type UseSlotsGameReturn } from '../../../hooks/useSlotsGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { SlotChassis } from './SlotChassis';
import { SlotReel } from './SlotReel';
import { PaylineStrip } from './PaylineStrip';
import { BottomLedBar } from './BottomLedBar';

const FALLBACK_SYMBOLS_MAP: Record<ThemeType, string[]> = {
  sweets: ['🍭', '🧁', '🍬', '🍩'],
  egypt: ['🏺', '🛕', '🐪', '👁️'],
  space: ['🚀', '👽', '🪐', '☄️'],
  west: ['🤠', '🌵', '🐎', '🔫'],
  ocean: ['🦈', '🐙', '🐚', '🔱'],
  jungle: ['🐒', '🐍', '🗿', '🌴'],
  vampire: ['🦇', '🧛', '🩸', '🍷'],
  ninja: ['🥷', '🗡️', '🌸', '🏯'],
};

export interface SlotMachineRenderArgs extends UseSlotsGameReturn {}

export interface SlotMachineProps {
  theme: ThemeType;
  balance: number;
  onUpdateBalance?: (delta: number) => void;
  children: (args: SlotMachineRenderArgs) => ReactNode;
}

export function SlotMachine({ theme, balance, onUpdateBalance, children }: SlotMachineProps) {
  const symbolKeys = useMemo(() => [1, 2, 3, 4].map(n => `${theme}_${n}`), [theme]);
  const { assets } = useAssets(symbolKeys);

  const fallbacks = FALLBACK_SYMBOLS_MAP[theme];
  const symbols = useMemo(
    () => symbolKeys.map((k, i) => assets[k] || fallbacks[i]),
    // assets is referentially stable per render; relying on its values is enough
    // when we join below to flatten — see useSlotsGame's similar pattern.
    [symbolKeys, assets, fallbacks]
  );

  const game = useSlotsGame({ theme, symbols, balance, onUpdateBalance });

  return (
    <>
      <SlotChassis theme={theme}>
        <PaylineStrip winning={game.win !== null} />
        <div className="flex justify-center gap-[2vh] md:gap-[3vh] items-center relative">
          {game.reelStates.map((cells, i) => (
            <SlotReel
              key={i}
              cells={cells}
              index={i}
              spinning={game.spinning}
              pool={symbols}
              winning={game.win !== null}
            />
          ))}
        </div>
        <BottomLedBar win={game.win} />
      </SlotChassis>
      {children(game)}
    </>
  );
}
```

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotMachine.test.tsx
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotMachine.tsx src/components/Games/Slots/SlotMachine.test.tsx
git commit -m "feat(slots): SlotMachine orchestrator (chassis + payline + 3 reels + LED)"
```

---

## Task 12: Replace `Slots.tsx` body with the SlotMachine wrapper

**Goal:** `Slots.tsx` shrinks from 167 lines to ~30. It still renders inside `GameShell` so the bg / audio / BetControl / hero button / status line / win overlays continue to come from the shell. Props interface unchanged so `App.tsx` import stays unchanged.

**Files:**
- Modify: `src/components/Games/Slots.tsx`
- Create: `src/components/Games/Slots.test.tsx` (light integration test — Slots had no test file before)

- [ ] **Step 1: Write the integration test first**

```tsx
// src/components/Games/Slots.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { Slots } from './Slots';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: { playSlotSpin: vi.fn(), playWin: vi.fn(), playLose: vi.fn(), setMuted: vi.fn() },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: {
      bg_slots_sweets: 'https://x/bg.png',
      slots_sweets: 'https://x/icon.png',
      sweets_1: 'https://x/1.png',
      sweets_2: 'https://x/2.png',
      sweets_3: 'https://x/3.png',
      sweets_4: 'https://x/4.png',
    },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderSlots = (overrides: Partial<React.ComponentProps<typeof Slots>> = {}) =>
  render(
    <AudioControlsProvider>
      <Slots
        name="Sweet Line"
        theme="sweets"
        balance={100}
        onUpdateBalance={vi.fn()}
        onBack={vi.fn()}
        {...overrides}
      />
    </AudioControlsProvider>
  );

describe('Slots (integration)', () => {
  it('renders the slot machine inside GameShell', () => {
    renderSlots();
    expect(screen.getByTestId('slot-chassis')).toBeInTheDocument();
    expect(screen.getAllByTestId('slot-reel')).toHaveLength(3);
  });

  it('hero button label reads SPIN by default', () => {
    renderSlots();
    expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and observe FAIL**

```bash
npx vitest run src/components/Games/Slots.test.tsx
```
Expected: today's `Slots.tsx` does NOT render `<SlotChassis>` — the assertion fails.

- [ ] **Step 3: Replace `Slots.tsx`**

```tsx
// src/components/Games/Slots.tsx
import { GameShell } from './GameShell';
import { SlotMachine } from './Slots/SlotMachine';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const symbolKeys = [1, 2, 3, 4].map(n => `${theme}_${n}`);
  const extraAssetKeys = [`slots_${theme}`, ...symbolKeys];

  return (
    <SlotMachine theme={theme} balance={balance} onUpdateBalance={onUpdateBalance}>
      {(game) => (
        <GameShell
          name={name}
          theme={theme}
          bgKey={`bg_slots_${theme}`}
          extraAssetKeys={extraAssetKeys}
          gameType="slots"
          win={game.win}
          bet={game.bet}
          onBet={game.setBet}
          onPlay={game.spin}
          playLabel={game.spinning ? 'SPINNING...' : 'SPIN'}
          playDisabled={game.spinning || balance < game.bet}
          message={game.message}
          balance={balance}
          onBack={onBack}
        >
          {/* SlotMachine renders the slot-machine surface in its own subtree (above this children prop). */}
          <></>
        </GameShell>
      )}
    </SlotMachine>
  );
}
```

Wait — the structure above puts the chassis OUTSIDE GameShell, which breaks the bg art + backdrop blur. The chassis must render inside GameShell as `children`. Refactor `SlotMachine` to take a `surface` slot for the chassis tree separately from the `children` render-prop, OR (simpler) restructure here so `SlotMachine` IS the children of GameShell.

Use the simpler restructure: `Slots.tsx` calls `useSlotsGame` directly, passes the result to BOTH `<SlotMachine>` (as children of GameShell) and `<GameShell>` (for bet/spin/win props). Drop the render-prop API on SlotMachine.

Revise the implementation in two parts.

**Step 3a: Revise `SlotMachine.tsx` to take game as a prop instead of render-prop:**

```tsx
// src/components/Games/Slots/SlotMachine.tsx — revised
import { useMemo } from 'react';
import { useAssets } from '../../../hooks/useAssets';
import { type UseSlotsGameReturn } from '../../../hooks/useSlotsGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { SlotChassis } from './SlotChassis';
import { SlotReel } from './SlotReel';
import { PaylineStrip } from './PaylineStrip';
import { BottomLedBar } from './BottomLedBar';

const FALLBACK_SYMBOLS_MAP: Record<ThemeType, string[]> = {
  sweets: ['🍭', '🧁', '🍬', '🍩'],
  egypt: ['🏺', '🛕', '🐪', '👁️'],
  space: ['🚀', '👽', '🪐', '☄️'],
  west: ['🤠', '🌵', '🐎', '🔫'],
  ocean: ['🦈', '🐙', '🐚', '🔱'],
  jungle: ['🐒', '🐍', '🗿', '🌴'],
  vampire: ['🦇', '🧛', '🩸', '🍷'],
  ninja: ['🥷', '🗡️', '🌸', '🏯'],
};

export interface SlotMachineProps {
  theme: ThemeType;
  game: UseSlotsGameReturn;
}

export function SlotMachine({ theme, game }: SlotMachineProps) {
  const symbolKeys = useMemo(() => [1, 2, 3, 4].map(n => `${theme}_${n}`), [theme]);
  const { assets } = useAssets(symbolKeys);
  const fallbacks = FALLBACK_SYMBOLS_MAP[theme];
  const symbols = useMemo(
    () => symbolKeys.map((k, i) => assets[k] || fallbacks[i]),
    [symbolKeys, assets, fallbacks]
  );

  return (
    <SlotChassis theme={theme}>
      <PaylineStrip winning={game.win !== null} />
      <div className="flex justify-center gap-[2vh] md:gap-[3vh] items-center relative">
        {game.reelStates.map((cells, i) => (
          <SlotReel
            key={i}
            cells={cells}
            index={i}
            spinning={game.spinning}
            pool={symbols}
            winning={game.win !== null}
          />
        ))}
      </div>
      <BottomLedBar win={game.win} />
    </SlotChassis>
  );
}
```

The symbol pool is owned by SlotMachine (because that's where the asset wiring belongs); the game state is owned by `Slots.tsx` so it can pass props to GameShell. The cost: `useSlotsGame`'s `symbols` argument lives in `Slots.tsx`, but the `useAssets` call duplicates between SlotMachine and Slots.tsx. Resolution: extract a tiny helper to compute `symbols` and have BOTH call it. Or just call `useAssets` once in `Slots.tsx` and pass `symbols` down.

Pick option B: `Slots.tsx` does the `useAssets` call, computes `symbols`, passes them to both `useSlotsGame` AND `<SlotMachine>`. Keep SlotMachine a pure presenter:

**Step 3b: Final SlotMachine — pure presenter:**

```tsx
// src/components/Games/Slots/SlotMachine.tsx — final
import { type UseSlotsGameReturn } from '../../../hooks/useSlotsGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { SlotChassis } from './SlotChassis';
import { SlotReel } from './SlotReel';
import { PaylineStrip } from './PaylineStrip';
import { BottomLedBar } from './BottomLedBar';

export interface SlotMachineProps {
  theme: ThemeType;
  game: UseSlotsGameReturn;
  symbols: string[];
}

export function SlotMachine({ theme, game, symbols }: SlotMachineProps) {
  return (
    <SlotChassis theme={theme}>
      <PaylineStrip winning={game.win !== null} />
      <div className="flex justify-center gap-[2vh] md:gap-[3vh] items-center relative">
        {game.reelStates.map((cells, i) => (
          <SlotReel
            key={i}
            cells={cells}
            index={i}
            spinning={game.spinning}
            pool={symbols}
            winning={game.win !== null}
          />
        ))}
      </div>
      <BottomLedBar win={game.win} />
    </SlotChassis>
  );
}
```

**Update SlotMachine.test.tsx** accordingly — drop the children render-prop assertion, instead pass `game` + `symbols` directly:

```tsx
// src/components/Games/Slots/SlotMachine.test.tsx — revised
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotMachine } from './SlotMachine';
import type { UseSlotsGameReturn } from '../../../hooks/useSlotsGame';

const baseGame: UseSlotsGameReturn = {
  bet: 10,
  setBet: () => {},
  reelStates: [
    { top: '🍭', middle: '🧁', bottom: '🍬' },
    { top: '🍩', middle: '🍭', bottom: '🧁' },
    { top: '🍬', middle: '🍩', bottom: '🍭' },
  ],
  spinning: false,
  win: null,
  message: null,
  spin: () => {},
};

describe('SlotMachine', () => {
  it('renders the chassis, payline, three reels, and the bottom LED bar', () => {
    render(<SlotMachine theme="sweets" game={baseGame} symbols={['🍭','🧁','🍬','🍩']} />);
    expect(screen.getByTestId('slot-chassis')).toBeInTheDocument();
    expect(screen.getByTestId('payline-strip')).toBeInTheDocument();
    expect(screen.getAllByTestId('slot-reel')).toHaveLength(3);
    expect(screen.getByTestId('bottom-led-bar')).toBeInTheDocument();
  });

  it('switches payline data-state to "win" when game.win is non-null', () => {
    render(<SlotMachine theme="sweets" game={{ ...baseGame, win: 'jackpot' }} symbols={['🍭']} />);
    expect(screen.getByTestId('payline-strip')).toHaveAttribute('data-state', 'win');
  });
});
```

**Step 3c: Final `Slots.tsx`:**

```tsx
// src/components/Games/Slots.tsx — final
import { useMemo } from 'react';
import { GameShell } from './GameShell';
import { SlotMachine } from './Slots/SlotMachine';
import { useAssets } from '../../hooks/useAssets';
import { useSlotsGame } from '../../hooks/useSlotsGame';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

const FALLBACK_SYMBOLS_MAP: Record<ThemeType, string[]> = {
  sweets: ['🍭', '🧁', '🍬', '🍩'],
  egypt: ['🏺', '🛕', '🐪', '👁️'],
  space: ['🚀', '👽', '🪐', '☄️'],
  west: ['🤠', '🌵', '🐎', '🔫'],
  ocean: ['🦈', '🐙', '🐚', '🔱'],
  jungle: ['🐒', '🐍', '🗿', '🌴'],
  vampire: ['🦇', '🧛', '🩸', '🍷'],
  ninja: ['🥷', '🗡️', '🌸', '🏯'],
};

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const symbolKeys = useMemo(() => [1, 2, 3, 4].map(n => `${theme}_${n}`), [theme]);
  const extraAssetKeys = useMemo(() => [`slots_${theme}`, ...symbolKeys], [theme, symbolKeys]);
  const { assets } = useAssets(symbolKeys);

  const fallbacks = FALLBACK_SYMBOLS_MAP[theme];
  const symbols = useMemo(
    () => symbolKeys.map((k, i) => assets[k] || fallbacks[i]),
    [symbolKeys, assets, fallbacks]
  );

  const game = useSlotsGame({ theme, symbols, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_slots_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="slots"
      win={game.win}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.spin}
      playLabel={game.spinning ? 'SPINNING...' : 'SPIN'}
      playDisabled={game.spinning || balance < game.bet}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <SlotMachine theme={theme} game={game} symbols={symbols} />
    </GameShell>
  );
}
```

This puts the chassis as the *children* of GameShell — it renders inside the bg-art + backdrop-blur container, exactly like the previous slot widget did.

The duplicate `FALLBACK_SYMBOLS_MAP` between Slots.tsx and SlotMachine.tsx is removed (only Slots.tsx owns it now since SlotMachine is a pure presenter).

- [ ] **Step 4: Run all slots tests and observe PASS**

```bash
npx vitest run src/components/Games/Slots.test.tsx src/components/Games/Slots/ src/hooks/useSlotsGame.test.ts
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots.tsx src/components/Games/Slots.test.tsx src/components/Games/Slots/SlotMachine.tsx src/components/Games/Slots/SlotMachine.test.tsx
git commit -m "refactor(slots): Slots.tsx is now a thin GameShell + SlotMachine wrapper"
```

---

## Task 13: In-window win pulses (payline glow + winning-symbol ring)

**Goal:** When the spin lands on a win, the payline strip pulses (already wired in Task 5) and the middle-row symbols of all three reels show their winning ring + scale pulse (`SlotSymbol`'s `winning` prop, already wired in Task 2). Verify both fire correctly via integration test. No new component code — this task is the wiring + verification.

**Files:**
- Modify: `src/components/Games/Slots/SlotMachine.test.tsx` (add the assertion)

- [ ] **Step 1: Write the failing test**

Append to `SlotMachine.test.tsx`:

```tsx
  it('marks middle-row symbols as winning when game.win is set', () => {
    render(
      <SlotMachine
        theme="sweets"
        game={{ ...baseGame, win: 'jackpot' }}
        symbols={['🍭', '🧁', '🍬']}
      />
    );
    // Each reel renders 3 SlotSymbol elements; the middle one should be data-winning="true".
    const reels = screen.getAllByTestId('slot-reel');
    for (const reel of reels) {
      const cells = reel.querySelectorAll('[data-cell]');
      expect(cells[1]).toHaveAttribute('data-cell', 'middle');
      const innerSymbol = cells[1].querySelector('[data-testid="slot-symbol"]');
      expect(innerSymbol).toHaveAttribute('data-winning', 'true');
    }
  });
```

- [ ] **Step 2: Run test and observe FAIL or PASS**

```bash
npx vitest run src/components/Games/Slots/SlotMachine.test.tsx
```

If everything is wired correctly (Tasks 2, 9, 11 carried through), this should already pass. If it fails because the static-cell branch of `SlotReel` (used when `spinning=false`) isn't passing `winning={isMiddle && winning}` to `SlotSymbol`, **fix `SlotReel.tsx`** — this is the wire that closes the loop.

- [ ] **Step 3: Verify or wire**

Re-read `SlotReel.tsx`. Confirm the `cellOrder.map` branch passes `winning={isMiddle && winning}` to `<SlotSymbol>`. The implementation in Task 9 already does this; if it doesn't, add it.

- [ ] **Step 4: Run test and observe PASS**

```bash
npx vitest run src/components/Games/Slots/SlotMachine.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Games/Slots/SlotMachine.test.tsx src/components/Games/Slots/SlotReel.tsx
git commit -m "feat(slots): in-window win pulse — payline glow + winning middle-row ring"
```

If only the test file changed (no SlotReel.tsx fix needed), drop SlotReel.tsx from the commit.

---

## Task 14: Verification gate

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
Expected: All test files pass (Plan 2 baseline was 38 / 219; Plan 3 adds 7 new test files — `useSlotsGame`, `SlotSymbol`, `SlotReel`, `SlotChassis`, `PaylineStrip`, `BottomLedBar`, `SlotMachine`, `Slots` integration — and a handful of new test cases per file. Final expected: 46 / ~245).

- [ ] **Step 3: Build**

```bash
npx vite build
```
Expected: succeeds in ~10s. Bundle size: total JS within Plan 1's "+50 KB" budget. Plan 2 finished at 904 KB JS / 47.8 KB CSS. Plan 3 should add ≤30 KB JS (no new deps; new files are small). If JS jumps by more than 50 KB net, investigate before committing.

- [ ] **Step 4: Manual browser pass — checklist for the engineer**

Run dev servers:

```bash
npm run dev:server   # terminal 1
npm run dev          # terminal 2
```

Open `localhost:3000` (or the Cloud Shell preview URL). Walk through:

1. **Lobby → click any sweets game** (or any theme; sweets is fastest because the symbol assets are usually already cached in GCS from prior sessions).
2. **Slot machine renders inside the Gemini bg art + backdrop blur.** The chassis is themed (`data-surface="pillowy-glass"` for sweets — visible in DevTools).
3. **3 reels × 3 visible cells.** Top + bottom rows are dimmed; middle row is bright. Payline strip is visible across the middle.
4. **Symbols are Gemini images** (not emoji fallbacks) once assets resolve. Open one of the `<img>` tags in DevTools → `src` should be a `https://storage.googleapis.com/...` signed URL. **Critical: this is the bug fix from Task 2 — verify it visually.**
5. **Spin** with a default bet of 10. Reels scroll vertically with motion blur; reels stop in order at ~1.5s / 2.0s / 2.5s. Sound plays.
6. **Repeat spin until a small win or jackpot lands** (or set the bet to 100 to feel the impact). On win:
   - Payline strip pulses outward.
   - Middle-row symbols on all three reels get a yellow ring + scale pulse.
   - Bottom LED bar runs a chase pattern (small) or stronger sweep (jackpot).
   - Existing GameShell-level overlay still fires (green "You won!" pill or full-screen "JACKPOT!" — these come from GameShell and are kept until the future Plan 6 / Section 7 ThemedCelebration replaces them).
7. **Switch themes** in the lobby (sweets → space → vampire → ninja). Each theme's chassis colour and border shift; the slot machine layout stays the same shape (intended — bespoke chassis shapes are deferred).
8. **Spin while assets are still loading** (open DevTools Network → throttle to "Slow 3G", reload). Reels start with emoji fallbacks; once Gemini URLs land, reels switch to images without you having to spin first. **This is the second bug fix from Task 8 — verify the swap happens automatically.**
9. **Reduced motion check.** DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Spin: animation should be subdued or omitted on the existing GameShell win overlay (Plan 1 wired this); reel scroll still happens (we did not add reduced-motion guards to SlotReel — fold into a polish pass if you want it muted).
10. **Roulette + Bingo regression check.** Click each from the lobby. They should still work end-to-end — Plan 3 didn't touch them, but verify nothing leaked.

- [ ] **Step 5: No commit in this task.** If any gate fails, file the failure as a follow-up sub-task in Task 15's notes and decide whether to land what's done or block the PR. Do NOT pad with commented-out / WIP code.

---

## Task 15: Plan 3 progress doc

**Goal:** Capture a pause point so the next session can pick up cleanly. Mirrors the structure of `2026-05-07-plan-2-status.md`.

**Files:**
- Create: `docs/superpowers/progress/2026-05-09-plan-3-status.md`

- [ ] **Step 1: Write the doc**

The doc should cover:

1. **TL;DR** — what shipped, branch + tip, test counts, build size.
2. **Branch state** — name, tip SHA, divergence from main, push status, PR URL (if opened), CI gates.
3. **What landed** — task-by-task summary in spec order. Reference each task by its commit SHA (run `git log --oneline main..HEAD` after the work is done to populate).
4. **Deviations from the literal plan** — any places the implementer chose a different approach. Critical for future-you.
5. **Known limitations / things to revisit** — bespoke per-theme chassis shapes (deferred), per-reel click sounds (deferred), ThemedCelebration (deferred to Section 7 plan), `prefers-reduced-motion` behaviour for reel scroll (defaulted to "scroll always; only existing GameShell overlay respects the pref").
6. **Tasks for the next session** — open PR → merge → deploy → start Plan 4.
7. **Where to find things** — links to spec, plan, this doc, prior plan/progress docs.
8. **Sanity checks to run on next session start** — the same git/npm sequence as Plan 2's progress doc.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/progress/2026-05-09-plan-3-status.md
git commit -m "docs(plan-3): commit Plan 3 progress note"
```

---

## After Plan 3

Per Plan 2's pattern (which is now memory'd as the canonical workflow):

1. **User does fresh manual browser pass** on the latest tip (Task 14 Step 4 is the checklist).
2. **Open PR** with title `Plan 3: Slots surface — chassis, 3-row reels, payline strip, fixes data:-prefix bug`.
3. **Merge to `main`** via fast-forward; delete the feature branch local + origin.
4. **Deploy** via `./deploy/deploy.sh deploy`.
5. **Start Plan 4** (Roulette surface — Section 5 of the spec). Atoms ready then will include all Plan 3 work plus everything Plans 1+2 built.

---

## Self-review notes (filled by the planner)

**Spec coverage check:**
- Section 4 themed chassis: ✓ Task 4 (manifesto-driven, bespoke deferred)
- Section 4 3 reels × 3 visible symbols: ✓ Tasks 3 + 7
- Section 4 middle row = payline: ✓ Tasks 5 + 7
- Section 4 vertical-scroll spin with staggered stops + easing: ✓ Tasks 9 + 10
- Section 4 payline strip + arrow markers: ✓ Task 5
- Section 4 bottom LED bar: ✓ Task 6
- Section 4 win animation (payline glow + winning-symbol ring): ✓ Tasks 5 + 13
- Section 4 ThemedCelebration trigger: **deferred to Section 7 plan** (per scoping question)
- Section 4 per-reel click sound: **deferred** (per scoping question)
- Section 4 bug fix (`data:`-prefix → `https?:`): ✓ Task 2
- Section 4 bug fix (reel-init re-runs on URL change): ✓ Task 8
- Section 4 file structure (SlotMachine / SlotChassis / SlotReel / SlotSymbol / useSlotsGame): ✓ Tasks 1-12 (PaylineStrip + BottomLedBar are Plan 3 additions justified by the in-window win wiring; spec mentioned them as part of the chassis but did not enumerate them as separate components)

**Type consistency check:**
- `ReelCells` defined in Task 3 (`SlotReel.tsx`) and re-used by Task 7 (`useSlotsGame` imports it). ✓
- `UseSlotsGameReturn` defined in Task 1, extended in Task 7 to swap `reels` for `reelStates`. ✓
- `SlotMachineProps` revised mid-Task-12 to drop the children render-prop; tests updated in lockstep. ✓
- All component testids — `slot-chassis`, `slot-reel`, `slot-symbol`, `payline-strip`, `bottom-led-bar` — used consistently across tests. ✓

**Placeholder scan:**
- No "TBD" or "implement later" steps.
- Every code step shows the actual code.
- Every test step shows the actual test code with concrete assertions.
- Commit messages are explicit.
