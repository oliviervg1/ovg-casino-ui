# Plan 2 — Game-Page Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two stacked headers (App + GameShell) with a single contextual `AppHeader`. Replace the bare `<input type="number">` bet input with a themed `BetControl` (preset chips + ± stepper). Add a `MusicPill` with mute control + 4-bar waveform that animates while playback is active. Switch the game-page loading screen from a generic spinner to a themed skeleton + status line that attributes Gemini 3.1 + Lyria 3.

**Architecture:** Introduce an `AudioControlsContext` so the music pill (in the header) can mute/unmute the audio elements that live in `GameShell` and `WorldPage`, and so the header knows what's currently playing. Compose `AppHeader` from `BalancePill`, `MusicPill`, and `MenuDropdown`; mode is derived from the current route. `GameShell` becomes a thin layout wrapper around the themed-skeleton loading state, the game body, and the action bar (`<BetControl>` + `<ThemedButton size="hero">`) — its internal header is removed. All foundation atoms (`ThemedButton`, `ThemedCard`, `ThemedSkeleton`, `useTheme`, `useMotion`, `themeManifesto`) shipped in Plan 1 and are composed here without modification.

**Tech stack:** TypeScript, React 18, Tailwind CSS v4 (`@theme` namespace), Framer Motion (`motion/react`), Vite, Vitest, @testing-library/react, jsdom, react-router-dom (already in use).

**Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` — Section 3 (Game-page chrome), with cross-cuts from Section 8 (Loading states, Motion vocabulary, Accessibility, Responsive, CES messenger). Typography + spacing + motion tokens were laid down in Plan 1.

**Out of scope (deferred to later plans):**
- Real slot-chassis / roulette-wheel / bingo-card surfaces (Plans 3-5).
- Win/loss themed celebrations + particle systems (Plan 6).
- Per-theme UI sound assets (Plan 6) — `themeManifesto.<theme>.audioClick` integration on `ThemedButton` press is deferred until the assets exist.
- Per-symbol morph-from-skeleton during slots loading (Plan 3 — couples to slot symbol rendering).
- Operator-mode toggle / per-theme regenerate from inside game pages (out of scope per spec).
- Reconciling `profile.theme` (light/dark) with route-driven themes (out of scope per `docs/superpowers/progress/2026-05-07-plan-1-status.md`).
- `BalancePill` count-up on win is included; count-down on bet-deduct is *not* (the deduct happens fast, animated count-up matters more visually).

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `src/contexts/AudioControlsContext.tsx` | React context exposing `{ muted, toggleMute, nowPlaying, setNowPlaying }`. `muted` is persisted to `localStorage` under key `ovg-audio-muted`. `nowPlaying` is `{ theme, gameType }` or `null`. |
| `src/contexts/AudioControlsContext.test.tsx` | Tests default state from localStorage, toggle persists, throws when used outside provider. |
| `src/components/Layout/BalancePill.tsx` | Monospace green pill rendering balance with $ formatting. Animates a count-up when balance increases (Framer Motion + `useMotion`); jumps instantly on decrease. |
| `src/components/Layout/BalancePill.test.tsx` | Renders formatted balance; animates on increase; aria-live announcement. |
| `src/components/Layout/MenuDropdown.tsx` | `⋯` icon button → dropdown menu with Profile / Rules / Help / Logout items. Click outside closes. Keyboard: Esc closes, ↑/↓ navigates, Enter activates. |
| `src/components/Layout/MenuDropdown.test.tsx` | Click ⋯ opens, click item fires callback, click outside closes, Esc closes. |
| `src/components/Layout/AppHeader.tsx` | Single contextual header. Reads `useLocation()` to switch between lobby mode (logo + balance + menu) and page mode (back-to-lobby + page title in theme display font + balance + music pill + menu). |
| `src/components/Layout/AppHeader.test.tsx` | Tests both modes; back button only on non-lobby routes; music pill only when nowPlaying set; title in theme font on game/world routes. |
| `src/components/MusicPill.tsx` | Reads `useAudioControls()` and `useTheme()`. Renders `♪ Lyria 3 · <Theme> <Game>` label + 4-bar animated waveform. Click → `toggleMute`. Returns `null` when `nowPlaying` is `null`. |
| `src/components/MusicPill.test.tsx` | Renders nothing when nowPlaying is null; renders waveform when not muted; renders strikethrough when muted; click toggles mute. |
| `src/components/Games/BetControl.tsx` | Themed bet input: rounded pill containing 4 preset chips (5 / 10 / 25 / 100) + `−` and `+` stepper buttons + active value highlighted. Disabled when prop set. |
| `src/components/Games/BetControl.test.tsx` | Renders all 4 presets; click chip sets value; ± steps by 1; active preset highlighted; respects min; disabled state. |
| `src/components/Games/GameStatusLine.tsx` | Bottom-of-action-bar status pill: `"Gemini 3.1 generating · Lyria 3 composing soundtrack"` while loading; `null` when ready. |
| `src/components/Games/GameStatusLine.test.tsx` | Renders status text when loading; renders nothing when not loading. |

### Modified files

| Path | Change |
|---|---|
| `src/App.tsx` | Wrap `<AppContent>` body in `<AudioControlsProvider>`. Remove the inline `<header>` block (current lines 183-224); render `<AppHeader profile={profile} onLogout={logout} />` in its place. |
| `src/components/Games/GameShell.tsx` | Strip the internal `<header>` (current lines 55-61) and the bare `<input type="number">` + small SPIN block (current lines 65-80). Replace generic loading state with `<ThemedSkeleton>` + `<GameStatusLine isLoading />`. Render the action bar as `<BetControl>` + `<ThemedButton size="hero">`. Bind `audio.muted` to `useAudioControls().muted`. Call `setNowPlaying({ theme, gameType })` while mounted. The `<Confetti>` + JACKPOT/small-win overlays stay in this plan (replaced in Plan 6). |
| `src/components/WorldPage.tsx` | Bind its existing audio element's `.muted` to `useAudioControls().muted`. Call `setNowPlaying({ theme, gameType: 'world' })` while mounted. |
| `src/components/Games/Roulette.tsx` | When `betType === null`, pass `playLabel="Pick Red / Black / Even / Odd"` to `<GameShell>` so the action bar surfaces the requirement. (Existing `playDisabled={spinning || !betType}` already handles the disabled state — only the label changes.) |
| `src/utils/SoundEngine.ts` | Add a `setMuted(b: boolean)` method that gates `masterGain.gain.value`. Initialised from `localStorage` so the first sound respects the persisted preference. |
| `src/index.css` | Add a CSS rule that repositions `<ces-messenger>` to bottom-left when the page is a game route, leaving the default bottom-right elsewhere. Achieved via a `data-route` attribute set on `<html>` from `App.tsx`. |
| `src/App.tsx` (second change) | Set `document.documentElement.dataset.route` to `'lobby' \| 'world' \| 'game' \| 'other'` based on `location.pathname`, alongside the existing `data-theme` write. |

### Removed files

None. Everything is updated in place.

### Dependencies

No new npm dependencies. No deps removed (`react-confetti` removal is Plan 6).

---

## Conventions for the implementing engineer

1. **TDD per task:** write the failing test first, run it to confirm failure, write the minimal implementation, run to confirm pass, commit. Each task ends with a single squashable commit message.
2. **Test environment** is configured by `vitest.config.ts`. Client tests live next to their components (`Foo.tsx` ↔ `Foo.test.tsx`) and run under `jsdom` with `globals: true`. The pattern from Plan 1 is `import { describe, it, expect, beforeEach, afterEach } from 'vitest'` + `import { cleanup, render, screen, fireEvent } from '@testing-library/react'`. **No need to import `React`** under the new JSX transform (Vite + TS).
3. **Theme tests** set `document.documentElement.setAttribute('data-theme', '<theme>')` in `beforeEach`, and clean up in `afterEach` with `document.documentElement.removeAttribute('data-theme')` + `cleanup()`. Mirror `src/components/Themed/ThemedButton.test.tsx` exactly.
4. **Provider tests** use `render(<AudioControlsProvider>{node}</AudioControlsProvider>)`. Reset `localStorage` in `beforeEach`.
5. **Run a single test file:** `npx vitest run src/components/Layout/AppHeader.test.tsx`. **Run only client project:** `npx vitest run --project client`.
6. **Lint** is `npm run lint` — runs `tsc --noEmit` for both `tsconfig.json` (client) and `tsconfig.server.json` (server). Run after each task to keep the loop tight.
7. **Commits** use conventional-commits style consistent with Plan 1's history (`feat(layout):`, `feat(games):`, `refactor(shell):`, `test(...):`, `fix(...)`, `chore(...)`). One commit per task.
8. **Branch:** create a fresh feature branch off `main` before starting Task 1: `git checkout -b feat/plan-2-game-page-chrome`.
9. **Module path conventions:** components import from `../../hooks/useTheme` (relative). No path aliases.

---

## Tasks

### Task 1: AudioControlsContext + provider + `useAudioControls` hook

The header's MusicPill needs to know what's playing and to be able to mute it. The audio element lives in GameShell / WorldPage. A small React context lets both sides talk without prop-drilling. Mute state persists to `localStorage` so the preference survives reloads.

**Files:**
- Create: `src/contexts/AudioControlsContext.tsx`
- Create: `src/contexts/AudioControlsContext.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/contexts/AudioControlsContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AudioControlsProvider, useAudioControls } from './AudioControlsContext';

function Probe() {
  const { muted, toggleMute, nowPlaying, setNowPlaying } = useAudioControls();
  return (
    <div>
      <span data-testid="muted">{String(muted)}</span>
      <span data-testid="np">{nowPlaying ? `${nowPlaying.theme}/${nowPlaying.gameType}` : 'none'}</span>
      <button onClick={toggleMute}>toggle</button>
      <button onClick={() => setNowPlaying({ theme: 'sweets', gameType: 'slots' })}>set</button>
      <button onClick={() => setNowPlaying(null)}>clear</button>
    </div>
  );
}

describe('AudioControlsContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('defaults muted=false and nowPlaying=null when localStorage is empty', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    expect(screen.getByTestId('muted').textContent).toBe('false');
    expect(screen.getByTestId('np').textContent).toBe('none');
  });

  it('reads initial muted state from localStorage', () => {
    localStorage.setItem('ovg-audio-muted', 'true');
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    expect(screen.getByTestId('muted').textContent).toBe('true');
  });

  it('toggleMute flips muted and persists to localStorage', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('muted').textContent).toBe('true');
    expect(localStorage.getItem('ovg-audio-muted')).toBe('true');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('muted').textContent).toBe('false');
    expect(localStorage.getItem('ovg-audio-muted')).toBe('false');
  });

  it('setNowPlaying updates nowPlaying; passing null clears it', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    fireEvent.click(screen.getByText('set'));
    expect(screen.getByTestId('np').textContent).toBe('sweets/slots');
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('np').textContent).toBe('none');
  });

  it('throws when useAudioControls is called outside the provider', () => {
    const Bad = () => {
      useAudioControls();
      return null;
    };
    // Suppress React's error boundary console.error noise for this assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/AudioControlsProvider/);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/contexts/AudioControlsContext.test.tsx`
Expected: FAIL — module `./AudioControlsContext` does not exist.

- [ ] **Step 3: Implement the context + provider + hook.**

Create `src/contexts/AudioControlsContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ThemeType } from '../utils/themeManifesto';

export type NowPlayingGameType = 'roulette' | 'slots' | 'bingo' | 'world';

export interface NowPlaying {
  theme: ThemeType;
  gameType: NowPlayingGameType;
}

export interface AudioControls {
  muted: boolean;
  toggleMute: () => void;
  nowPlaying: NowPlaying | null;
  setNowPlaying: (np: NowPlaying | null) => void;
}

const STORAGE_KEY = 'ovg-audio-muted';

const AudioControlsContext = createContext<AudioControls | null>(null);

function readInitialMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // localStorage may throw in private-browsing edge cases; default to unmuted.
    return false;
  }
}

export function AudioControlsProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState<boolean>(readInitialMuted);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo<AudioControls>(
    () => ({ muted, toggleMute, nowPlaying, setNowPlaying }),
    [muted, toggleMute, nowPlaying],
  );

  return <AudioControlsContext.Provider value={value}>{children}</AudioControlsContext.Provider>;
}

export function useAudioControls(): AudioControls {
  const ctx = useContext(AudioControlsContext);
  if (!ctx) throw new Error('useAudioControls must be used within an AudioControlsProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/contexts/AudioControlsContext.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0, no output.

- [ ] **Step 6: Commit.**

```bash
git add src/contexts/AudioControlsContext.tsx src/contexts/AudioControlsContext.test.tsx
git commit -m "feat(audio): AudioControlsContext for shared mute state + nowPlaying"
```

---

### Task 2: SoundEngine.setMuted

The mute toggle has to silence the Web-Audio sound effects (`soundEngine.playWin`, etc.) as well as the music. Adding a single `setMuted(b)` that gates `masterGain.gain.value` is enough; first sound after init reads the persisted preference.

**Files:**
- Modify: `src/utils/SoundEngine.ts`
- Create: `src/utils/SoundEngine.test.ts`

- [ ] **Step 1: Write the failing tests.**

Create `src/utils/SoundEngine.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { soundEngine } from './SoundEngine';

describe('SoundEngine.setMuted', () => {
  beforeEach(() => {
    // Reset internal state by re-initialising. Since soundEngine is a singleton,
    // we mute then unmute around each test to keep ordering predictable.
    soundEngine.setMuted(false);
  });

  it('exposes setMuted() that does not throw before init', () => {
    expect(() => soundEngine.setMuted(true)).not.toThrow();
    expect(() => soundEngine.setMuted(false)).not.toThrow();
  });

  it('sets masterGain to 0 when muted, restores when unmuted (after init)', () => {
    soundEngine.init();
    soundEngine.setMuted(true);
    // Inspect the private masterGain via a non-public escape hatch test getter.
    // We expose `__getMasterGainValue()` for tests; it returns 0 when muted.
    expect(soundEngine.__getMasterGainValue()).toBe(0);
    soundEngine.setMuted(false);
    expect(soundEngine.__getMasterGainValue()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/utils/SoundEngine.test.ts`
Expected: FAIL — `setMuted is not a function` and `__getMasterGainValue is not a function`.

- [ ] **Step 3: Add `setMuted` + a test-only inspection helper to SoundEngine.**

In `src/utils/SoundEngine.ts`, find the `class SoundEngine` block. Add these fields and methods inside the class (place after the existing `init()` method):

```ts
  private muted: boolean = (() => {
    try { return localStorage.getItem('ovg-audio-muted') === 'true'; } catch { return false; }
  })();
  private baseVolume = 0.5;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.baseVolume;
    }
  }

  /** Test-only: read the current master-gain value. Not for production callers. */
  __getMasterGainValue(): number {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }
```

Then update the existing `init()` to apply the persisted mute on first start. Replace this line in `init()`:

```ts
      this.masterGain.gain.value = 0.5; // Increased volume
```

with:

```ts
      this.masterGain.gain.value = this.muted ? 0 : this.baseVolume;
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/utils/SoundEngine.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/utils/SoundEngine.ts src/utils/SoundEngine.test.ts
git commit -m "feat(audio): SoundEngine.setMuted reads persisted preference"
```

---

### Task 3: BalancePill atom

Monospace green pill rendering balance with $ formatting. When the prop value increases, animates a count-up over `duration-slow` (1200ms from `useMotion`); when it decreases, snaps instantly. Announces final value via `aria-live="polite"`.

**Files:**
- Create: `src/components/Layout/BalancePill.tsx`
- Create: `src/components/Layout/BalancePill.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/Layout/BalancePill.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { BalancePill } from './BalancePill';

describe('BalancePill', () => {
  afterEach(() => cleanup());

  it('renders the formatted balance with a $ prefix', () => {
    render(<BalancePill balance={1234} />);
    expect(screen.getByText('$1,234')).toBeTruthy();
  });

  it('exposes the final balance to assistive tech via aria-live', () => {
    render(<BalancePill balance={1234} />);
    const live = screen.getByTestId('balance-aria-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('$1,234');
  });

  it('updates when the balance prop changes', () => {
    const { rerender } = render(<BalancePill balance={1000} />);
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,000');
    act(() => { rerender(<BalancePill balance={1500} />); });
    // After the count-up settles (we render the final value at the end of the
    // effect tick) the display reads the new value.
    expect(screen.getByTestId('balance-aria-live').textContent).toBe('$1,500');
  });

  it('snaps to the new value on decrease (no count-up)', () => {
    const { rerender } = render(<BalancePill balance={1000} />);
    act(() => { rerender(<BalancePill balance={400} />); });
    // Snap means the displayed value matches the prop on the very first paint
    // after the change (no intermediate frames).
    expect(screen.getByTestId('balance-display').textContent).toBe('$400');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/Layout/BalancePill.test.tsx`
Expected: FAIL — `Cannot find module './BalancePill'`.

- [ ] **Step 3: Implement BalancePill.**

Create `src/components/Layout/BalancePill.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../hooks/useMotion';

interface BalancePillProps {
  balance: number;
}

function format(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function BalancePill({ balance }: BalancePillProps) {
  const motion = useMotion();
  const [displayed, setDisplayed] = useState<number>(balance);
  const previousRef = useRef<number>(balance);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = balance;
    if (balance <= previous || !motion.shouldAnimate) {
      setDisplayed(balance);
      return;
    }
    const start = performance.now();
    const duration = motion.durations.slow;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayed(previous + (balance - previous) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(balance);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [balance, motion.shouldAnimate, motion.durations.slow]);

  return (
    <div
      data-testid="balance-pill"
      className="px-4 py-1 rounded-full bg-black/30 font-mono font-bold text-lg text-green-400"
    >
      <span data-testid="balance-display">{format(displayed)}</span>
      {/* Screen-reader-only live region; the visible span animates per-frame
          but a11y announcement uses the final value to avoid spam. */}
      <span data-testid="balance-aria-live" aria-live="polite" className="sr-only">
        {format(balance)}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/Layout/BalancePill.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/Layout/BalancePill.tsx src/components/Layout/BalancePill.test.tsx
git commit -m "feat(layout): BalancePill — monospace green pill with count-up on win"
```

---

### Task 4: MenuDropdown atom

The `⋯` button in the top-right opens a dropdown with Profile / Rules / Help / Logout. Click outside or press Esc to close.

**Files:**
- Create: `src/components/Layout/MenuDropdown.tsx`
- Create: `src/components/Layout/MenuDropdown.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/Layout/MenuDropdown.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MenuDropdown } from './MenuDropdown';

describe('MenuDropdown', () => {
  afterEach(() => cleanup());

  function setup(overrides: Partial<React.ComponentProps<typeof MenuDropdown>> = {}) {
    const handlers = {
      onProfile: () => { (handlers as any)._profile = ((handlers as any)._profile ?? 0) + 1; },
      onRules: () => { (handlers as any)._rules = ((handlers as any)._rules ?? 0) + 1; },
      onHelp: () => { (handlers as any)._help = ((handlers as any)._help ?? 0) + 1; },
      onLogout: () => { (handlers as any)._logout = ((handlers as any)._logout ?? 0) + 1; },
      ...overrides,
    };
    render(<MenuDropdown {...handlers as any} />);
    return handlers as any;
  }

  it('renders a button labelled "Open menu" and the menu is closed by default', () => {
    setup();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu on click and shows the four items', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /rules/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /help/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeTruthy();
  });

  it('fires the matching callback and closes the menu when an item is clicked', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /profile/i }));
    expect(h._profile).toBe(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes when Escape is pressed', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes when a click happens outside the dropdown', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/Layout/MenuDropdown.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement MenuDropdown.**

Create `src/components/Layout/MenuDropdown.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, User as UserIcon, BookOpen, HelpCircle, LogOut } from 'lucide-react';

interface MenuDropdownProps {
  onProfile: () => void;
  onRules: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

interface Item {
  key: string;
  label: string;
  Icon: typeof UserIcon;
  handler: () => void;
}

export function MenuDropdown({ onProfile, onRules, onHelp, onLogout }: MenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  const items: Item[] = [
    { key: 'profile', label: 'Profile', Icon: UserIcon, handler: onProfile },
    { key: 'rules', label: 'Rules', Icon: BookOpen, handler: onRules },
    { key: 'help', label: 'Help', Icon: HelpCircle, handler: onHelp },
    { key: 'logout', label: 'Logout', Icon: LogOut, handler: onLogout },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg bg-zinc-900/95 shadow-2xl backdrop-blur-md ring-1 ring-white/10 py-1 z-50"
        >
          {items.map(({ key, label, Icon, handler }) => (
            <li key={key} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => { handler(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10 transition-colors"
              >
                <Icon className="w-4 h-4 opacity-70" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/Layout/MenuDropdown.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/Layout/MenuDropdown.tsx src/components/Layout/MenuDropdown.test.tsx
git commit -m "feat(layout): MenuDropdown — ⋯ icon with Profile/Rules/Help/Logout"
```

---

### Task 5: MusicPill (consumes useAudioControls + useTheme)

Compact pill in the header showing what music is playing + a 4-bar animated waveform. Click to mute. Renders nothing when nothing is playing (lobby idle state).

**Files:**
- Create: `src/components/MusicPill.tsx`
- Create: `src/components/MusicPill.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/MusicPill.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { AudioControlsProvider, useAudioControls } from '../contexts/AudioControlsContext';
import { MusicPill } from './MusicPill';

function Setter({ theme, gameType }: { theme: any; gameType: any }) {
  const { setNowPlaying } = useAudioControls();
  // Effect, not render-phase: setNowPlaying with a fresh object literal each
  // render would trigger an infinite re-render loop via the provider state.
  useEffect(() => {
    if (theme && gameType) setNowPlaying({ theme, gameType });
    else setNowPlaying(null);
  }, [theme, gameType, setNowPlaying]);
  return null;
}

describe('MusicPill', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders nothing when nowPlaying is null', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Setter theme={null} gameType={null} />
        <MusicPill />
      </AudioControlsProvider>
    );
    expect(screen.queryByTestId('music-pill')).toBeNull();
  });

  it('renders Lyria 3 attribution + theme + game when nowPlaying is set', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Setter theme="sweets" gameType="slots" />
        <MusicPill />
      </AudioControlsProvider>
    );
    const pill = screen.getByTestId('music-pill');
    expect(pill.textContent).toMatch(/Lyria 3/);
    expect(pill.textContent?.toLowerCase()).toContain('sweets');
    expect(pill.textContent?.toLowerCase()).toContain('slots');
  });

  it('renders 4 waveform bars', () => {
    document.documentElement.setAttribute('data-theme', 'space');
    render(
      <AudioControlsProvider>
        <Setter theme="space" gameType="bingo" />
        <MusicPill />
      </AudioControlsProvider>
    );
    const bars = screen.getAllByTestId('music-pill-bar');
    expect(bars.length).toBe(4);
  });

  it('marks bars as muted (data-muted="true") when muted=true and click toggles mute', () => {
    document.documentElement.setAttribute('data-theme', 'ninja');
    render(
      <AudioControlsProvider>
        <Setter theme="ninja" gameType="roulette" />
        <MusicPill />
      </AudioControlsProvider>
    );
    expect(screen.getByTestId('music-pill').getAttribute('data-muted')).toBe('false');
    act(() => { fireEvent.click(screen.getByTestId('music-pill')); });
    expect(screen.getByTestId('music-pill').getAttribute('data-muted')).toBe('true');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/MusicPill.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement MusicPill.**

Create `src/components/MusicPill.tsx`:

```tsx
import { Music, VolumeX } from 'lucide-react';
import { useAudioControls } from '../contexts/AudioControlsContext';
import { useTheme } from '../hooks/useTheme';
import { useMotion } from '../hooks/useMotion';
import { themeManifesto } from '../utils/themeManifesto';

const GAME_TYPE_LABEL: Record<string, string> = {
  slots: 'Slots',
  roulette: 'Roulette',
  bingo: 'Bingo',
  world: 'World',
};

export function MusicPill() {
  const { muted, toggleMute, nowPlaying } = useAudioControls();
  const motion = useMotion();
  // Read the document-level theme so the displayName matches whatever the
  // active route theme is (which is the same theme that nowPlaying.theme
  // points to in normal usage). Fall back via nowPlaying if mismatched.
  const docTheme = useTheme();
  if (!nowPlaying) return null;

  const themeName = themeManifesto[nowPlaying.theme]?.displayName ?? docTheme.displayName;
  const gameLabel = GAME_TYPE_LABEL[nowPlaying.gameType] ?? nowPlaying.gameType;
  const animating = !muted && motion.shouldAnimate;

  return (
    <button
      type="button"
      data-testid="music-pill"
      data-muted={String(muted)}
      onClick={toggleMute}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xs"
    >
      {muted ? (
        <VolumeX className="w-3.5 h-3.5 opacity-70" />
      ) : (
        <Music className="w-3.5 h-3.5 opacity-70" />
      )}
      <span className="font-medium opacity-90">Lyria 3 · {themeName} {gameLabel}</span>
      <span className="flex items-end gap-[2px] h-3">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            data-testid="music-pill-bar"
            className="w-[3px] bg-current rounded-sm"
            style={{
              height: muted ? '20%' : '40%',
              animation: animating ? `music-pill-bar-${i} 600ms ease-in-out infinite alternate` : 'none',
              opacity: muted ? 0.3 : 0.9,
              textDecoration: muted ? 'line-through' : 'none',
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes music-pill-bar-0 { from { height: 30%; } to { height: 90%; } }
        @keyframes music-pill-bar-1 { from { height: 80%; } to { height: 35%; } }
        @keyframes music-pill-bar-2 { from { height: 45%; } to { height: 100%; } }
        @keyframes music-pill-bar-3 { from { height: 70%; } to { height: 25%; } }
      `}</style>
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/MusicPill.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/MusicPill.tsx src/components/MusicPill.test.tsx
git commit -m "feat(layout): MusicPill — Lyria 3 attribution, 4-bar waveform, click to mute"
```

---

### Task 6: BetControl (preset chips + ± stepper)

Themed bet input replacing today's bare `<input type="number">`. Four preset chips (5 / 10 / 25 / 100), `−` and `+` stepper buttons that change the value by 1 (clamped to `min`). Active preset is highlighted via the theme accent.

**Files:**
- Create: `src/components/Games/BetControl.tsx`
- Create: `src/components/Games/BetControl.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/Games/BetControl.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { BetControl } from './BetControl';

describe('BetControl', () => {
  afterEach(() => cleanup());

  it('renders the four default preset chips', () => {
    render(<BetControl value={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bet 5' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 10' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 25' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 100' })).toBeTruthy();
  });

  it('marks the chip whose value matches the current bet as active', () => {
    render(<BetControl value={25} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bet 25' }).getAttribute('data-active')).toBe('true');
    expect(screen.getByRole('button', { name: 'Bet 10' }).getAttribute('data-active')).toBe('false');
  });

  it('calls onChange with the chip value when a chip is clicked', () => {
    let value = 10;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bet 25' }));
    expect(value).toBe(25);
  });

  it('+ stepper increments by 1', () => {
    let value = 10;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /increase bet/i }));
    expect(value).toBe(11);
  });

  it('− stepper decrements by 1 but clamps at min (default 1)', () => {
    let value = 1;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease bet/i }));
    expect(value).toBe(1); // clamped at default min=1
  });

  it('shows the current value as a number readout', () => {
    render(<BetControl value={42} onChange={() => {}} />);
    expect(screen.getByTestId('bet-value').textContent).toBe('42');
  });

  it('disables every interactive element when disabled=true', () => {
    render(<BetControl value={10} onChange={() => {}} disabled />);
    expect((screen.getByRole('button', { name: 'Bet 10' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /increase bet/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /decrease bet/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/Games/BetControl.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement BetControl.**

Create `src/components/Games/BetControl.tsx`:

```tsx
import { Minus, Plus } from 'lucide-react';

interface BetControlProps {
  value: number;
  onChange: (n: number) => void;
  presets?: number[];
  min?: number;
  max?: number;
  disabled?: boolean;
}

const DEFAULT_PRESETS = [5, 10, 25, 100];

export function BetControl({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  disabled = false,
}: BetControlProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const step = (delta: number) => onChange(clamp(value + delta));

  return (
    <div
      data-testid="bet-control"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10"
    >
      <button
        type="button"
        aria-label="Decrease bet"
        onClick={() => step(-1)}
        disabled={disabled || value <= min}
        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span
        data-testid="bet-value"
        className="font-mono font-bold text-base text-green-400 min-w-[3ch] text-center"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase bet"
        onClick={() => step(+1)}
        disabled={disabled || value >= max}
        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
      <span className="w-px h-5 bg-white/10 mx-1" aria-hidden="true" />
      {presets.map(p => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            aria-label={`Bet ${p}`}
            data-active={String(active)}
            onClick={() => onChange(clamp(p))}
            disabled={disabled}
            className={`px-3 h-8 rounded-full text-sm font-semibold transition-colors disabled:opacity-40 ${
              active
                ? 'bg-theme-accent text-black ring-2 ring-theme-accent/60'
                : 'bg-white/5 text-white/80 hover:bg-white/15'
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/Games/BetControl.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/Games/BetControl.tsx src/components/Games/BetControl.test.tsx
git commit -m "feat(games): BetControl — preset chips + ± stepper, replaces bare bet input"
```

---

### Task 7: GameStatusLine (loading attribution pill)

Renders the AI-attribution status during the game-page loading phase: `"Gemini 3.1 generating · Lyria 3 composing soundtrack"`. Returns `null` when `isLoading=false`.

**Files:**
- Create: `src/components/Games/GameStatusLine.tsx`
- Create: `src/components/Games/GameStatusLine.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/Games/GameStatusLine.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameStatusLine } from './GameStatusLine';

describe('GameStatusLine', () => {
  afterEach(() => cleanup());

  it('renders the Gemini 3.1 + Lyria 3 attribution while loading', () => {
    render(<GameStatusLine isLoading />);
    const node = screen.getByTestId('game-status-line');
    expect(node.textContent).toMatch(/Gemini 3\.1/);
    expect(node.textContent).toMatch(/Lyria 3/);
  });

  it('renders nothing when isLoading is false', () => {
    render(<GameStatusLine isLoading={false} />);
    expect(screen.queryByTestId('game-status-line')).toBeNull();
  });

  it('shows the optional detail text when provided', () => {
    render(<GameStatusLine isLoading detail="symbols 3 / 4" />);
    expect(screen.getByTestId('game-status-line').textContent).toContain('symbols 3 / 4');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/Games/GameStatusLine.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement GameStatusLine.**

Create `src/components/Games/GameStatusLine.tsx`:

```tsx
import { Sparkles } from 'lucide-react';

interface GameStatusLineProps {
  isLoading: boolean;
  /** Optional sub-detail (e.g. "symbols 3 / 4") shown after the attribution. */
  detail?: string;
}

export function GameStatusLine({ isLoading, detail }: GameStatusLineProps) {
  if (!isLoading) return null;
  return (
    <div
      data-testid="game-status-line"
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10 text-xs text-white/80"
    >
      <Sparkles className="w-3.5 h-3.5 animate-pulse opacity-80" />
      <span>
        Gemini 3.1 generating · Lyria 3 composing soundtrack
        {detail ? ` · ${detail}` : ''}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/Games/GameStatusLine.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/Games/GameStatusLine.tsx src/components/Games/GameStatusLine.test.tsx
git commit -m "feat(games): GameStatusLine — Gemini 3.1 + Lyria 3 attribution while loading"
```

---

### Task 8: AppHeader composition

Single contextual header. Reads `useLocation()` to switch between **lobby mode** (logo "🎰 OVG Casino" + balance + menu) and **page mode** (back button + page title + balance + music pill + menu). The page title is the game/world display name from `themeManifesto`/`GAME_REGISTRY`; for `/profile`, `/faq`, `/rules`, it's a static label. Backdrop-blur over whatever bg is below.

**Files:**
- Create: `src/components/Layout/AppHeader.tsx`
- Create: `src/components/Layout/AppHeader.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Create `src/components/Layout/AppHeader.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AudioControlsProvider, useAudioControls } from '../../contexts/AudioControlsContext';
import { AppHeader } from './AppHeader';
import type { UserProfile } from '../../hooks/useUser';

const profile: UserProfile = {
  uid: 'u1',
  email: 'u@example.com',
  displayName: 'Player One',
  photoURL: '',
  balance: 1234,
  theme: 'dark',
};

function NowPlayingSetter() {
  const { setNowPlaying } = useAudioControls();
  // Effect, not render-phase — see MusicPill.test.tsx for the same rationale.
  useEffect(() => {
    setNowPlaying({ theme: 'sweets', gameType: 'slots' });
    return () => setNowPlaying(null);
  }, [setNowPlaying]);
  return null;
}

function renderAt(path: string, withMusic = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AudioControlsProvider>
        {withMusic && <NowPlayingSetter />}
        <Routes>
          <Route path="*" element={<AppHeader profile={profile} onLogout={() => {}} />} />
        </Routes>
      </AudioControlsProvider>
    </MemoryRouter>
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('lobby mode (/) renders the logo and balance, no back button', () => {
    renderAt('/');
    expect(screen.getByText(/OVG Casino/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /back to lobby/i })).toBeNull();
    expect(screen.getByTestId('balance-pill')).toBeTruthy();
  });

  it('lobby mode does not render the music pill when nowPlaying is null', () => {
    renderAt('/', false);
    expect(screen.queryByTestId('music-pill')).toBeNull();
  });

  it('page mode (/profile) renders a back-to-lobby button and the page title', () => {
    renderAt('/profile');
    expect(screen.getByRole('button', { name: /back to lobby/i })).toBeTruthy();
    expect(screen.getByTestId('app-header-title').textContent?.toLowerCase()).toContain('profile');
  });

  it('game route (/game/candy-crushers) renders the game name in the theme display font class', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    renderAt('/game/candy-crushers', true);
    const title = screen.getByTestId('app-header-title');
    expect(title.className).toContain('font-sweets');
    // The candy-crushers entry exists in src/config/games.ts with name "Candy Crushers".
    expect(title.textContent).toMatch(/Candy Crushers/i);
  });

  it('world route (/world/space) renders the theme display name in the theme font', () => {
    document.documentElement.setAttribute('data-theme', 'space');
    renderAt('/world/space');
    const title = screen.getByTestId('app-header-title');
    expect(title.textContent).toMatch(/Space/);
    expect(title.className).toContain('font-space');
  });

  it('renders the music pill when nowPlaying is set', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    renderAt('/game/candy-crushers', true);
    expect(screen.getByTestId('music-pill')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/components/Layout/AppHeader.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AppHeader.**

Create `src/components/Layout/AppHeader.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../../hooks/useUser';
import { GAME_REGISTRY } from '../../config/games';
import { THEME_NAMES, themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { BalancePill } from './BalancePill';
import { MenuDropdown } from './MenuDropdown';
import { MusicPill } from '../MusicPill';

interface AppHeaderProps {
  profile: UserProfile;
  onLogout: () => void;
}

interface RouteInfo {
  mode: 'lobby' | 'page';
  title: string;
  themeFontClass?: string;
}

function describeRoute(pathname: string): RouteInfo {
  if (pathname === '/') return { mode: 'lobby', title: 'OVG Casino' };

  const gameMatch = pathname.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    const def = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (def) {
      return { mode: 'page', title: def.name, themeFontClass: themeManifesto[def.theme].font };
    }
    return { mode: 'page', title: 'Game' };
  }

  const worldMatch = pathname.match(/^\/world\/(.+)$/);
  if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    const t = worldMatch[1] as ThemeType;
    return { mode: 'page', title: themeManifesto[t].displayName, themeFontClass: themeManifesto[t].font };
  }

  if (pathname.startsWith('/profile')) return { mode: 'page', title: 'Profile' };
  if (pathname.startsWith('/rules')) return { mode: 'page', title: 'Rules' };
  if (pathname.startsWith('/faq')) return { mode: 'page', title: 'Help' };

  return { mode: 'page', title: '' };
}

export function AppHeader({ profile, onLogout }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const route = describeRoute(location.pathname);

  return (
    <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4 min-w-0">
        {route.mode === 'lobby' ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-2xl font-casino tracking-wider hover:opacity-80 transition-opacity"
          >
            🎰 OVG Casino
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Back to lobby"
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span
              data-testid="app-header-title"
              className={`text-2xl truncate ${route.themeFontClass ?? 'font-casino'} tracking-wide`}
            >
              {route.title}
            </span>
          </>
        )}
        <BalancePill balance={profile.balance} />
      </div>
      <div className="flex items-center gap-3">
        <MusicPill />
        <MenuDropdown
          onProfile={() => navigate('/profile')}
          onRules={() => navigate('/rules')}
          onHelp={() => navigate('/faq')}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/components/Layout/AppHeader.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 5: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit.**

```bash
git add src/components/Layout/AppHeader.tsx src/components/Layout/AppHeader.test.tsx
git commit -m "feat(layout): AppHeader — single contextual header (lobby/page modes)"
```

---

### Task 9: Wire AppHeader into App.tsx (remove old header, wrap in AudioControlsProvider, set route data-attribute)

Cuts the inline `<header>` block out of `App.tsx` and replaces it with `<AppHeader>`. Wraps the rendered content in `<AudioControlsProvider>` so the header and the game shells can talk. Sets `data-route` on `<html>` for the CES messenger CSS rule (Task 13).

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a regression test that asserts only one header element renders.**

Modify `src/components/Layout/AppHeader.test.tsx` — append at the bottom of the file, inside the `describe('AppHeader', ...)` block:

```tsx
  it('renders exactly one <header> element', () => {
    renderAt('/');
    expect(document.querySelectorAll('header').length).toBe(1);
  });
```

(This guards against future regressions where someone adds a second header layer back into App.tsx.)

Run: `npx vitest run src/components/Layout/AppHeader.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 2: Modify App.tsx — add the imports.**

In `src/App.tsx`, replace the import block at the top of the file. Find:

```ts
import { motion, AnimatePresence } from 'motion/react';
import { useAssets } from './hooks/useAssets';
import { User as UserIcon, HelpCircle, BookOpen } from 'lucide-react';
import { getGameById, GAME_REGISTRY } from './config/games';
import { THEME_NAMES, type ThemeType } from './utils/themeManifesto';
import { WorldPage } from './components/WorldPage';
```

Replace with:

```ts
import { motion, AnimatePresence } from 'motion/react';
import { useAssets } from './hooks/useAssets';
import { getGameById, GAME_REGISTRY } from './config/games';
import { THEME_NAMES, type ThemeType } from './utils/themeManifesto';
import { WorldPage } from './components/WorldPage';
import { AppHeader } from './components/Layout/AppHeader';
import { AudioControlsProvider } from './contexts/AudioControlsContext';
```

(`UserIcon`, `HelpCircle`, `BookOpen` were only used by the inline header that's being removed.)

- [ ] **Step 3: Add the route data-attribute write next to the existing `data-theme` write.**

In `src/App.tsx`, find:

```tsx
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);
```

Replace with:

```tsx
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    let route: 'lobby' | 'world' | 'game' | 'other' = 'other';
    if (location.pathname === '/') route = 'lobby';
    else if (location.pathname.startsWith('/world/')) route = 'world';
    else if (location.pathname.startsWith('/game/')) route = 'game';
    document.documentElement.setAttribute('data-route', route);
  }, [location.pathname]);
```

- [ ] **Step 4: Replace the inline `<header>` block with `<AppHeader>` and wrap content in the audio provider.**

In `src/App.tsx`, find the entire inline header block:

```tsx
      <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 
            className="text-2xl font-casino tracking-wider cursor-pointer" 
            onClick={() => navigate('/')}
          >
            OVG Casino
          </h1>
          <div className="px-4 py-1 rounded-full bg-black/30 font-mono font-bold text-lg text-green-400">
            ${profile.balance.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/rules')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Game Rules"
          >
            <BookOpen className="w-5 h-5 opacity-70" />
            <span className="text-sm font-medium opacity-90 hidden sm:block">Rules</span>
          </button>
          <button 
            onClick={() => navigate('/faq')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Help & FAQ"
          >
            <HelpCircle className="w-5 h-5 opacity-70" />
            <span className="text-sm font-medium opacity-90 hidden sm:block">Help</span>
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-5 h-5 opacity-70" />
            )}
            <span className="text-sm font-medium opacity-90 hidden sm:block">{profile.displayName}</span>
          </button>
        </div>
      </header>
```

Replace the entire block with a single line:

```tsx
      <AppHeader profile={profile} onLogout={logout} />
```

- [ ] **Step 5: Wrap the returned tree in `<AudioControlsProvider>`.**

In `src/App.tsx`, find the outermost `return (` of `AppContent` (the `<div className="h-screen flex flex-col …">` wrapper). Wrap it in `<AudioControlsProvider>` so the provider sits *above* the new AppHeader and the routed game shells:

Find:

```tsx
  return (
    <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden">
      {bgLoading && (
```

Replace with:

```tsx
  return (
    <AudioControlsProvider>
      <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden">
        {bgLoading && (
```

Then find the closing tags at the end of `AppContent`'s return:

```tsx
      </main>
    </div>
  );
}
```

Replace with:

```tsx
        </main>
      </div>
    </AudioControlsProvider>
  );
}
```

(One additional level of indentation for the inner `<div>` and `<main>` is fine — leave the visible diff legible; agentic workers should not reformat the rest.)

- [ ] **Step 6: Run all tests.**

Run: `npm test`
Expected: all tests pass (177 from Plan 1 + new tests from Tasks 1-8). The `AppHeader` regression test (only one header) passes because the inline header was removed.

- [ ] **Step 7: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 8: Commit.**

```bash
git add src/App.tsx src/components/Layout/AppHeader.test.tsx
git commit -m "refactor(app): replace inline header with <AppHeader>, wrap in AudioControlsProvider, set data-route"
```

---

### Task 10: GameShell refactor — strip internal header, themed loading, BetControl + hero ThemedButton, audio control binding

Removes the duplicate header (now lives in `AppHeader`), removes the bare `<input type="number">` + small SPIN button, swaps in `<BetControl>` + `<ThemedButton size="hero">`, and replaces the generic loading spinner with a `<ThemedSkeleton>` + `<GameStatusLine>`. Binds the audio element's `.muted` to `useAudioControls().muted` and registers the `nowPlaying` value while mounted.

**Files:**
- Modify: `src/components/Games/GameShell.tsx`
- Modify: `src/components/Games/GameShell.test.tsx`

- [ ] **Step 1: Read the existing GameShell test to see what props/callbacks it expects.**

Run: `cat src/components/Games/GameShell.test.tsx`
Expected: confirm the existing test renders `<GameShell>` with various props and checks behaviour around `playLabel`, `playDisabled`, message rendering, etc.

- [ ] **Step 2: Add new tests for the refactored behaviour.**

Edit `src/components/Games/GameShell.test.tsx` to add tests for: (a) renders `<BetControl>` instead of an `<input type="number">`; (b) the play button has `data-button-variant` set (i.e., it's a `<ThemedButton>`); (c) renders `<GameStatusLine>` while assets are loading; (d) registers the music in `useAudioControls()`. Append to the existing `describe('GameShell', …)` block:

```tsx
  // Helpers — wrap render in the audio provider since GameShell now reads from it.
  const renderShell = (overrides: Partial<React.ComponentProps<typeof GameShell>> = {}) => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    return render(
      <AudioControlsProvider>
        <GameShell
          name="Test"
          theme="sweets"
          bgKey="bg_slots_sweets"
          extraAssetKeys={[]}
          gameType="slots"
          win={null}
          bet={10}
          onBet={() => {}}
          onPlay={() => {}}
          playLabel="SPIN"
          playDisabled={false}
          message={null}
          balance={100}
          onBack={() => {}}
          {...overrides}
        >
          <div data-testid="game-body" />
        </GameShell>
      </AudioControlsProvider>
    );
  };

  it('renders a <BetControl> instead of a bare number input', () => {
    renderShell();
    // BetControl exposes data-testid="bet-control"; legacy input is gone.
    expect(screen.getByTestId('bet-control')).toBeTruthy();
    expect(document.querySelector('input[type="number"]')).toBeNull();
  });

  it('renders the play button as a ThemedButton (carries data-button-variant)', () => {
    renderShell();
    const btn = screen.getByRole('button', { name: 'SPIN' });
    expect(btn.getAttribute('data-button-variant')).toBeTruthy();
    expect(btn.getAttribute('data-size')).toBe('hero');
  });

  it('does not render the legacy back-to-lobby button (lives in AppHeader now)', () => {
    renderShell();
    expect(screen.queryByRole('button', { name: /back to lobby/i })).toBeNull();
  });
```

You also need to import `AudioControlsProvider` at the top of the file:

```ts
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
```

- [ ] **Step 3: Run the new tests to verify they fail.**

Run: `npx vitest run src/components/Games/GameShell.test.tsx`
Expected: FAIL — the existing GameShell still renders the old back-button + bare input.

- [ ] **Step 4: Refactor `src/components/Games/GameShell.tsx`.**

Replace the entire file contents with:

```tsx
import { type ReactNode, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Confetti from 'react-confetti';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { useAudioControls, type NowPlayingGameType } from '../../contexts/AudioControlsContext';
import { ThemedButton } from '../Themed/ThemedButton';
import { ThemedSkeleton } from '../Themed/ThemedSkeleton';
import { BetControl } from './BetControl';
import { GameStatusLine } from './GameStatusLine';
import type { ThemeType } from '../../utils/themeManifesto';

export interface GameShellProps {
  name: string;
  theme: string;
  bgKey: string;
  extraAssetKeys: string[];
  gameType: 'roulette' | 'slots' | 'bingo';
  win: 'jackpot' | 'small' | null;
  bet: number;
  onBet: (n: number) => void;
  onPlay: () => void;
  playLabel: string;
  playDisabled: boolean;
  message: string | null;
  balance: number;
  onBack: () => void;
  children: ReactNode;
}

export function GameShell(props: GameShellProps) {
  const { assets, loading: assetsLoading } = useAssets([props.bgKey, ...props.extraAssetKeys]);
  const { musicUrl, loading: musicLoading } = useMusic(props.theme, props.gameType);
  const { muted, setNowPlaying } = useAudioControls();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Register what's playing for the header MusicPill while this shell is mounted.
  useEffect(() => {
    setNowPlaying({ theme: props.theme as ThemeType, gameType: props.gameType as NowPlayingGameType });
    return () => setNowPlaying(null);
  }, [props.theme, props.gameType, setNowPlaying]);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.muted = muted;
      audioRef.current.play()?.catch(() => { /* user-gesture required */ });
    }
  }, [musicUrl, muted]);

  // Apply mute changes immediately to a playing audio element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const loading = assetsLoading || musicLoading;

  return (
    <div
      className="flex-1 flex flex-col bg-theme-bg text-white relative"
      style={
        assets[props.bgKey]
          ? { backgroundImage: `url(${assets[props.bgKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      <audio ref={audioRef} />
      {/* Backdrop-blur instead of the previous solid 60% black wash. */}
      <div className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm p-6">
        <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col items-stretch justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <ThemedSkeleton aspectRatio="16/9" width="min(80%, 480px)" data-testid="game-shell-skeleton" />
              <p className="text-sm opacity-80">Generating unique {props.theme} world…</p>
            </div>
          ) : (
            props.children
          )}
        </main>

        <div className="max-w-2xl w-full mx-auto mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <BetControl value={props.bet} onChange={props.onBet} disabled={props.playDisabled} />
            <ThemedButton onClick={props.onPlay} disabled={props.playDisabled} size="hero">
              {props.playLabel}
            </ThemedButton>
          </div>
          <GameStatusLine isLoading={loading} />
          {props.message && <p className="text-center text-sm opacity-90">{props.message}</p>}
        </div>

        <AnimatePresence>
          {props.win === 'jackpot' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-40"
            >
              <Confetti />
              <div className="text-7xl font-casino text-yellow-300">JACKPOT!</div>
            </motion.div>
          )}
          {props.win === 'small' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-3 rounded-full text-black font-bold z-40"
            >
              You won!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

Notes for the implementer:
- The `<header>` and `onBack` button are removed; `props.onBack` is now a no-op from GameShell's POV (kept in the props interface so the existing call sites in `Slots.tsx`, `Roulette.tsx`, `Bingo.tsx` don't need a wider refactor — they pass it but GameShell ignores it).
- `min-h-screen` is replaced with `flex-1 flex flex-col` to fit inside the new layout where `<App>`'s `<main>` is the scroll container.
- `<Confetti>` and the JACKPOT / small-win overlays are kept verbatim — they go away in Plan 6.

- [ ] **Step 5: Run all tests.**

Run: `npm test`
Expected: all pass. The new GameShell tests confirm BetControl + ThemedButton are rendered and the legacy back button is gone. Existing GameShell.test.tsx tests for `playDisabled`, `playLabel`, message rendering, `data-testid="game-body"` should still pass since the props contract is unchanged.

If any existing GameShell test fails because it asserted the back-to-lobby button or the `<input type="number">`, *update those existing assertions* to match the new contract — these were chrome details, not behavioural contracts. Document the change in the commit message.

- [ ] **Step 6: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 7: Commit.**

```bash
git add src/components/Games/GameShell.tsx src/components/Games/GameShell.test.tsx
git commit -m "refactor(shell): GameShell — strip internal header, themed loading, BetControl + hero ThemedButton, audio mute binding"
```

---

### Task 11: WorldPage audio integration

WorldPage already plays world music via its own audio element. Bind the element's `.muted` to `useAudioControls().muted` and call `setNowPlaying({ theme, gameType: 'world' })` while mounted so the header MusicPill works on `/world/:theme`.

**Files:**
- Modify: `src/components/WorldPage.tsx`
- Modify: `src/components/WorldPage.test.tsx`

- [ ] **Step 1: Read the current WorldPage to find the audio ref + effect.**

Run: `cat src/components/WorldPage.tsx`
Expected: Confirms the file shape — there is an `audioRef` + an effect that sets `src`, `loop`, `volume`, calls `play()`. Note exact line numbers / variable names so the next step's edit is targeted.

- [ ] **Step 2: Add a regression test that asserts WorldPage registers nowPlaying.**

Edit `src/components/WorldPage.test.tsx`. Append inside the existing describe block (and add the import at the top):

```tsx
import { AudioControlsProvider, useAudioControls } from '../contexts/AudioControlsContext';
```

```tsx
  it('registers nowPlaying = { theme, gameType: "world" } while mounted', () => {
    let capturedNp: any = null;
    function Probe() {
      const { nowPlaying } = useAudioControls();
      capturedNp = nowPlaying;
      return null;
    }
    document.documentElement.setAttribute('data-theme', 'space');
    render(
      <MemoryRouter initialEntries={['/world/space']}>
        <AudioControlsProvider>
          <Probe />
          <Routes>
            <Route path="/world/:theme" element={<WorldPage />} />
          </Routes>
        </AudioControlsProvider>
      </MemoryRouter>
    );
    expect(capturedNp).toEqual({ theme: 'space', gameType: 'world' });
  });
```

If the existing WorldPage.test.tsx does not already wrap in `MemoryRouter` and use the imports above, follow its existing setup pattern (the file is already in the repo per Plan 1 — see `src/components/WorldPage.test.tsx`).

- [ ] **Step 3: Run the new test to verify it fails.**

Run: `npx vitest run src/components/WorldPage.test.tsx`
Expected: FAIL — `expected null to equal { theme: 'space', gameType: 'world' }`.

- [ ] **Step 4: Modify `src/components/WorldPage.tsx`.**

Add this import at the top of the file (next to the other hook imports):

```ts
import { useAudioControls } from '../contexts/AudioControlsContext';
```

Inside the `WorldPage` component body, near where other hooks are called and **before** the existing audio-playback effect, add:

```ts
  const { muted, setNowPlaying } = useAudioControls();

  useEffect(() => {
    if (!theme) return;
    setNowPlaying({ theme: theme as any, gameType: 'world' });
    return () => setNowPlaying(null);
  }, [theme, setNowPlaying]);
```

Then, in the existing audio-playback effect (the one that sets `audioRef.current.src = musicUrl`, `loop = true`, `volume`, calls `play()`), add a line that binds `muted`:

```ts
audioRef.current.muted = muted;
```

immediately after the `audioRef.current.volume = …` line. Add `muted` to the effect's dependency array.

Then add a second small effect that re-applies mute when it toggles independently of the music URL changing:

```ts
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);
```

- [ ] **Step 5: Run the test to verify it passes.**

Run: `npx vitest run src/components/WorldPage.test.tsx`
Expected: PASS — including the new nowPlaying assertion.

- [ ] **Step 6: Run all tests.**

Run: `npm test`
Expected: all pass.

- [ ] **Step 7: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 8: Commit.**

```bash
git add src/components/WorldPage.tsx src/components/WorldPage.test.tsx
git commit -m "feat(world): bind world-music audio to useAudioControls (mute + nowPlaying)"
```

---

### Task 12: Roulette — surface the bet-type requirement in the action-bar label

Today's Roulette UX has a problem at first paint: `playDisabled` is `true` (because `betType === null`) but the `playLabel` is "SPIN THE WHEEL" — the operator sees a disabled button with no hint why. Spec calls for `"Pick Red / Black / Even / Odd"` as the surfaced label until a bet is selected.

**Files:**
- Modify: `src/components/Games/Roulette.tsx`
- Modify: `src/components/Games/Roulette.test.tsx` (or create if absent)

- [ ] **Step 1: Add a regression test.**

If `src/components/Games/Roulette.test.tsx` exists, edit it. Otherwise create it with the standard imports plus an `AudioControlsProvider` wrapper. Add a test:

```tsx
  it('shows "Pick Red / Black / Even / Odd" as the play label until a bet type is chosen', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Roulette
          name="Wheel"
          theme="sweets"
          balance={100}
          onUpdateBalance={() => {}}
          onBack={() => {}}
        />
      </AudioControlsProvider>
    );
    expect(screen.getByRole('button', { name: /pick red/i })).toBeTruthy();
    // Choose red, then the SPIN label takes over.
    fireEvent.click(screen.getByRole('button', { name: 'red' }));
    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeTruthy();
  });
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npx vitest run src/components/Games/Roulette.test.tsx`
Expected: FAIL — the play button is currently labelled "SPIN THE WHEEL" even when `betType === null`.

- [ ] **Step 3: Modify Roulette.**

In `src/components/Games/Roulette.tsx`, find the `playLabel` prop on the `<GameShell>`:

```tsx
        playLabel={spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
```

Replace with:

```tsx
        playLabel={spinning ? 'SPINNING...' : !betType ? 'Pick Red / Black / Even / Odd' : 'SPIN THE WHEEL'}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `npx vitest run src/components/Games/Roulette.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run all tests.**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 7: Commit.**

```bash
git add src/components/Games/Roulette.tsx src/components/Games/Roulette.test.tsx
git commit -m "fix(roulette): surface bet-type requirement in the action-bar label"
```

---

### Task 13: CES messenger — theme-aware position via CSS

The CES messenger floats bottom-right by default. On game pages the primary action button lives bottom-right too — they overlap. Move the messenger to the bottom-left whenever `data-route="game"`. This is a pure CSS change keyed off the data-attribute set in Task 9.

**Note:** The messenger is a custom element (`<ces-messenger>`) with shadow DOM. We cannot style its internals from outside, but we can position the host element. The host listens to the same CSS as a regular element.

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Inspect the CES messenger element to confirm it can be positioned via outer CSS.**

Run: `grep -n 'ces-messenger' src/index.css public/ces-init.js public/index.html 2>/dev/null`
Expected: confirms how the element is mounted (likely via `index.html` or a script in `public/`). The host element is in light DOM and accepts standard CSS positioning.

If the messenger is positioned via attributes inside its shadow DOM with `!important` such that outer CSS cannot override its position, **stop** and add a follow-up note in the plan; document the finding in the commit message instead of trying to brute-force it.

- [ ] **Step 2: Append the position rules to `src/index.css`.**

At the bottom of `src/index.css` (outside any existing `@layer` block), append:

```css
/* CES messenger: theme/route-aware position. The custom element lives at the
   bottom-right by default; on game pages we move it bottom-left so it doesn't
   overlap the primary action ThemedButton. */
ces-messenger {
  /* Use !important so we win against any inline style the element sets on itself
     after upgrade. Visual-only — does not affect the element's behaviour. */
  position: fixed !important;
  right: 1.25rem !important;
  bottom: 1.25rem !important;
  left: auto !important;
  z-index: 60;
  transition: right 250ms ease, left 250ms ease;
}
:root[data-route="game"] ces-messenger {
  right: auto !important;
  left: 1.25rem !important;
}
```

- [ ] **Step 3: Verify the build still parses.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 4: Run all tests.**

Run: `npm test`
Expected: all pass (no test changes).

- [ ] **Step 5: Commit.**

```bash
git add src/index.css
git commit -m "feat(layout): CES messenger moves to bottom-left on game routes"
```

---

### Task 14: Build + visual verification on a fresh dev server

After Tasks 1-13, the new chrome should compose end-to-end. This task is a non-code verification gate: run the dev server, open the lobby, navigate to `/game/<id>`, confirm the new chrome renders, music pill toggles mute, bet control updates the bet, hero button is visibly themed.

**Files:** none modified.

- [ ] **Step 1: Run a production build to catch any Vite/Tailwind v4 surprise.**

Run: `npx vite build 2>&1 | tail -15`
Expected: build completes; bundle size within the spec's budget (`current + 50KB`).

- [ ] **Step 2: Run the full test suite + lint.**

Run: `npm run lint && npm test`
Expected: lint exit 0; all tests pass.

- [ ] **Step 3: Start dev server (out-of-band; the implementing engineer should do this manually) and click through:**

- Visit `/` — header shows logo + balance + `⋯` menu, no music pill (lobby).
- Click a world card → `/world/<theme>` — header shows back button + theme name in the theme display font + balance + music pill (waveform animating) + `⋯` menu. Click the music pill → bars dim and `data-muted="true"`. Click again → bars resume.
- Click a game card → `/game/<gameId>` — themed loading skeleton + status line `"Gemini 3.1 generating · Lyria 3 composing soundtrack"` while assets resolve. Once loaded: themed game body + `<BetControl>` (preset chips + ± stepper) + themed hero button. Bet preset chips highlight on click; stepper changes the value.
- On Roulette specifically: before picking a bet, the hero button label reads "Pick Red / Black / Even / Odd" and is disabled. After picking, it reads "SPIN THE WHEEL".
- Click `⋯` → menu opens with Profile / Rules / Help / Logout. Click outside → closes. Esc → closes.
- Reload after toggling mute — preference persists (localStorage `ovg-audio-muted`).
- CES messenger sits bottom-right on `/` and `/world/...`, bottom-left on `/game/...`.

- [ ] **Step 4: Commit a no-op marker (or skip).**

If everything looks right, no commit is needed — the verification step is documentation. If during browser-testing the engineer finds a bug, capture it as a separate fix task with its own commit (mirroring Plan 1's `fix(world): back-to-lobby...` follow-ups).

---

### Task 15: Update progress + memory

After all tasks pass and visual verification is clean, capture the result in the progress doc + memory so the next session can pick up Plan 3.

**Files:**
- Create: `docs/superpowers/progress/2026-05-XX-plan-2-status.md` (use the actual completion date)
- Modify: `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`

- [ ] **Step 1: Write the progress doc.**

Create `docs/superpowers/progress/2026-05-XX-plan-2-status.md` mirroring the structure of `docs/superpowers/progress/2026-05-07-plan-1-status.md`:
- TL;DR (one paragraph: what's shipped, branch state, test count, deploy state).
- Branch state: name, tip commit, divergence from main, push state, PR URL placeholder.
- What landed in Plan 2 (per task, with file paths).
- What's NOT in Plan 2 (deferred to Plans 3-6).
- Known limitations / things to revisit.
- Tasks for the next session (open PR → merge → deploy → start Plan 3).
- Where to find things (spec / plan / progress doc / memory pointer).
- Sanity checks to run on next session start.

- [ ] **Step 2: Update memory.**

Edit `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md` to reflect "Plan 2 of 6 is complete on `feat/plan-2-game-page-chrome`, X commits, Y/Y tests, lint + build green, not yet merged or deployed (or merged + deployed if it has been)". Update the description front-matter accordingly.

- [ ] **Step 3: Commit the progress doc.**

```bash
git add docs/superpowers/progress/2026-05-XX-plan-2-status.md docs/superpowers/plans/2026-05-07-game-page-chrome.md
git commit -m "docs(plan-2): commit progress note + plan doc"
```

(Memory files live outside the repo and are not committed.)

---

## Self-review

Spec coverage check (Section 3 + Section 8 cross-cuts):

| Spec requirement | Task |
|---|---|
| Single unified header (replaces App + GameShell stack) | Tasks 8, 9, 10 |
| Header — game mode: back button + game title in theme display font | Task 8 |
| Header — game mode: music pill, balance pill, ⋯ menu | Tasks 3, 4, 5, 8 |
| Header — lobby mode: 🎰 OVG Casino logo + balance + menu (no music pill) | Task 8 |
| Backdrop-blur over bg art instead of 60% black wash | Task 10 |
| Bet cluster: preset chips + ± stepper + active highlight | Task 6 |
| Primary action: `<ThemedButton size="hero">` | Task 10 |
| Roulette: themed-disabled with note when no bet type selected | Task 12 |
| Themed loading state — bg first, themed skeleton, status line | Tasks 7, 10 |
| Status line: "Gemini 3.1 generating · Lyria 3 composing soundtrack" | Task 7 |
| Removed: stacked headers, 60% wash, bare bet input, small SPIN, per-page Rules/Help in App header | Tasks 9, 10, 4 (Rules/Help moved to MenuDropdown) |
| Mute control mutes music + UI sounds | Tasks 1, 2, 5, 10, 11 |
| Mute persists to localStorage | Task 1 |
| Music pill waveform animates while playing, dims when muted | Task 5 |
| `prefers-reduced-motion` respected (waveform stops, count-up snaps) | Tasks 3, 5 (via `useMotion`) |
| CES messenger position theme/route-aware | Task 13 |
| Per-symbol morph during loading | **Deferred to Plan 3** (couples to slot rendering) |
| Per-theme button click sample on every primary press | **Deferred to Plan 6** (sound assets land there) |
| Themed bubble colour for CES | **Investigate in Task 13; deferred if it requires shadow-DOM access** |

Placeholder scan: no "TBD", "TODO", "implement later", "fill in details", "similar to Task N", or naked behavioural prose without code. Every code step shows code; every command step shows the command.

Type consistency: `NowPlayingGameType` is the union `'roulette' \| 'slots' \| 'bingo' \| 'world'`. `GameShell.gameType` (`'roulette' \| 'slots' \| 'bingo'`) widens to it via the `as NowPlayingGameType` cast in Task 10 — explicit and traceable. `BalancePill` props are `{ balance: number }` everywhere it's used. `MenuDropdown` props are `{ onProfile, onRules, onHelp, onLogout }` consistently. `BetControl` props are `{ value, onChange, presets?, min?, max?, disabled? }` consistently.

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-07-game-page-chrome.md`.
