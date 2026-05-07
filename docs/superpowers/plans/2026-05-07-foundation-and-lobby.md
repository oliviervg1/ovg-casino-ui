# Plan 1 — Foundation + Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new themed lobby with the AI pitch strip, "Regenerate everything" CTA, themed world cards, and themed loading skeletons. Land the foundation (theme manifesto + themed atoms + typography/spacing/motion tokens + per-theme CSS custom properties) so subsequent plans can build on it.

**Architecture:** Replace `src/utils/themeStyles.ts` with `src/utils/themeManifesto.ts` — a typed manifesto map that carries the per-theme design vocabulary (font, surface, button, border, motion.idle, celebration, skeleton, audio.click). Add per-theme color custom properties to `src/index.css` (today's CSS only has `light`/`dark` data-themes; the redesign sets `data-theme` to the actual theme name). Build minimal themed atoms (`ThemedCard`, `ThemedSkeleton`, `ThemedButton`) sufficient for the lobby. Extract the existing `Profile.tsx` regenerate-everything orchestration into a `useBatchRegenerate` hook so both Profile and the new lobby pitch strip can call it. Replace `Lobby.tsx` body with the new layout. All existing game pages keep working unchanged through this plan (they use `useTheme().font` instead of the deleted `getThemeStyles().font` — purely mechanical).

**Tech stack:** TypeScript, React 18, Tailwind CSS v4 (via `@import "tailwindcss"` + `@theme`), Framer Motion (already installed as `motion/react`), Vite, Vitest, @testing-library/react, jsdom.

**Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` — Sections 1 (Theme tokens) and 2 (Lobby), plus the typography/spacing/motion subsections of Section 8 that are foundational. Sections 3-7 are deferred to Plans 2-6.

**Out of scope for Plan 1 (covered in later plans):**
- Game-page chrome (Plan 2): `AppHeader`, `BetControl`, `MusicPill`
- Slots / Roulette / Bingo surface rewrites (Plans 3-5)
- Win / loss themed celebrations (Plan 6)
- UI sound assets (Plan 6)
- CES messenger repositioning (small follow-up after Plan 2)

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `src/utils/themeManifesto.ts` | Typed manifesto map: `Record<ThemeType, Manifesto>`. Single source of truth for per-theme design tokens (font, color tokens echoed for JS access, surface/button/border/motion.idle/celebration/skeleton/audio.click discriminators). |
| `src/utils/themeManifesto.test.ts` | Asserts all 8 themes are present and complete. |
| `src/hooks/useTheme.ts` | Reads the current `data-theme` attribute and returns the matching manifesto entry. |
| `src/hooks/useTheme.test.tsx` | Tests theme resolution. |
| `src/hooks/useMotion.ts` | Wraps Framer Motion with `prefers-reduced-motion` fallback. Returns `{ shouldAnimate: boolean, durations: {…} }` and a helper `motionVariant(full, reduced)` that picks based on user preference. |
| `src/hooks/useMotion.test.tsx` | Tests reduced-motion fallback. |
| `src/hooks/useBatchRegenerate.ts` | Extracted from `Profile.tsx`. Orchestrates the 105-task batch regenerate with `REGEN_CONCURRENCY = 4`, returns `{ start, isRegenerating, status, error }`. |
| `src/hooks/useBatchRegenerate.test.tsx` | Tests concurrency behaviour, status updates, error classification. |
| `src/components/Themed/ThemedCard.tsx` | Themed surface wrapper. Switches on `manifesto.surface` (`pillowy-glass`, `parchment`, `holographic`, `wood-iron`, `coral`, `mossy-stone`, `black-marble`, `dark-wood-paper`). Used by world cards and other surfaces. |
| `src/components/Themed/ThemedCard.test.tsx` | Renders all 8 surface variants without crash. |
| `src/components/Themed/ThemedSkeleton.tsx` | Animated themed loading placeholder. Switches on `manifesto.skeleton` (`unwrap`, `hieroglyph-fade`, `hyperspace-streak`, etc.). |
| `src/components/Themed/ThemedSkeleton.test.tsx` | Renders all 8 skeleton variants without crash; respects reduced-motion. |
| `src/components/Themed/ThemedButton.tsx` | Themed primary action. Switches on `manifesto.button` (`gummy-3d`, `scarab-cartouche`, `neon-rim`, etc.). Used by the lobby regenerate CTA in Plan 1; extended with `variant="hero"` size in Plan 2. |
| `src/components/Themed/ThemedButton.test.tsx` | Renders all 8 button variants; click fires onClick; disabled state. |
| `src/components/Lobby/AIPitchStrip.tsx` | The pitch strip — heading, sub-line, regenerate CTA. |
| `src/components/Lobby/AIPitchStrip.test.tsx` | Renders text; CTA click triggers callback. |
| `src/components/Lobby/WorldCard.tsx` | Single themed world card: themed surface + bg image + theme name in display font + 3 game-mini-icons. |
| `src/components/Lobby/WorldCard.test.tsx` | Renders for all 8 themes; click on icon navigates to specific game; click on body navigates to default (slots). |
| `src/components/Lobby/LobbyGrid.tsx` | 4×2 grid of WorldCards. Loads `bg_slots_<theme>` × 8 via `useAssets`; renders themed skeletons while loading. |
| `src/components/Lobby/LobbyGrid.test.tsx` | Renders 8 cards when loaded; 8 skeletons when loading. |

### Modified files

| Path | Change |
|---|---|
| `src/index.css` | Add per-theme color custom properties for all 8 themes (replace today's `light`/`dark` rules with `[data-theme="sweets"]` … `[data-theme="ninja"]`). Add typography scale + spacing scale + motion duration custom properties to `@theme`. |
| `src/App.tsx` | Change `data-theme` attribute to use the actual theme name (currently sets `'light'` or `'dark'` based on `lightThemes`/`darkThemes` lookup). |
| `src/components/Lobby.tsx` | Replace body with `<AIPitchStrip />` + `<LobbyGrid />`. Remove the welcome 🎰 hero, Group-by toggle, and 24-card grid. |
| `src/components/Profile.tsx` | Replace inline regenerate orchestration (lines 16-100ish) with a call to `useBatchRegenerate()`. UI for regenerate stays in Profile for now (Plan 2 may move it). |
| `src/components/Games/Slots.tsx`, `Roulette.tsx`, `Bingo.tsx`, `Lobby.tsx` (and any other `getThemeStyles` callers) | Replace `import { getThemeStyles } from '../utils/themeStyles'` + `getThemeStyles(theme).font` calls with `useTheme().font`. Mechanical. |

### Removed files

| Path | Reason |
|---|---|
| `src/utils/themeStyles.ts` | Replaced atomically by `themeManifesto.ts` + `useTheme()`. All callers migrated in the same PR; no back-compat shim. |

### Dependencies

No new deps. No deps removed.

---

## Tasks

### Task 1: Add typography + spacing + motion CSS custom properties

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Read the current `src/index.css` to confirm the existing `@theme` and `@layer base` structure.**

Run: `cat src/index.css | head -80`
Expected: confirms current structure (Google Fonts `@import`, `@import "tailwindcss"`, `@theme { ... font tokens ... }`, `@layer base { :root { ... } [data-theme="light"] {...} [data-theme="dark"] {...} body {...} }`).

- [ ] **Step 2: Extend the `@theme` block with typography sizes, spacing scale, and motion durations.**

In `src/index.css`, inside the existing `@theme { ... }` block, after the `--font-*` lines, append:

```css
  /* Typography scale (line-height inline where needed) */
  --text-display: 2.75rem;     /* 44px — game titles, win labels */
  --text-h1: 1.5rem;           /* 24px */
  --text-h2: 1.125rem;         /* 18px */
  --text-body: 0.875rem;       /* 14px */
  --text-label: 0.6875rem;     /* 11px — uppercase labels */
  --text-mono: 0.875rem;       /* 14px — currency */
  --text-micro: 0.625rem;      /* 10px — captions */

  /* Spacing scale — 4-unit grid */
  --space-1: 0.25rem;          /* 4px */
  --space-2: 0.5rem;           /* 8px */
  --space-3: 0.75rem;          /* 12px */
  --space-4: 1rem;             /* 16px */
  --space-6: 1.5rem;           /* 24px */
  --space-8: 2rem;             /* 32px */
  --space-12: 3rem;            /* 48px */
  --space-16: 4rem;            /* 64px */

  /* Motion durations + easings */
  --motion-instant: 100ms;
  --motion-quick: 250ms;
  --motion-standard: 400ms;
  --motion-slow: 1200ms;
  --motion-spin: 2500ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-spin: cubic-bezier(0.15, 0, 0.25, 1);
```

- [ ] **Step 3: Verify the CSS still parses by running the dev build.**

Run: `npm run lint`
Expected: exit 0, no output.

- [ ] **Step 4: Commit.**

```bash
git add src/index.css
git commit -m "feat(css): add typography, spacing, and motion tokens to @theme"
```

---

### Task 2: Add per-theme color custom properties for all 8 themes

**Files:**
- Modify: `src/index.css`

This replaces the current `[data-theme="light"]` / `[data-theme="dark"]` rules (which collapse 8 themes into 2 modes) with one rule per theme.

- [ ] **Step 1: Locate the existing `@layer base { :root { ... } [data-theme="light"] {...} [data-theme="dark"] {...} }` block.**

Run: `grep -n "data-theme" src/index.css`
Expected: lines around the existing rules.

- [ ] **Step 2: Replace the `[data-theme="light"]` and `[data-theme="dark"]` rules with 8 per-theme rules. Keep the `:root` defaults as-is (they remain the fallback when no theme is set).**

In `src/index.css`, replace the `[data-theme="light"]` and `[data-theme="dark"]` blocks with:

```css
  :root[data-theme="sweets"] {
    --theme-bg: #fdf2f8;
    --theme-bg-rgb: 253, 242, 248;
    --theme-card: rgba(255, 255, 255, 0.85);
    --theme-primary: #ec4899;
    --theme-secondary: #be185d;
    --theme-accent: #fbbf24;
    --theme-text: #4c1d95;
  }
  :root[data-theme="egypt"] {
    --theme-bg: #292524;
    --theme-bg-rgb: 41, 37, 36;
    --theme-card: rgba(120, 53, 15, 0.65);
    --theme-primary: #fbbf24;
    --theme-secondary: #b45309;
    --theme-accent: #fef3c7;
    --theme-text: #fef3c7;
  }
  :root[data-theme="space"] {
    --theme-bg: #0f0a2e;
    --theme-bg-rgb: 15, 10, 46;
    --theme-card: rgba(49, 46, 129, 0.65);
    --theme-primary: #6366f1;
    --theme-secondary: #818cf8;
    --theme-accent: #c7d2fe;
    --theme-text: #c7d2fe;
  }
  :root[data-theme="west"] {
    --theme-bg: #451a03;
    --theme-bg-rgb: 69, 26, 3;
    --theme-card: rgba(120, 53, 15, 0.7);
    --theme-primary: #d97706;
    --theme-secondary: #92400e;
    --theme-accent: #fbbf24;
    --theme-text: #fef3c7;
  }
  :root[data-theme="ocean"] {
    --theme-bg: #082f49;
    --theme-bg-rgb: 8, 47, 73;
    --theme-card: rgba(14, 116, 144, 0.6);
    --theme-primary: #06b6d4;
    --theme-secondary: #0e7490;
    --theme-accent: #67e8f9;
    --theme-text: #67e8f9;
  }
  :root[data-theme="jungle"] {
    --theme-bg: #052e16;
    --theme-bg-rgb: 5, 46, 22;
    --theme-card: rgba(20, 83, 45, 0.65);
    --theme-primary: #84cc16;
    --theme-secondary: #65a30d;
    --theme-accent: #bef264;
    --theme-text: #bef264;
  }
  :root[data-theme="vampire"] {
    --theme-bg: #0a0a0a;
    --theme-bg-rgb: 10, 10, 10;
    --theme-card: rgba(31, 41, 55, 0.75);
    --theme-primary: #ef4444;
    --theme-secondary: #7f1d1d;
    --theme-accent: #fca5a5;
    --theme-text: #fca5a5;
  }
  :root[data-theme="ninja"] {
    --theme-bg: #0f172a;
    --theme-bg-rgb: 15, 23, 42;
    --theme-card: rgba(31, 41, 55, 0.75);
    --theme-primary: #fbbf24;
    --theme-secondary: #475569;
    --theme-accent: #fde68a;
    --theme-text: #fde68a;
  }
```

- [ ] **Step 3: Verify the CSS still parses.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit.**

```bash
git add src/index.css
git commit -m "feat(css): per-theme color custom properties for all 8 themes"
```

---

### Task 3: Update App.tsx to set `data-theme` to the actual theme name

**Files:**
- Modify: `src/App.tsx` (around the `useEffect` that sets `data-theme`)

Currently `App.tsx` derives `currentTheme` as either `'light'` or `'dark'` by looking up the game's theme in `lightThemes` / `darkThemes`. The redesign needs the actual theme name (`'sweets'`, `'egypt'`, etc.) so the new per-theme CSS rules apply.

- [ ] **Step 1: Locate the `currentTheme` derivation and the `useEffect` that calls `setAttribute('data-theme', currentTheme)`.**

Run: `grep -n "currentTheme\|data-theme" src/App.tsx`
Expected: 4-6 matches around the lobby vs game-route logic.

- [ ] **Step 2: Read the surrounding code (~30 lines) to understand the existing logic.**

Read `src/App.tsx` around lines 65-95 (the `currentTheme` block).

- [ ] **Step 3: Change the `currentTheme` derivation to set the actual theme name instead of `'light'`/`'dark'`. Default to `'sweets'` (or another sensible default) when on a non-game route.**

Replace the existing `currentTheme` block with:

```typescript
  // The body theme tracks the current game's theme on game pages, so the
  // per-theme CSS custom properties (sweets / egypt / space / …) apply.
  // On non-game routes (lobby, profile, etc.) we fall back to a neutral
  // default so the page chrome still has theme tokens to read.
  let currentTheme: ThemeType = 'sweets';
  const gameMatch = location.pathname.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    const gameDef = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (gameDef) currentTheme = gameDef.theme;
  }
```

(Remove the `lightThemes.includes(...) ? 'light' : 'dark'` line.)

- [ ] **Step 4: Verify the existing tests still pass.**

Run: `npm test`
Expected: all 97 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/App.tsx
git commit -m "feat(app): set data-theme to actual theme name (sweets/egypt/…)"
```

---

### Task 4: Create the `themeManifesto.ts` type definition (skeleton only — values come in Task 5)

**Files:**
- Create: `src/utils/themeManifesto.ts`
- Create: `src/utils/themeManifesto.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `src/utils/themeManifesto.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { themeManifesto, type ThemeType, THEME_NAMES } from './themeManifesto';

describe('themeManifesto', () => {
  it('exports an entry for all 8 theme names', () => {
    expect(THEME_NAMES).toEqual(['sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja']);
    THEME_NAMES.forEach((t: ThemeType) => {
      expect(themeManifesto[t]).toBeDefined();
    });
  });

  it('every manifesto entry has all 8 required keys', () => {
    const requiredKeys = ['font', 'displayName', 'surface', 'button', 'border', 'motionIdle', 'celebration', 'skeleton', 'audioClick'] as const;
    for (const t of THEME_NAMES) {
      const m = themeManifesto[t];
      for (const k of requiredKeys) {
        expect(m[k], `${t}.${k}`).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npx vitest run --project client src/utils/themeManifesto.test.ts`
Expected: FAIL with "Cannot find module './themeManifesto'".

- [ ] **Step 3: Create the type + skeleton structure (with placeholder string values for now).**

Create `src/utils/themeManifesto.ts` with:

```typescript
// Source of truth for per-theme design tokens. Each theme manifesto carries
// the design vocabulary that themed components switch on (surface shape,
// button language, celebration motion, loading skeleton, idle motion, click
// sound). Concrete CSS values for color tokens live in src/index.css under
// :root[data-theme="..."] rules; this file carries the JS-readable
// discriminators and the per-theme display font class.

export type ThemeType = 'sweets' | 'egypt' | 'space' | 'west' | 'ocean' | 'jungle' | 'vampire' | 'ninja';

export const THEME_NAMES: ThemeType[] = ['sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja'];

export type SurfaceVariant = 'pillowy-glass' | 'parchment' | 'holographic' | 'wood-iron' | 'coral' | 'mossy-stone' | 'black-marble' | 'dark-wood-paper';
export type ButtonVariant = 'gummy-3d' | 'scarab-cartouche' | 'neon-rim' | 'branded-leather' | 'bubble' | 'vine-wrap' | 'velvet-pill' | 'seal-stamp';
export type BorderVariant = 'candy-wrapper' | 'gold-leaf' | 'neon-line' | 'rope-iron' | 'kelp-frame' | 'vine' | 'gothic-arch' | 'ink-brush';
export type MotionIdleVariant = 'jiggle' | 'drift' | 'pulse' | 'sway' | 'flicker';
export type CelebrationVariant = 'candy-burst' | 'sandstorm-gold' | 'supernova' | 'dust-storm' | 'bioluminescent-burst' | 'parrot-flock' | 'bat-swarm' | 'cherry-blossom-storm';
export type SkeletonVariant = 'unwrap' | 'hieroglyph-fade' | 'hyperspace-streak' | 'wagon-wheel' | 'sonar-ripple' | 'vine-grow' | 'candle-flicker' | 'ink-bleed';
export type AudioClickVariant = 'candy-crinkle' | 'parchment-rustle' | 'laser-blip' | 'spur-jingle' | 'bubble-pop' | 'wood-knock' | 'velvet-tap' | 'sword-tap';

export interface Manifesto {
  /** Display name shown in lobby world cards, game titles, etc. */
  displayName: string;
  /** Tailwind utility class for the theme's display font (e.g. 'font-sweets'). */
  font: string;
  surface: SurfaceVariant;
  button: ButtonVariant;
  border: BorderVariant;
  motionIdle: MotionIdleVariant;
  celebration: CelebrationVariant;
  skeleton: SkeletonVariant;
  audioClick: AudioClickVariant;
}

export const themeManifesto: Record<ThemeType, Manifesto> = {
  sweets: { displayName: 'Sweets', font: 'font-sweets', surface: 'pillowy-glass', button: 'gummy-3d', border: 'candy-wrapper', motionIdle: 'jiggle', celebration: 'candy-burst', skeleton: 'unwrap', audioClick: 'candy-crinkle' },
  egypt: { displayName: 'Egypt', font: 'font-egypt font-bold', surface: 'parchment', button: 'scarab-cartouche', border: 'gold-leaf', motionIdle: 'pulse', celebration: 'sandstorm-gold', skeleton: 'hieroglyph-fade', audioClick: 'parchment-rustle' },
  space: { displayName: 'Space', font: 'font-space font-bold', surface: 'holographic', button: 'neon-rim', border: 'neon-line', motionIdle: 'pulse', celebration: 'supernova', skeleton: 'hyperspace-streak', audioClick: 'laser-blip' },
  west: { displayName: 'Wild West', font: 'font-west', surface: 'wood-iron', button: 'branded-leather', border: 'rope-iron', motionIdle: 'sway', celebration: 'dust-storm', skeleton: 'wagon-wheel', audioClick: 'spur-jingle' },
  ocean: { displayName: 'Ocean', font: 'font-ocean', surface: 'coral', button: 'bubble', border: 'kelp-frame', motionIdle: 'drift', celebration: 'bioluminescent-burst', skeleton: 'sonar-ripple', audioClick: 'bubble-pop' },
  jungle: { displayName: 'Jungle', font: 'font-jungle tracking-wider', surface: 'mossy-stone', button: 'vine-wrap', border: 'vine', motionIdle: 'sway', celebration: 'parrot-flock', skeleton: 'vine-grow', audioClick: 'wood-knock' },
  vampire: { displayName: 'Vampire', font: 'font-vampire tracking-wider', surface: 'black-marble', button: 'velvet-pill', border: 'gothic-arch', motionIdle: 'flicker', celebration: 'bat-swarm', skeleton: 'candle-flicker', audioClick: 'velvet-tap' },
  ninja: { displayName: 'Ninja', font: 'font-ninja', surface: 'dark-wood-paper', button: 'seal-stamp', border: 'ink-brush', motionIdle: 'drift', celebration: 'cherry-blossom-storm', skeleton: 'ink-bleed', audioClick: 'sword-tap' },
};
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `npx vitest run --project client src/utils/themeManifesto.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit.**

```bash
git add src/utils/themeManifesto.ts src/utils/themeManifesto.test.ts
git commit -m "feat(theme): add typed manifesto for 8 themes"
```

---

### Task 5: Create the `useTheme` hook

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/hooks/useTheme.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/hooks/useTheme.test.tsx` with:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns the sweets manifesto when data-theme is "sweets"', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
    expect(result.current.surface).toBe('pillowy-glass');
  });

  it('returns the ninja manifesto when data-theme is "ninja"', () => {
    document.documentElement.setAttribute('data-theme', 'ninja');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Ninja');
    expect(result.current.surface).toBe('dark-wood-paper');
  });

  it('falls back to sweets when no data-theme is set', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
  });

  it('falls back to sweets when data-theme is an unknown value', () => {
    document.documentElement.setAttribute('data-theme', 'mystery');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/hooks/useTheme.test.tsx`
Expected: FAIL with "Cannot find module './useTheme'".

- [ ] **Step 3: Implement the hook.**

Create `src/hooks/useTheme.ts` with:

```typescript
import { useEffect, useState } from 'react';
import { themeManifesto, type ThemeType, type Manifesto, THEME_NAMES } from '../utils/themeManifesto';

const DEFAULT_THEME: ThemeType = 'sweets';

function readCurrentTheme(): ThemeType {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr && (THEME_NAMES as string[]).includes(attr)) return attr as ThemeType;
  return DEFAULT_THEME;
}

/**
 * Returns the current theme's manifesto. Re-runs on data-theme attribute
 * changes via a MutationObserver so consumers re-render when the theme
 * switches mid-session (lobby ↔ game pages).
 */
export function useTheme(): Manifesto {
  const [theme, setTheme] = useState<ThemeType>(() => readCurrentTheme());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = readCurrentTheme();
      setTheme(prev => (prev === next ? prev : next));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return themeManifesto[theme];
}
```

- [ ] **Step 4: Run to verify it passes.**

Run: `npx vitest run --project client src/hooks/useTheme.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit.**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.tsx
git commit -m "feat(theme): useTheme hook reads current data-theme manifesto"
```

---

### Task 6: Create the `useMotion` hook (reduced-motion fallback)

**Files:**
- Create: `src/hooks/useMotion.ts`
- Create: `src/hooks/useMotion.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/hooks/useMotion.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMotion } from './useMotion';

function mockReducedMotion(value: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? value : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useMotion', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('returns shouldAnimate=true when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('returns shouldAnimate=false when prefers-reduced-motion: reduce', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('exposes the standard duration constants', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.durations.instant).toBe(100);
    expect(result.current.durations.quick).toBe(250);
    expect(result.current.durations.standard).toBe(400);
    expect(result.current.durations.slow).toBe(1200);
    expect(result.current.durations.spin).toBe(2500);
  });

  it('motionVariant returns the full variant when shouldAnimate is true', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.motionVariant({ x: 100 }, { x: 0 })).toEqual({ x: 100 });
  });

  it('motionVariant returns the reduced variant when shouldAnimate is false', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    expect(result.current.motionVariant({ x: 100 }, { x: 0 })).toEqual({ x: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/hooks/useMotion.test.tsx`
Expected: FAIL with "Cannot find module './useMotion'".

- [ ] **Step 3: Implement.**

Create `src/hooks/useMotion.ts` with:

```typescript
import { useEffect, useState } from 'react';

const DURATIONS = {
  instant: 100,
  quick: 250,
  standard: 400,
  slow: 1200,
  spin: 2500,
} as const;

interface MotionApi {
  shouldAnimate: boolean;
  durations: typeof DURATIONS;
  /**
   * Pick between two variants based on the user's reduced-motion preference.
   * Useful for Framer Motion `animate` props or any branched motion config.
   */
  motionVariant: <T>(full: T, reduced: T) => T;
}

/**
 * Centralised reduced-motion handling. Components that animate should read
 * `shouldAnimate` (or call `motionVariant`) instead of using Framer Motion
 * defaults directly, so the OS preference is respected uniformly.
 */
export function useMotion(): MotionApi {
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setShouldAnimate(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    shouldAnimate,
    durations: DURATIONS,
    motionVariant: <T,>(full: T, reduced: T) => (shouldAnimate ? full : reduced),
  };
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/hooks/useMotion.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit.**

```bash
git add src/hooks/useMotion.ts src/hooks/useMotion.test.tsx
git commit -m "feat(motion): useMotion hook with prefers-reduced-motion fallback"
```

---

### Task 7: Migrate `getThemeStyles` callers to `useTheme().font`, then delete `themeStyles.ts`

**Files:**
- Modify: `src/components/Lobby.tsx`, `src/components/Games/Slots.tsx`, `src/components/Games/Roulette.tsx`, `src/components/Games/Bingo.tsx`, plus any other call sites
- Delete: `src/utils/themeStyles.ts`

- [ ] **Step 1: List every `getThemeStyles` import and call site.**

Run: `grep -rn "getThemeStyles\|themeStyles" src/ --include="*.ts" --include="*.tsx"`
Expected: imports in Lobby, Slots, Roulette, Bingo, and possibly App.tsx (for `lightThemes`/`darkThemes`); the source file `src/utils/themeStyles.ts`.

- [ ] **Step 2: Note every other export of `themeStyles.ts` (besides `getThemeStyles`).**

Run: `cat src/utils/themeStyles.ts`
Expected: exports `lightThemes`, `darkThemes`, `getThemeStyles`. App.tsx uses `lightThemes`/`darkThemes` for the (now obsolete) light/dark mode derivation.

The `lightThemes`/`darkThemes` arrays were removed from App.tsx in Task 3 (the `currentTheme` derivation no longer uses them). Confirm with: `grep -n "lightThemes\|darkThemes" src/App.tsx`. Expected: no matches (or only the import line, which we'll delete next).

- [ ] **Step 3: For each call site, replace `getThemeStyles(theme).font` with `useTheme().font`. Add `import { useTheme } from '../../hooks/useTheme'` (adjust path depth) and remove the `getThemeStyles` import.**

For `src/components/Games/Slots.tsx`:
- Remove: `import { getThemeStyles } from '../../utils/themeStyles';`
- Remove: `const themeStyles = getThemeStyles(theme);`
- Add: `import { useTheme } from '../../hooks/useTheme';`
- Add inside the component body: `const { font: themeFont } = useTheme();`
- Replace every `themeStyles.font` with `themeFont`.

Apply the same pattern to `src/components/Games/Roulette.tsx` and `src/components/Games/Bingo.tsx`.

For `src/components/Lobby.tsx`:
- Remove: `import { getThemeStyles } from '../utils/themeStyles';`
- Replace `getThemeStyles(game.theme).font` (inside the `.map`) with: read the manifesto directly without using the hook (since we're iterating per-game). Use: `themeManifesto[game.theme as ThemeType].font`. Add: `import { themeManifesto, type ThemeType } from '../utils/themeManifesto';`.

For `src/App.tsx`: remove `import { lightThemes, darkThemes } from './utils/themeStyles';` (any remaining import of those exports).

- [ ] **Step 4: Delete `src/utils/themeStyles.ts`.**

```bash
git rm src/utils/themeStyles.ts
```

- [ ] **Step 5: Run lint + tests.**

Run: `npm run lint && npm test`
Expected: lint exit 0; all 97 tests pass (no test changes; this is a mechanical refactor).

- [ ] **Step 6: Commit.**

```bash
git add -u
git commit -m "refactor(theme): migrate getThemeStyles callers to useTheme; remove themeStyles.ts"
```

---

### Task 8: Create `ThemedSkeleton` component

**Files:**
- Create: `src/components/Themed/ThemedSkeleton.tsx`
- Create: `src/components/Themed/ThemedSkeleton.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/components/Themed/ThemedSkeleton.test.tsx` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedSkeleton } from './ThemedSkeleton';

describe('ThemedSkeleton', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} without crashing`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedSkeleton aspectRatio="3/4" data-testid="sk" />);
      expect(screen.getByTestId('sk')).toBeInTheDocument();
    });
  });

  it('reflects the skeleton variant in a data attribute for visual debugging', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(<ThemedSkeleton aspectRatio="3/4" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveAttribute('data-skeleton-variant', 'unwrap');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Themed/ThemedSkeleton.test.tsx`
Expected: FAIL with "Cannot find module './ThemedSkeleton'".

- [ ] **Step 3: Implement.**

Create `src/components/Themed/ThemedSkeleton.tsx` with:

```typescript
import { useTheme } from '../../hooks/useTheme';
import { useMotion } from '../../hooks/useMotion';
import type { SkeletonVariant } from '../../utils/themeManifesto';

interface ThemedSkeletonProps {
  /** CSS aspect-ratio string (e.g. '3/4', '16/9'). */
  aspectRatio?: string;
  /** Optional fixed width — falls back to 100% of parent. */
  width?: string;
  className?: string;
  'data-testid'?: string;
}

// Variant → animated background. Each variant is a different shimmer/pattern
// that hints at the per-theme loading style. Concrete art (e.g. an actual
// candy unwrap animation) can replace these later; this baseline gives each
// theme a distinct look during loading.
const VARIANT_STYLES: Record<SkeletonVariant, React.CSSProperties> = {
  unwrap:           { background: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.5) 50%, rgba(236,72,153,0.2) 100%)', borderRadius: '24px' },
  'hieroglyph-fade':{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.4) 50%, rgba(251,191,36,0.15) 100%)', borderRadius: '4px' },
  'hyperspace-streak':{ background: 'linear-gradient(90deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.5) 50%, rgba(99,102,241,0.1) 100%)', borderRadius: '6px', boxShadow: '0 0 16px rgba(99,102,241,0.4)' },
  'wagon-wheel':    { background: 'linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(217,119,6,0.45) 50%, rgba(217,119,6,0.18) 100%)', borderRadius: '0' },
  'sonar-ripple':   { background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.1) 70%)', borderRadius: '24px 24px 6px 6px' },
  'vine-grow':      { background: 'linear-gradient(135deg, rgba(132,204,22,0.18) 0%, rgba(132,204,22,0.45) 50%, rgba(132,204,22,0.18) 100%)', borderRadius: '14px 4px 14px 4px' },
  'candle-flicker': { background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.4) 0%, rgba(31,41,55,0.6) 70%)', borderRadius: '0 16px 0 16px' },
  'ink-bleed':      { background: 'linear-gradient(135deg, rgba(71,85,105,0.2) 0%, rgba(251,191,36,0.3) 50%, rgba(71,85,105,0.2) 100%)', borderRadius: '4px' },
};

export function ThemedSkeleton({ aspectRatio, width = '100%', className, 'data-testid': testId }: ThemedSkeletonProps) {
  const theme = useTheme();
  const motion = useMotion();
  const baseStyle = VARIANT_STYLES[theme.skeleton];
  const animationStyle: React.CSSProperties = motion.shouldAnimate
    ? { backgroundSize: '200% 100%', animation: `themed-skeleton-shimmer 1.5s linear infinite` }
    : {};
  const style: React.CSSProperties = {
    ...baseStyle,
    ...animationStyle,
    width,
    aspectRatio: aspectRatio ?? 'auto',
  };

  return (
    <>
      <style>{`@keyframes themed-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
      <div
        data-testid={testId}
        data-skeleton-variant={theme.skeleton}
        className={className}
        style={style}
      />
    </>
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Themed/ThemedSkeleton.test.tsx`
Expected: PASS, 9 tests (8 themes + the variant attribute test).

- [ ] **Step 5: Commit.**

```bash
git add src/components/Themed/ThemedSkeleton.tsx src/components/Themed/ThemedSkeleton.test.tsx
git commit -m "feat(themed): ThemedSkeleton with 8 per-theme loading variants"
```

---

### Task 9: Create `ThemedCard` component

**Files:**
- Create: `src/components/Themed/ThemedCard.tsx`
- Create: `src/components/Themed/ThemedCard.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/components/Themed/ThemedCard.test.tsx` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedCard } from './ThemedCard';

describe('ThemedCard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the surface variant attribute`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedCard data-testid="c">child</ThemedCard>);
      const el = screen.getByTestId('c');
      expect(el).toHaveAttribute('data-surface-variant');
      expect(el.getAttribute('data-surface-variant')).toBeTruthy();
      expect(el).toHaveTextContent('child');
    });
  });

  it('fires onClick when clicked', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedCard onClick={() => clicked++} data-testid="c">x</ThemedCard>);
    fireEvent.click(screen.getByTestId('c'));
    expect(clicked).toBe(1);
  });

  it('does not fire onClick when disabled', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedCard onClick={() => clicked++} disabled data-testid="c">x</ThemedCard>);
    fireEvent.click(screen.getByTestId('c'));
    expect(clicked).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Themed/ThemedCard.test.tsx`
Expected: FAIL with "Cannot find module './ThemedCard'".

- [ ] **Step 3: Implement.**

Create `src/components/Themed/ThemedCard.tsx` with:

```typescript
import { type ReactNode, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { SurfaceVariant } from '../../utils/themeManifesto';

interface ThemedCardProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

// Each surface variant defines the per-theme card chrome — base background,
// border treatment, shadow stack. Theme color tokens come from CSS custom
// properties set in src/index.css (--theme-primary etc.) so the same variant
// adopts the active theme's palette.
const SURFACE_STYLES: Record<SurfaceVariant, CSSProperties> = {
  'pillowy-glass':   { background: 'linear-gradient(180deg, rgba(255,255,255,0.95), var(--theme-card))', borderRadius: '24px', boxShadow: '0 0 0 4px white, 0 0 0 6px var(--theme-primary), 0 6px 0 var(--theme-secondary), 0 12px 24px rgba(0,0,0,0.3)' },
  parchment:         { background: 'linear-gradient(180deg, rgba(254,243,199,0.95), rgba(180,83,9,0.4))', borderRadius: '4px 4px 8px 8px', borderTop: '2px solid var(--theme-accent)', boxShadow: '0 4px 0 rgba(0,0,0,0.3)' },
  holographic:       { background: 'linear-gradient(180deg, rgba(99,102,241,0.2), rgba(30,27,75,0.5))', borderRadius: '6px', border: '1px solid var(--theme-primary)', boxShadow: '0 0 20px var(--theme-primary), inset 0 0 12px rgba(99,102,241,0.3)' },
  'wood-iron':       { background: 'linear-gradient(180deg, rgba(217,119,6,0.7), rgba(69,26,3,0.85))', borderRadius: '0', border: '3px solid var(--theme-primary)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4), 0 4px 0 rgba(0,0,0,0.3)' },
  coral:             { background: 'radial-gradient(ellipse at bottom, rgba(6,182,212,0.4), rgba(8,47,73,0.85))', borderRadius: '50% 50% 8px 8px / 30% 30% 8px 8px', borderTop: '1px solid var(--theme-accent)' },
  'mossy-stone':     { background: 'linear-gradient(135deg, rgba(101,163,13,0.4), rgba(20,83,45,0.85))', borderRadius: '14px 4px 14px 4px', border: '2px solid var(--theme-primary)' },
  'black-marble':    { background: 'radial-gradient(ellipse at center, rgba(31,41,55,0.85), rgba(10,10,10,0.95))', borderRadius: '0 16px 0 16px', borderTop: '1px solid var(--theme-primary)', boxShadow: '0 0 16px rgba(220,38,38,0.4)' },
  'dark-wood-paper': { background: 'linear-gradient(180deg, rgba(31,41,55,0.85), rgba(15,23,42,0.95))', borderRadius: '4px', borderTop: '2px solid var(--theme-primary)', borderBottom: '2px solid var(--theme-primary)' },
};

export function ThemedCard({ children, onClick, disabled = false, className, style, 'data-testid': testId }: ThemedCardProps) {
  const theme = useTheme();
  const surfaceStyle = SURFACE_STYLES[theme.surface];
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };
  const interactive = !!onClick && !disabled;

  return (
    <div
      data-testid={testId}
      data-surface-variant={theme.surface}
      onClick={handleClick}
      className={className}
      style={{ ...surfaceStyle, cursor: interactive ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1, ...style }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Themed/ThemedCard.test.tsx`
Expected: PASS, 10 tests (8 themes + onClick + disabled).

- [ ] **Step 5: Commit.**

```bash
git add src/components/Themed/ThemedCard.tsx src/components/Themed/ThemedCard.test.tsx
git commit -m "feat(themed): ThemedCard with 8 per-theme surface variants"
```

---

### Task 10: Create `ThemedButton` component

**Files:**
- Create: `src/components/Themed/ThemedButton.tsx`
- Create: `src/components/Themed/ThemedButton.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/components/Themed/ThemedButton.test.tsx` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedButton } from './ThemedButton';

describe('ThemedButton', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the button variant attribute`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedButton onClick={() => {}}>Click</ThemedButton>);
      const btn = screen.getByRole('button', { name: 'Click' });
      expect(btn).toHaveAttribute('data-button-variant');
    });
  });

  it('fires onClick', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedButton onClick={() => clicked++}>Spin</ThemedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(1);
  });

  it('does not fire onClick when disabled', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedButton onClick={() => clicked++} disabled>Spin</ThemedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(0);
  });

  it('reflects size="hero" in a data attribute', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(<ThemedButton onClick={() => {}} size="hero">Spin</ThemedButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'hero');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Themed/ThemedButton.test.tsx`
Expected: FAIL with "Cannot find module './ThemedButton'".

- [ ] **Step 3: Implement.**

Create `src/components/Themed/ThemedButton.tsx` with:

```typescript
import { type ReactNode, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { ButtonVariant } from '../../utils/themeManifesto';

interface ThemedButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Default = 'standard'; 'hero' = larger primary action button used in game pages. */
  size?: 'standard' | 'hero';
  className?: string;
  type?: 'button' | 'submit';
}

// Each variant carries a per-theme button chrome. Heights/padding scale with
// the size prop. Color tokens read from --theme-* CSS custom properties so
// the same variant adopts the active theme's palette.
function variantStyle(variant: ButtonVariant, size: 'standard' | 'hero'): CSSProperties {
  const padding = size === 'hero' ? '14px 36px' : '10px 22px';
  const fontSize = size === 'hero' ? '22px' : '16px';
  const base: CSSProperties = { padding, fontSize, border: 'none', cursor: 'pointer', color: 'white' };
  switch (variant) {
    case 'gummy-3d':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-accent), var(--theme-primary) 30%, var(--theme-secondary))', borderRadius: '999px', boxShadow: '0 6px 0 var(--theme-secondary), inset 0 2px 0 rgba(255,255,255,0.4)' };
    case 'scarab-cartouche':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-accent)', borderBottomWidth: '4px', clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)', letterSpacing: '0.08em' };
    case 'neon-rim':
      return { ...base, background: 'linear-gradient(180deg, rgba(99,102,241,0.2), rgba(30,27,75,0.4))', color: 'var(--theme-accent)', border: '1px solid var(--theme-primary)', borderRadius: '4px', boxShadow: '0 0 16px var(--theme-primary), inset 0 0 12px rgba(99,102,241,0.2)', letterSpacing: '0.15em' };
    case 'branded-leather':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-accent)', borderRadius: '2px', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4), 0 4px 0 rgba(0,0,0,0.3)' };
    case 'bubble':
      return { ...base, background: 'radial-gradient(ellipse at top, var(--theme-accent), var(--theme-primary) 60%)', color: 'var(--theme-text)', borderRadius: '999px', boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.2), 0 2px 8px rgba(6,182,212,0.4)' };
    case 'vine-wrap':
      return { ...base, background: 'linear-gradient(135deg, var(--theme-secondary), var(--theme-primary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-primary)', borderRadius: '14px 4px 14px 4px' };
    case 'velvet-pill':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'white', borderRadius: '999px', boxShadow: '0 0 12px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' };
    case 'seal-stamp':
      return { ...base, background: 'linear-gradient(180deg, rgba(31,41,55,0.95), rgba(15,23,42,0.95))', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', borderRadius: '4px', boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.5)' };
  }
}

export function ThemedButton({ children, onClick, disabled = false, size = 'standard', className, type = 'button' }: ThemedButtonProps) {
  const theme = useTheme();
  const style = variantStyle(theme.button, size);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-button-variant={theme.button}
      data-size={size}
      className={`${theme.font} ${className ?? ''}`}
      style={{ ...style, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Themed/ThemedButton.test.tsx`
Expected: PASS, 11 tests (8 themes + onClick + disabled + size).

- [ ] **Step 5: Commit.**

```bash
git add src/components/Themed/ThemedButton.tsx src/components/Themed/ThemedButton.test.tsx
git commit -m "feat(themed): ThemedButton with 8 per-theme button variants"
```

---

### Task 11: Extract `useBatchRegenerate` hook from `Profile.tsx`

**Files:**
- Create: `src/hooks/useBatchRegenerate.ts`
- Create: `src/hooks/useBatchRegenerate.test.tsx`
- Modify: `src/components/Profile.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/hooks/useBatchRegenerate.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// AssetManager / MusicManager mocks. The hook calls regenerateAsset/regenerateMusic.
const regenerateAsset = vi.fn();
const regenerateMusic = vi.fn();

vi.mock('../lib/AssetManager', () => ({ regenerateAsset: (k: string) => regenerateAsset(k) }));
vi.mock('../lib/MusicManager', () => ({ regenerateMusic: (t: string, gt: string) => regenerateMusic(t, gt) }));

import { useBatchRegenerate } from './useBatchRegenerate';
import { RegenQuotaExceededError, RateLimitError } from '../lib/errors';

describe('useBatchRegenerate', () => {
  beforeEach(() => {
    regenerateAsset.mockReset();
    regenerateMusic.mockReset();
  });

  it('calls regenerateAsset for every asset key and regenerateMusic for every music pair', async () => {
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    // 81 themed asset keys (8 themes × 10) + bg_main = 81 asset calls
    expect(regenerateAsset).toHaveBeenCalledTimes(81);
    // 24 music pairs (8 themes × 3 game types)
    expect(regenerateMusic).toHaveBeenCalledTimes(24);
  });

  it('updates status as tasks complete', async () => {
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    expect(result.current.status).toBeNull();

    await act(async () => { await result.current.start(); });

    await waitFor(() => {
      // Final status mentions completion count = 81 + 24 = 105
      expect(result.current.status).toMatch(/105\/105/);
    });
  });

  it('reports a quota error when one task throws RegenQuotaExceededError', async () => {
    regenerateAsset.mockRejectedValueOnce(new RegenQuotaExceededError(60));
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    expect(result.current.error).toBe('quota');
  });

  it('reports a rate-limit error when one task throws RateLimitError', async () => {
    regenerateAsset.mockRejectedValueOnce(new RateLimitError(30));
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    expect(result.current.error).toBe('rate-limit');
  });

  it('isRegenerating is true during the run, false after', async () => {
    let resolveAsset: (v: string) => void = () => {};
    regenerateAsset.mockImplementation(() => new Promise((r) => { resolveAsset = r; }));
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());
    expect(result.current.isRegenerating).toBe(false);

    let runPromise!: Promise<void>;
    act(() => { runPromise = result.current.start(); });
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));

    // Resolve all pending asset promises so the run completes.
    resolveAsset('url');
    regenerateAsset.mockResolvedValue('url');
    await act(async () => { await runPromise; });

    expect(result.current.isRegenerating).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/hooks/useBatchRegenerate.test.tsx`
Expected: FAIL with "Cannot find module './useBatchRegenerate'".

- [ ] **Step 3: Implement the hook by extracting the orchestration from `Profile.tsx`.**

Create `src/hooks/useBatchRegenerate.ts` with:

```typescript
import { useState, useCallback } from 'react';
import { regenerateAsset } from '../lib/AssetManager';
import { regenerateMusic } from '../lib/MusicManager';
import { RegenQuotaExceededError, RateLimitError } from '../lib/errors';
import { THEME_NAMES } from '../utils/themeManifesto';

const REGEN_CONCURRENCY = 4;

const ASSET_KEYS = THEME_NAMES.flatMap(theme => [
  `roulette_${theme}`, `slots_${theme}`, `bingo_${theme}`,
  `${theme}_1`, `${theme}_2`, `${theme}_3`, `${theme}_4`,
  `bg_roulette_${theme}`, `bg_slots_${theme}`, `bg_bingo_${theme}`,
]).concat(['bg_main']);

const MUSIC_PAIRS: Array<[string, string]> = THEME_NAMES.flatMap(theme =>
  (['roulette', 'slots', 'bingo'] as const).map(gt => [theme, gt] as [string, string])
);

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export type BatchRegenerateError = 'quota' | 'rate-limit' | 'partial' | null;

interface BatchRegenerateApi {
  start: () => Promise<void>;
  isRegenerating: boolean;
  status: string | null;
  error: BatchRegenerateError;
}

/**
 * Orchestrates the full 105-asset (81 image + 1 bg_main + 24 music) regenerate
 * batch with bounded concurrency (4) so the per-minute generation limit is
 * not exceeded. Reports progress as a status string and classifies failures.
 */
export function useBatchRegenerate(): BatchRegenerateApi {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<BatchRegenerateError>(null);

  const start = useCallback(async () => {
    setIsRegenerating(true);
    setStatus(null);
    setError(null);
    let done = 0;
    const total = ASSET_KEYS.length + MUSIC_PAIRS.length;
    let quotaHit = false;
    let rateLimitHit = false;
    const update = () => setStatus(`${++done}/${total} regenerated`);

    const tasks: Array<() => Promise<unknown>> = [
      ...ASSET_KEYS.map(k => async () => {
        try { const r = await regenerateAsset(k); update(); return r; } catch (err) {
          if (err instanceof RegenQuotaExceededError) quotaHit = true;
          else if (err instanceof RateLimitError) rateLimitHit = true;
          throw err;
        }
      }),
      ...MUSIC_PAIRS.map(([t, gt]) => async () => {
        try { const r = await regenerateMusic(t, gt); update(); return r; } catch (err) {
          if (err instanceof RegenQuotaExceededError) quotaHit = true;
          else if (err instanceof RateLimitError) rateLimitHit = true;
          throw err;
        }
      }),
    ];

    const results = await runWithConcurrency(tasks, REGEN_CONCURRENCY);
    const failures = results.filter(r => r.status === 'rejected').length;

    if (quotaHit) setError('quota');
    else if (rateLimitHit) setError('rate-limit');
    else if (failures > 0) setError('partial');
    else setError(null);

    setStatus(`${total}/${total} regenerated${failures > 0 ? ` · ${failures} failed` : ''}`);
    setIsRegenerating(false);
  }, []);

  return { start, isRegenerating, status, error };
}
```

- [ ] **Step 4: Run to verify the hook tests pass.**

Run: `npx vitest run --project client src/hooks/useBatchRegenerate.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Update `Profile.tsx` to call the hook.**

In `src/components/Profile.tsx`:
- Remove the `runWithConcurrency`, `REGEN_CONCURRENCY`, `ASSET_KEYS`, `MUSIC_PAIRS`, and `handleRegenerateAssets` definitions (the orchestration that's now in the hook).
- Remove `regenerateAsset` and `regenerateMusic` imports (the hook owns those now).
- Add: `import { useBatchRegenerate } from '../hooks/useBatchRegenerate';`
- Inside the component, replace the `useState` for `isRegenerating` and `regenStatus` with a single hook call:

```typescript
const { start: handleRegenerateAssets, isRegenerating, status: regenStatus, error: regenError } = useBatchRegenerate();
```

- Update the JSX where `regenStatus` was a string to handle the new `error` value (e.g. show "Daily quota exceeded — try tomorrow" when `regenError === 'quota'`, show "Rate limit hit — wait a minute" when `regenError === 'rate-limit'`). The existing UI surface that displayed the status string can keep showing `regenStatus`; just add an error banner when `regenError` is non-null.

- [ ] **Step 6: Run the full test suite to confirm Profile still works.**

Run: `npm test`
Expected: all tests pass (existing Profile tests, if any, should still pass; new hook tests pass).

- [ ] **Step 7: Commit.**

```bash
git add src/hooks/useBatchRegenerate.ts src/hooks/useBatchRegenerate.test.tsx src/components/Profile.tsx
git commit -m "refactor(profile): extract useBatchRegenerate hook from Profile.tsx"
```

---

### Task 12: Create `AIPitchStrip` component

**Files:**
- Create: `src/components/Lobby/AIPitchStrip.tsx`
- Create: `src/components/Lobby/AIPitchStrip.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `src/components/Lobby/AIPitchStrip.test.tsx` with:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIPitchStrip } from './AIPitchStrip';

describe('AIPitchStrip', () => {
  it('renders the pitch heading and Gemini 3.1 + Lyria 3 attribution', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status={null} />);
    expect(screen.getByText(/Eight AI-generated casino worlds/i)).toBeInTheDocument();
    expect(screen.getByText(/Gemini 3.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Lyria 3/i)).toBeInTheDocument();
  });

  it('fires onRegenerate when the CTA is clicked', () => {
    let clicked = 0;
    render(<AIPitchStrip onRegenerate={() => clicked++} isRegenerating={false} status={null} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate everything/i }));
    expect(clicked).toBe(1);
  });

  it('disables the CTA when isRegenerating is true', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="3/105 regenerated" />);
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled();
  });

  it('shows the live status string while regenerating', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="47/105 regenerated" />);
    expect(screen.getByText(/47\/105/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Lobby/AIPitchStrip.test.tsx`
Expected: FAIL with "Cannot find module './AIPitchStrip'".

- [ ] **Step 3: Implement.**

Create `src/components/Lobby/AIPitchStrip.tsx` with:

```typescript
interface AIPitchStripProps {
  onRegenerate: () => void;
  isRegenerating: boolean;
  status: string | null;
}

export function AIPitchStrip({ onRegenerate, isRegenerating, status }: AIPitchStripProps) {
  return (
    <div
      className="flex justify-between items-center px-6 py-4 mb-6 rounded-md"
      style={{
        background: 'rgba(251, 191, 36, 0.08)',
        borderLeft: '3px solid var(--theme-accent, #fbbf24)',
      }}
    >
      <div>
        <h2 className="text-lg font-bold m-0">Eight AI-generated casino worlds</h2>
        <p className="text-xs opacity-70 mt-1 m-0">
          {isRegenerating && status
            ? `Re-rolling worlds · ${status} · Lyria 3 composing soundtracks…`
            : 'Powered by Gemini 3.1 (art) + Lyria 3 (music) — generated on demand, fully customisable.'}
        </p>
      </div>
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="px-4 py-2 rounded-md font-bold text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: '#1a1f2e',
        }}
      >
        ♻ Regenerate everything
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Lobby/AIPitchStrip.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Lobby/AIPitchStrip.tsx src/components/Lobby/AIPitchStrip.test.tsx
git commit -m "feat(lobby): AIPitchStrip with regenerate CTA + Gemini 3.1 + Lyria 3 attribution"
```

---

### Task 13: Create `WorldCard` component

**Files:**
- Create: `src/components/Lobby/WorldCard.tsx`
- Create: `src/components/Lobby/WorldCard.test.tsx`

The card shows the Gemini `bg_slots_<theme>` image at full-bleed (with vignette overlay), the theme display name in the manifesto font, and 3 small game-mini-icons (roulette / slots / bingo). Click on an icon → that game; click on the card body → defaults to slots.

- [ ] **Step 1: Write the failing test.**

Create `src/components/Lobby/WorldCard.test.tsx` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { WorldCard } from './WorldCard';

describe('WorldCard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the theme display name`, () => {
      render(<WorldCard theme={theme} bgImageUrl="https://example/bg.png" onSelectGame={() => {}} />);
      expect(screen.getByText(new RegExp(theme === 'sweets' ? 'Sweets' : theme.charAt(0).toUpperCase() + theme.slice(1), 'i'))).toBeInTheDocument();
    });
  });

  it('renders the bg image as the card background source', () => {
    render(<WorldCard theme="sweets" bgImageUrl="https://example/bg.png" onSelectGame={() => {}} data-testid="wc" />);
    const card = screen.getByTestId('wc');
    expect(card.style.backgroundImage).toContain('https://example/bg.png');
  });

  it('clicking the card body selects the slots game by default', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} data-testid="wc" />);
    fireEvent.click(screen.getByTestId('wc'));
    expect(selected).toBe('slots-sweets');
  });

  it('clicking the roulette icon selects the roulette game', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/roulette/i));
    expect(selected).toBe('roulette-sweets');
  });

  it('clicking the bingo icon selects the bingo game', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/bingo/i));
    expect(selected).toBe('bingo-sweets');
  });

  it('clicking a game icon does NOT bubble to the card body click', () => {
    let cardClicks = 0;
    let iconClicks = 0;
    render(
      <WorldCard
        theme="sweets"
        bgImageUrl=""
        onSelectGame={(g) => { if (g.startsWith('slots')) cardClicks++; else iconClicks++; }}
        data-testid="wc"
      />
    );
    fireEvent.click(screen.getByLabelText(/roulette/i));
    expect(iconClicks).toBe(1);
    expect(cardClicks).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Lobby/WorldCard.test.tsx`
Expected: FAIL with "Cannot find module './WorldCard'".

- [ ] **Step 3: Implement.**

Create `src/components/Lobby/WorldCard.tsx` with:

```typescript
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';

type GameType = 'roulette' | 'slots' | 'bingo';

const GAME_ICONS: Record<GameType, string> = {
  roulette: '🎡',
  slots: '🎰',
  bingo: '🎟',
};

interface WorldCardProps {
  theme: ThemeType;
  bgImageUrl: string;
  /** Receives the gameId in the form `<gameType>-<theme>` (e.g. 'slots-sweets'). */
  onSelectGame: (gameId: string) => void;
  'data-testid'?: string;
}

export function WorldCard({ theme, bgImageUrl, onSelectGame, 'data-testid': testId }: WorldCardProps) {
  const m = themeManifesto[theme];
  const gameTypes: GameType[] = ['roulette', 'slots', 'bingo'];

  const handleCardClick = () => onSelectGame(`slots-${theme}`);
  const handleIconClick = (gt: GameType) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectGame(`${gt}-${theme}`);
  };

  return (
    <div
      data-testid={testId}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      className="relative overflow-hidden cursor-pointer flex flex-col justify-end p-3"
      style={{
        aspectRatio: '3 / 4',
        backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'linear-gradient(180deg, var(--theme-secondary), var(--theme-bg))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Vignette overlay for legibility */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="relative z-10 flex justify-between items-end">
        <span
          className={`${m.font} text-white text-2xl`}
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
        >
          {m.displayName}
        </span>
        <div className="flex gap-1">
          {gameTypes.map(gt => (
            <button
              key={gt}
              aria-label={gt}
              onClick={handleIconClick(gt)}
              className="w-8 h-8 rounded flex items-center justify-center text-base bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none cursor-pointer transition-colors"
            >
              {GAME_ICONS[gt]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Lobby/WorldCard.test.tsx`
Expected: PASS, 13 tests (8 themes + bg image + card-click + 2 icon-click + stopPropagation).

- [ ] **Step 5: Commit.**

```bash
git add src/components/Lobby/WorldCard.tsx src/components/Lobby/WorldCard.test.tsx
git commit -m "feat(lobby): WorldCard with bg image, theme name, 3 game icons"
```

---

### Task 14: Create `LobbyGrid` component

**Files:**
- Create: `src/components/Lobby/LobbyGrid.tsx`
- Create: `src/components/Lobby/LobbyGrid.test.tsx`

`LobbyGrid` orchestrates: requests `bg_slots_<theme>` × 8 via `useAssets`, shows themed skeletons for not-yet-loaded cards, renders `WorldCard` for loaded ones.

- [ ] **Step 1: Write the failing test.**

Create `src/components/Lobby/LobbyGrid.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../hooks/useAssets', () => ({
  useAssets: vi.fn(),
}));

import { useAssets } from '../../hooks/useAssets';
import { LobbyGrid } from './LobbyGrid';
import { THEME_NAMES } from '../../utils/themeManifesto';

const mockUseAssets = vi.mocked(useAssets);

describe('LobbyGrid', () => {
  beforeEach(() => {
    mockUseAssets.mockReset();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders 8 placeholder skeletons while loading', () => {
    mockUseAssets.mockReturnValue({ assets: {}, loading: true });
    const { container } = render(<LobbyGrid onSelectGame={() => {}} />);
    const skeletons = container.querySelectorAll('[data-skeleton-variant]');
    expect(skeletons.length).toBe(8);
  });

  it('renders 8 world cards (one per theme) when loaded', () => {
    const assets: Record<string, string> = {};
    THEME_NAMES.forEach(t => { assets[`bg_slots_${t}`] = `https://example/${t}.png`; });
    mockUseAssets.mockReturnValue({ assets, loading: false });
    render(<LobbyGrid onSelectGame={() => {}} />);
    const displayNames = ['Sweets', 'Egypt', 'Space', 'Wild West', 'Ocean', 'Jungle', 'Vampire', 'Ninja'];
    displayNames.forEach(name => expect(screen.getByText(name)).toBeInTheDocument());
  });

  it('passes the per-theme bg URL to each WorldCard', () => {
    const assets: Record<string, string> = {};
    THEME_NAMES.forEach(t => { assets[`bg_slots_${t}`] = `https://example/${t}.png`; });
    mockUseAssets.mockReturnValue({ assets, loading: false });
    const { container } = render(<LobbyGrid onSelectGame={() => {}} />);
    // Each rendered card has a background-image style; verify the sweets card uses the sweets URL.
    const cards = Array.from(container.querySelectorAll('[role="button"]'));
    const sweetsCard = cards.find(c => (c as HTMLElement).style.backgroundImage.includes('sweets.png'));
    expect(sweetsCard).toBeDefined();
  });

  it('requests bg_slots_<theme> for all 8 themes', () => {
    mockUseAssets.mockReturnValue({ assets: {}, loading: true });
    render(<LobbyGrid onSelectGame={() => {}} />);
    expect(mockUseAssets).toHaveBeenCalled();
    const requestedKeys = mockUseAssets.mock.calls[0][0];
    THEME_NAMES.forEach(t => {
      expect(requestedKeys).toContain(`bg_slots_${t}`);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run --project client src/components/Lobby/LobbyGrid.test.tsx`
Expected: FAIL with "Cannot find module './LobbyGrid'".

- [ ] **Step 3: Implement.**

Create `src/components/Lobby/LobbyGrid.tsx` with:

```typescript
import { useMemo } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { WorldCard } from './WorldCard';
import { ThemedSkeleton } from '../Themed/ThemedSkeleton';

interface LobbyGridProps {
  onSelectGame: (gameId: string) => void;
}

export function LobbyGrid({ onSelectGame }: LobbyGridProps) {
  const assetKeys = useMemo(() => THEME_NAMES.map(t => `bg_slots_${t}`), []);
  const { assets, loading } = useAssets(assetKeys);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto px-2">
        {THEME_NAMES.map((t: ThemeType) => (
          // The skeleton reads its variant from the *current* document data-theme,
          // not the per-card theme — wrap each in a per-theme data-attribute scope
          // so each placeholder gets its own themed shimmer.
          <div key={t} data-theme={t} className="contents">
            <SkeletonForTheme theme={t} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto px-2">
      {THEME_NAMES.map((t: ThemeType) => (
        <WorldCard
          key={t}
          theme={t}
          bgImageUrl={assets[`bg_slots_${t}`] ?? ''}
          onSelectGame={onSelectGame}
        />
      ))}
    </div>
  );
}

// `ThemedSkeleton` reads the document-level data-theme attribute. For
// per-card distinct skeletons in the lobby we'd need a per-card theme
// scope, which `useTheme` doesn't currently support. Plan 1 ships a
// theme-neutral shimmer here — fidelity polish (per-card themed
// shimmers) lands as a follow-up after Plan 2 introduces per-element
// theme scoping (or by passing a `theme` prop into `ThemedSkeleton`).
function SkeletonForTheme({ theme: _theme }: { theme: ThemeType }) {
  return (
    <div
      data-skeleton-variant="neutral"
      style={{
        aspectRatio: '3 / 4',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
        backgroundSize: '200% 100%',
        animation: 'themed-skeleton-shimmer 1.5s linear infinite',
        borderRadius: '12px',
      }}
    />
  );
}
```

- [ ] **Step 4: Run to verify.**

Run: `npx vitest run --project client src/components/Lobby/LobbyGrid.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Lobby/LobbyGrid.tsx src/components/Lobby/LobbyGrid.test.tsx
git commit -m "feat(lobby): LobbyGrid with 8 themed world cards + skeleton loading"
```

---

### Task 15: Replace `Lobby.tsx` body with the new layout + fix the "5×5" copy

**Files:**
- Modify: `src/components/Lobby.tsx`

- [ ] **Step 1: Read the current Lobby.tsx structure.**

Run: `cat src/components/Lobby.tsx | head -50`
Expected: confirm the existing imports + interface.

- [ ] **Step 2: Replace the Lobby component body.**

In `src/components/Lobby.tsx`:
- Remove imports: `motion` from `motion/react`, `useAssets` (still needed indirectly), `getThemeStyles` (already removed in Task 7), `GAME_REGISTRY` (no longer needed), `useMemo` (if no longer needed).
- Remove the `themes`, `assetKeys`, `games`, `groupBy`, `gameCategories` state and derivations.
- Remove the `if (loading) return ...` block (LobbyGrid handles its own loading).
- Replace the entire return with:

```typescript
import { AIPitchStrip } from './Lobby/AIPitchStrip';
import { LobbyGrid } from './Lobby/LobbyGrid';
import { useBatchRegenerate } from '../hooks/useBatchRegenerate';
import { GameType } from '../App';

interface LobbyProps {
  onSelectGame: (game: GameType) => void;
}

export function Lobby({ onSelectGame }: LobbyProps) {
  const { start: handleRegenerate, isRegenerating, status: regenStatus } = useBatchRegenerate();

  return (
    <div className="w-full max-w-7xl mx-auto mt-6 px-4">
      <AIPitchStrip
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        status={regenStatus}
      />
      <LobbyGrid onSelectGame={(gameId) => onSelectGame(gameId as GameType)} />
    </div>
  );
}
```

- [ ] **Step 3: Run lint + tests.**

Run: `npm run lint && npm test`
Expected: lint exit 0; all tests pass.

- [ ] **Step 4: Commit.**

```bash
git add src/components/Lobby.tsx
git commit -m "feat(lobby): wire AIPitchStrip + LobbyGrid into the Lobby route"
```

---

### Task 16: Manual browser verification

**Files:** none — visual check only.

- [ ] **Step 1: Start the dev servers.**

In two terminals:
- Terminal 1: `npm run dev:server`
- Terminal 2: `npm run dev`

Open http://localhost:3000 (or the Cloud Shell preview URL on port 3000).

- [ ] **Step 2: Verify the lobby renders.**

Expected:
- AI pitch strip visible at the top with "Eight AI-generated casino worlds" + "Powered by Gemini 3.1 (art) + Lyria 3 (music)" + "♻ Regenerate everything" CTA.
- 8 world cards in a 2×4 (mobile) or 4×2 (desktop) grid. Each shows the `bg_slots_<theme>` Gemini-generated image.
- Each card shows the theme display name in the theme's display font (Chewy for sweets, Cinzel for egypt, Orbitron for space, etc.).
- Each card shows 3 game-mini-icons (🎡 🎰 🎟) at the bottom-right.
- During the initial load, 8 themed skeletons render in the same grid positions.

- [ ] **Step 3: Verify clicks navigate.**

- Click a world card body → navigates to `/game/slots-<theme>`.
- Click a roulette icon → navigates to `/game/roulette-<theme>`.
- Click a bingo icon → navigates to `/game/bingo-<theme>`.

(The game pages still use the old chrome — that's expected; Plan 2 redesigns them. Plan 1 only redesigns the lobby.)

- [ ] **Step 4: Verify "Regenerate everything" works.**

- Click the CTA. The button disables; the sub-line changes to show progress (e.g. "Re-rolling worlds · 12/105 regenerated · Lyria 3 composing soundtracks…").
- Wait for completion (~3-4 min). The status shows the final count. No error banner.

(If the per-day regen quota is low or already consumed, the error path may trigger — that's fine to verify too.)

- [ ] **Step 5: Verify per-theme CSS tokens load.**

- Navigate from lobby → `/game/slots-sweets`. Inspect the `<html>` element in DevTools — `data-theme="sweets"` should be set.
- Navigate to `/game/slots-vampire`. `data-theme="vampire"`. The body's `--theme-bg` etc. CSS custom properties should reflect the vampire palette.

- [ ] **Step 6: Verify the existing game pages still work (regression check).**

- Click a game card → game page loads. The slot machine / roulette wheel / bingo card render with the OLD layout but using the new manifesto.font where appropriate (no visual regression in the old chrome).

If any of the above checks fail, fix in place before committing the next task.

---

### Task 17: Final lint + test + push

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite.**

Run: `npm test`
Expected: all tests pass (97 existing + ~50 new).

- [ ] **Step 2: Run lint.**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 3: Verify git status is clean apart from any docs changes you might have made.**

Run: `git status --short`
Expected: empty (or only this plan / docs changes).

- [ ] **Step 4: Push.**

Run: `git push origin main`
Expected: a list of commits successfully pushed.

- [ ] **Step 5: Smoke-test prod after deploy.**

Run: `./deploy/deploy.sh deploy` (or whatever the user prefers — pause to ask before deploying if the user hasn't authorised a production push as part of this plan).

Open the prod URL, verify the lobby renders the new layout. Spot-check 1-2 themes navigating to game pages.

---

## Self-review

After completing all tasks, the engineer should have:

- A typed theme manifesto with all 8 themes specified across 8 token categories.
- Three themed atom components (`ThemedCard`, `ThemedSkeleton`, `ThemedButton`) that switch on the manifesto and render distinct per-theme variants.
- A `useTheme` hook reading `<html data-theme>` and a `useMotion` hook respecting `prefers-reduced-motion`.
- A `useBatchRegenerate` hook extracted from `Profile.tsx` and reused by the lobby's regenerate CTA.
- A redesigned lobby with an AI pitch strip + 8 themed world cards + per-card themed skeletons + per-card click handlers (card body → slots, icons → specific game).
- All 8 themes set their actual name as `data-theme` instead of the old `light`/`dark` collapsing.
- Per-theme color custom properties in `src/index.css` for all 8 themes.
- The "5×5 card" copy fix delivered as part of replacing the Lobby body (the old description text is removed entirely with the welcome paragraph).
- `themeStyles.ts` deleted; all callers migrated.

The existing game pages (Slots / Roulette / Bingo) keep working unchanged. Plans 2-6 will rewrite them.

**Spec coverage check** (against `2026-05-07-themed-immersive-redesign-design.md`):
- Section 1 (Theme tokens) — fully delivered: manifesto, useTheme, themed atoms (3 of the 4 — ThemedCelebration is Plan 6).
- Section 2 (Lobby) — fully delivered: pitch strip, 8 world cards, themed skeletons, regenerate CTA.
- Section 3 (Chrome) — deferred to Plan 2.
- Sections 4-6 (Surfaces) — deferred to Plans 3-5.
- Section 7 (Win/loss) — deferred to Plan 6.
- Section 8 (Cross-cutting) — typography/spacing/motion tokens delivered (Tasks 1-3, 6); themed loading delivered for the lobby (Tasks 8, 14); a11y/responsive/CES carry into later plans.

**Spec → plan gaps:**
- The lobby loading status line *"Gemini 3.1 generating · 6 / 8 worlds ready · ~30s remaining"* is partially delivered — the progress count works during regenerate, but per-card loading status during the initial fetch is not surfaced (the LobbyGrid just shows skeletons). Acceptable for Plan 1; can be polished in a follow-up if it reads as a gap.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-07-foundation-and-lobby.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with isolated context per task.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
