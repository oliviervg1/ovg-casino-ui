# Lobby Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch all non-game routes (`/`, `/profile`, `/faq`, `/rules`) from the existing `sweets` light fallback to a dedicated `lobby` palette (near-black `#0a0a0a` + violet `#a78bfa`), and reduce the body-bg overlay so the AI-generated `bg_main` shows through more visibly.

**Architecture:** Three-file change. CSS gets a new `:root[data-theme="lobby"]` palette block plus a body-overlay override. The route-→-theme derivation currently inlined in `App.tsx` moves to a pure function in `src/utils/routeTheme.ts` (TDD-tested). `App.tsx` calls the new function and the default branch returns `'lobby'` instead of `'sweets'`. No `themeManifesto` or `THEME_NAMES` change — the lobby is CSS-only because nothing on lobby/profile/faq/rules renders a themed surface against its own page theme.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind v4 (CSS custom-properties driven), vitest (jsdom client project).

**Spec:** `docs/superpowers/specs/2026-05-13-lobby-dark-theme-design.md`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/index.css` | Add `:root[data-theme="lobby"]` palette + body-overlay override. Two new blocks; no other changes. |
| Create | `src/utils/routeTheme.ts` | Pure function `routeToTheme(pathname: string): RouteTheme`. Maps `/game/<id>` → game theme, `/world/<theme>` → world theme, everything else → `'lobby'`. |
| Create | `src/utils/routeTheme.test.ts` | Co-located vitest unit tests for `routeToTheme`. |
| Modify | `src/App.tsx` | Replace the inline `let currentTheme = 'sweets'` + match block (lines 71–83) with a single call to `routeToTheme(location.pathname)`. Drop the now-unused `THEME_NAMES`, `ThemeType`, and `GAME_REGISTRY` imports (and the dead `export type { ThemeType } from './utils/themeManifesto'` re-export, which has zero consumers in `src/`). Update the comment that calls the fallback "neutral" — it isn't anymore. |

---

## Task 1: Add the `lobby` palette + body-overlay override to `src/index.css`

**Files:**
- Modify: `src/index.css` — append two blocks to the existing `@layer base { ... }` and `body` regions.

This task has no automated test — pure CSS palette additions are visually verified at the end of Task 3 in a real browser. The test for the *route → theme attribute* contract lives in Task 2.

- [ ] **Step 1: Add the new palette block alongside the existing eight**

In `src/index.css`, immediately after the closing brace of the existing `:root[data-theme="ninja"] { ... }` rule (currently around line 139) and before the `body { ... }` rule that follows, insert:

```css
  :root[data-theme="lobby"] {
    --theme-bg: #0a0a0a;
    --theme-bg-rgb: 10, 10, 10;
    --theme-card: rgba(24, 24, 27, 0.75);  /* zinc-900 @ 75% */
    --theme-primary: #a78bfa;              /* violet-400 — accent / borders */
    --theme-secondary: #7c3aed;            /* violet-600 */
    --theme-accent: #c4b5fd;               /* violet-300 — highlights */
    --theme-text: #fafafa;
  }
```

Indentation matches the surrounding `:root[data-theme="..."]` blocks (two-space indent inside `@layer base`).

- [ ] **Step 2: Add the body-overlay override for the lobby case**

In `src/index.css`, immediately after the existing `body { ... }` block (currently ends around line 149, inside `@layer base`), still inside the `@layer base` block, insert:

```css
  :root[data-theme="lobby"] body {
    background-image:
      linear-gradient(rgba(var(--theme-bg-rgb), 0.55), rgba(var(--theme-bg-rgb), 0.7)),
      var(--bg-image);
  }
```

Two-space indent. The selector specificity (`:root[data-theme="lobby"] body` = 0,1,2 vs the generic `body` = 0,0,1) wins, so this overrides only when the document carries `data-theme="lobby"`.

- [ ] **Step 3: Sanity-check the file with the linter**

Run: `npm run lint`
Expected: PASS (the lint task only runs `tsc --noEmit`; CSS isn't type-checked but a syntax error in the file would cause Vite HMR to fail at runtime — caught in Task 3's browser pass).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
feat(css): add lobby data-theme palette + body overlay

New :root[data-theme="lobby"] block (near-black + violet) and a body
background-image override that drops the lobby's bg_main overlay from
0.85-0.95 to 0.55-0.7 so the AI background is visibly atmospheric
instead of barely-visible.

Per docs/superpowers/specs/2026-05-13-lobby-dark-theme-design.md.
EOF
)"
```

---

## Task 2: Extract route-→-theme mapping to a pure function (TDD)

**Files:**
- Create: `src/utils/routeTheme.ts`
- Create: `src/utils/routeTheme.test.ts`

The current logic in `App.tsx` lines 75–83 is a pure function in spirit — `pathname → ThemeType` — but it's inlined, untested, and uses a magic `'sweets'` default. Extracting it lets us test the behavior directly without booting the React tree, and gives the new `'lobby'` default a single home.

- [ ] **Step 1: Write the failing test**

Create `src/utils/routeTheme.test.ts` with the following content:

```ts
import { describe, it, expect } from 'vitest';
import { routeToTheme } from './routeTheme';
import { GAME_REGISTRY } from '../config/games';
import { THEME_NAMES } from './themeManifesto';

describe('routeToTheme', () => {
  it('returns "lobby" for the root path', () => {
    expect(routeToTheme('/')).toBe('lobby');
  });

  it('returns "lobby" for /profile', () => {
    expect(routeToTheme('/profile')).toBe('lobby');
  });

  it('returns "lobby" for /faq (no category)', () => {
    expect(routeToTheme('/faq')).toBe('lobby');
  });

  it('returns "lobby" for /faq/<category>', () => {
    expect(routeToTheme('/faq/games')).toBe('lobby');
  });

  it('returns "lobby" for /rules (no game)', () => {
    expect(routeToTheme('/rules')).toBe('lobby');
  });

  it('returns "lobby" for /rules/<gameId>', () => {
    expect(routeToTheme('/rules/sugar-spin')).toBe('lobby');
  });

  it('returns the game\'s theme for a known /game/:id', () => {
    const sample = GAME_REGISTRY[0];
    expect(routeToTheme(`/game/${sample.id}`)).toBe(sample.theme);
  });

  it('returns the game\'s theme for every entry in GAME_REGISTRY', () => {
    for (const g of GAME_REGISTRY) {
      expect(routeToTheme(`/game/${g.id}`)).toBe(g.theme);
    }
  });

  it('returns "lobby" for an unknown /game/:id', () => {
    expect(routeToTheme('/game/this-id-does-not-exist')).toBe('lobby');
  });

  it('returns the world theme for a known /world/:theme', () => {
    const sample = THEME_NAMES[0];
    expect(routeToTheme(`/world/${sample}`)).toBe(sample);
  });

  it('returns the world theme for every entry in THEME_NAMES', () => {
    for (const t of THEME_NAMES) {
      expect(routeToTheme(`/world/${t}`)).toBe(t);
    }
  });

  it('returns "lobby" for an unknown /world/<garbage>', () => {
    expect(routeToTheme('/world/not-a-theme')).toBe('lobby');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails for the right reason**

Run: `npx vitest run --project client src/utils/routeTheme.test.ts`
Expected: FAIL with `Failed to resolve import "./routeTheme"` (or equivalent — the source module doesn't exist yet).

- [ ] **Step 3: Implement the minimal source module**

Create `src/utils/routeTheme.ts` with this exact content:

```ts
import { GAME_REGISTRY } from '../config/games';
import { THEME_NAMES, type ThemeType } from './themeManifesto';

/** The set of values the document's `data-theme` attribute may carry.
 *  Includes every game theme plus the `'lobby'` chrome used on
 *  non-game routes (lobby, profile, FAQ, rules). */
export type RouteTheme = ThemeType | 'lobby';

/** Derive the page's `data-theme` value from the current pathname.
 *  - `/game/<known-id>`   → that game's theme
 *  - `/world/<known-theme>` → that theme
 *  - anything else (lobby, profile, FAQ, rules, unknown ids) → `'lobby'`. */
export function routeToTheme(pathname: string): RouteTheme {
  const gameMatch = pathname.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    const gameDef = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (gameDef) return gameDef.theme;
  }
  const worldMatch = pathname.match(/^\/world\/(.+)$/);
  if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    return worldMatch[1] as ThemeType;
  }
  return 'lobby';
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run --project client src/utils/routeTheme.test.ts`
Expected: PASS — all 12 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/routeTheme.ts src/utils/routeTheme.test.ts
git commit -m "$(cat <<'EOF'
feat(routing): extract routeToTheme as a pure function

New src/utils/routeTheme.ts owns the pathname → data-theme mapping.
Default branch returns 'lobby' instead of the previous inline 'sweets'
fallback. Co-located test exercises every GAME_REGISTRY entry, every
THEME_NAMES world, both /faq and /rules optional-param shapes, and
unknown-id fallthrough.

App.tsx still uses its own inline copy; wiring follows in the next
commit so this one stays green and pure-functional.
EOF
)"
```

---

## Task 3: Wire `routeToTheme` into `App.tsx`, run full suite, verify in browser

**Files:**
- Modify: `src/App.tsx` (replace inline route-match block + the comment that precedes it)

This is where the user-visible behavior actually flips. After this commit, `/`, `/profile`, `/faq`, `/rules` all carry `data-theme="lobby"` and render with the new dark palette.

- [ ] **Step 1: Update the import block in `src/App.tsx`**

After this task, `App.tsx` no longer references `THEME_NAMES`, `ThemeType`, or `GAME_REGISTRY` inside its module body — the new `routeToTheme` helper owns that logic, and `GameRouteWrapper`'s destructuring of `gameDef.theme` infers `ThemeType` from `getGameById`'s return type without needing the import. With `noUnusedLocals` enabled (per recent commit `0fcdb26`), leaving any of these in would fail lint.

Replace:

```ts
import { THEME_NAMES, type ThemeType } from './utils/themeManifesto';
```

with:

```ts
import { routeToTheme } from './utils/routeTheme';
```

And replace:

```ts
import { getGameById, GAME_REGISTRY } from './config/games';
```

with:

```ts
import { getGameById } from './config/games';
```

**Also delete the dead re-export.** The line `export type { ThemeType } from './utils/themeManifesto';` (just below the imports) has no consumers anywhere in `src/` (verified by `grep -rn "from.*App" --include="*.ts" --include="*.tsx"` — zero matches). Per the project's house style ("If you are certain that something is unused, you can delete it completely" — `CLAUDE.md`), remove this line. Anything that needs `ThemeType` already imports it from `./utils/themeManifesto` directly.

- [ ] **Step 2: Replace the inline route-→-theme block**

In `src/App.tsx`, find this block (currently lines 71–83):

```ts
  // The body theme tracks the current game's theme on game pages, so the
  // per-theme CSS custom properties (sweets / egypt / space / …) apply.
  // On non-game routes (lobby, profile, etc.) we fall back to a neutral
  // default so the page chrome still has theme tokens to read.
  let currentTheme: ThemeType = 'sweets';
  const gameMatch = location.pathname.match(/^\/game\/(.+)$/);
  const worldMatch = location.pathname.match(/^\/world\/(.+)$/);
  if (gameMatch) {
    const gameDef = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (gameDef) currentTheme = gameDef.theme;
  } else if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    currentTheme = worldMatch[1] as ThemeType;
  }
```

Replace with:

```ts
  // The body data-theme tracks the current game's theme on game pages, so
  // the per-theme CSS custom properties (sweets / egypt / …) apply. On
  // non-game routes (lobby, profile, FAQ, rules) it resolves to 'lobby' —
  // the dedicated dark chrome palette defined in src/index.css.
  const currentTheme = routeToTheme(location.pathname);
```

- [ ] **Step 3: Run the lint task and verify it passes**

Run: `npm run lint`
Expected: PASS. With `noUnusedLocals` enabled in `tsconfig.json` (per recent commit `0fcdb26`), this catches any leftover unused identifier from steps 1–2. If lint fails on an unused `ThemeType` or similar, re-check the surrounding code — `ThemeType` is used in `App.tsx` for `GameRouteWrapper`'s typing so it should remain imported.

- [ ] **Step 4: Run the full test suite and verify everything passes**

Run: `npm test`
Expected: PASS — both the `server` and `client` projects, including the new `routeTheme.test.ts`. No existing test references the `'sweets'` default value as a behavioral expectation (verified during planning), so nothing should break.

If any client test fails because it asserts `data-theme === "sweets"` for a non-game route, that was a stale assertion against the old default — update it to expect `"lobby"` and note the change in the commit message.

- [ ] **Step 5: Start the dev servers**

In one terminal: `npm run dev:server`
In another terminal: `npm run dev`

Open the Vite URL printed by `npm run dev` (usually `http://localhost:3000` locally; in Cloud Shell it's a `*.cloudshell.dev` host).

- [ ] **Step 6: Browser-verify the lobby chrome on every affected route**

Sign in (Firebase popup), then walk through the route checklist below. After each, open DevTools → Elements → confirm the `<html>` element has the expected `data-theme` value.

| Visit | Expected `data-theme` | Visual check |
|---|---|---|
| `/` (lobby) | `lobby` | Near-black body bg with `bg_main` showing through faintly. AIPitchStrip border-left is violet (not amber). World cards in the grid look unchanged (each carries its own theme). |
| `/profile` | `lobby` | Near-black body. Avatar ring is violet. Balance card is zinc on near-black. |
| `/faq` | `lobby` | Near-black body. |
| `/rules` | `lobby` | Near-black body. |
| `/game/sugar-spin` | `sweets` | Pink sweets theme — unchanged. |
| `/game/blood-moon-spin` | `vampire` | Vampire theme — unchanged. |
| `/world/egypt` | `egypt` | Egypt theme — unchanged. |

Also confirm:
- The lobby ↔ game route transitions still crossfade smoothly (the existing `body { transition: background-color 0.5s ease, color 0.5s ease }` should produce a 500ms color blend).
- No console errors in the browser DevTools console.
- The "Regenerate everything" button in the AIPitchStrip stays amber (it's hardcoded; only the surrounding border picks up the violet accent).

If anything renders wrong, stop and report — do not commit. Common gotchas:
- If the lobby still shows pink, hard-refresh (Vite HMR sometimes keeps the old CSS).
- If the `bg_main` looks washed out / wrong color, that's because it was generated against a sweets brief. Out of scope for this task; flag in the report and the user can re-roll it via the AIPitchStrip's Regenerate button as a follow-up.
- If the violet feels too purple/too cool, the palette decision can be revisited — but that's a follow-up, not a fix in this task.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
feat(theme): switch non-game routes to the new lobby dark palette

Replaces the inline route-match block in App.tsx with the new
routeToTheme() helper. Lobby, profile, FAQ and rules now carry
data-theme="lobby" and render with the dedicated near-black + violet
palette added in the prior CSS commit. Game and world routes
unchanged.

The previous 'sweets' fallback was a side-effect, not a design choice —
the comment is rewritten accordingly.

Browser-verified: /, /profile, /faq, /rules render dark; /game/* and
/world/* unchanged; lobby↔game crossfades work.

Per docs/superpowers/specs/2026-05-13-lobby-dark-theme-design.md.
EOF
)"
```

---

## Self-review checklist (post-commit, optional)

Before declaring the work done, walk back through the spec and confirm:

| Spec section | Implementation evidence |
|---|---|
| "All non-game routes switch" | `routeToTheme` returns `'lobby'` for everything except `/game/<known>` and `/world/<known>`; covered by tests in Task 2 and browser pass in Task 3. |
| "Near-black + violet palette" | New `:root[data-theme="lobby"]` block in `src/index.css` (Task 1). |
| "Reduce overlay to ~0.6" | New `:root[data-theme="lobby"] body` rule with `0.55 → 0.7` overlay (Task 1). |
| "App.tsx default flips from `sweets` to `lobby`" | `routeToTheme` returns `'lobby'` as default; App.tsx uses it (Tasks 2 + 3). |
| "No `themeManifesto` entry" | Confirmed — no manifesto file is touched in any task. |
| "Tests assert `data-theme` per route" | `routeTheme.test.ts` covers every required pathname (Task 2). |
| "Existing tests still pass" | `npm test` run in Task 3 Step 4. |

If any row is unchecked, that's a real gap — go back and add the missing piece before declaring the work done.
