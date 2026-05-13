# Lobby dark theme — design

**Date:** 2026-05-13
**Status:** Approved (brainstorming)
**Implementation plan:** TBD (next step: writing-plans)

## Problem

`App.tsx` defaults `currentTheme` to `'sweets'` whenever the user is not on a `/game/...` or `/world/...` route. Sweets is the only light palette in the set (pale-pink body bg `#fdf2f8`, dark-purple text `#4c1d95`), so the lobby, profile, FAQ, and rules pages all render with a pink wash that the rest of the app does not share. The user finds this off, and wants a dark treatment for those non-game surfaces.

## Goal

A bespoke dark palette for non-game routes (lobby, profile, FAQ, rules) that:

- reads as deliberate "lobby chrome," not a borrowed game theme;
- continues to surface the AI-generated `bg_main` background (the lobby is partly a showcase for it);
- leaves all themed surfaces (world cards in the grid, game pages, world pages) untouched.

## Non-goals

- Changing the per-game themes or any of the eight `themeManifesto` entries.
- Reworking `bg_main` itself or its prompt.
- Removing the body color/bg transition (the `lobby ↔ game` crossfade is intentional).
- Anything on the pre-login Auth screen (it has its own `bg-gray-900`).
- Theming the AppHeader's font or its `bg-black/20` strip — already universal/dark.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Which surfaces switch? | All non-game routes: `/`, `/profile`, `/faq`, `/rules`. |
| What palette? | Near-black (`#0a0a0a → #000`) with a violet accent (`#a78bfa` family). |
| What about `bg_main`? | Keep it; reduce the body overlay opacity from `0.85–0.95` to `0.55–0.7` so the AI image is visibly atmospheric instead of barely visible. |
| Implementation shape | New `data-theme="lobby"` value, CSS-only palette + body-overlay override; `App.tsx` default flips from `'sweets'` to `'lobby'`. No `themeManifesto` entry. |

### Approaches considered (and rejected)

- **Update `:root {}` CSS defaults and stop setting `data-theme` on non-game routes.** Slightly less code, but the "default" state becomes opinionated rather than a neutral safety net, and intent is less explicit.
- **Add `'lobby'` to the `ThemeType` union with a manifesto entry.** Type-safe everywhere, but overengineered: nothing on the lobby reads the manifesto for the lobby's own theme, and a parallel list (`THEME_NAMES`) would still be needed to keep `'lobby'` out of the game iteration.

## Design

### CSS additions (`src/index.css`)

Add one new theme palette block alongside the existing eight:

```css
:root[data-theme="lobby"] {
  --theme-bg: #0a0a0a;
  --theme-bg-rgb: 10, 10, 10;
  --theme-card: rgba(24, 24, 27, 0.75);  /* zinc-900 @ 75% */
  --theme-primary: #a78bfa;              /* violet-400 */
  --theme-secondary: #7c3aed;            /* violet-600 */
  --theme-accent: #c4b5fd;               /* violet-300 */
  --theme-text: #fafafa;
}
```

And one body-overlay override (specificity beats the generic `body` rule):

```css
:root[data-theme="lobby"] body {
  background-image:
    linear-gradient(rgba(var(--theme-bg-rgb), 0.55), rgba(var(--theme-bg-rgb), 0.7)),
    var(--bg-image);
}
```

Nothing else in `index.css` changes.

### `App.tsx` change

The current block:

```ts
let currentTheme: ThemeType = 'sweets';
const gameMatch = location.pathname.match(/^\/game\/(.+)$/);
const worldMatch = location.pathname.match(/^\/world\/(.+)$/);
if (gameMatch) { /* ... unchanged ... */ }
else if (worldMatch && ...) { /* ... unchanged ... */ }
```

becomes:

```ts
type RouteTheme = ThemeType | 'lobby';
let currentTheme: RouteTheme = 'lobby';
// gameMatch / worldMatch branches unchanged
```

`document.documentElement.setAttribute('data-theme', currentTheme)` already accepts a string, so no other change is needed there.

### Why no `themeManifesto` entry

`useTheme()` reads the `data-theme` attribute and validates against `THEME_NAMES`; for unknown values it falls back to `'sweets'`. With `data-theme="lobby"` set, any consumer of `useTheme()` will receive the sweets manifesto. This is acceptable because no themed surface renders against the lobby's *own* page theme:

- World cards in `LobbyGrid` carry their own `theme` prop and read `themeManifesto[ownTheme]`.
- `ThemedSkeleton` takes a `theme` prop.
- `AIPitchStrip` reads CSS custom properties directly (`var(--theme-accent)`), so it picks up the new violet automatically.

Adding `'lobby'` to the manifesto would not change observable behavior; leaving it out keeps `THEME_NAMES`-driven iteration (lobby grid, regenerate batch, music keys) honest.

## Affected surfaces

| Surface | Today (`sweets`) | Under `lobby` |
|---|---|---|
| Body bg | Pink gradient over `bg_main` @ 0.85–0.95 | Near-black gradient over `bg_main` @ 0.55–0.7 |
| Body text | `#4c1d95` (dark purple) | `#fafafa` (near-white) |
| AppHeader | `bg-black/20` strip + `font-casino` title | Unchanged |
| AIPitchStrip border-left | Amber (sweets accent ≈ amber-ish) | Violet (`#c4b5fd`) |
| AIPitchStrip "Regenerate" button | Amber gradient (hardcoded) | Unchanged (still amber) |
| Profile avatar ring | Pink (`border-theme-primary` → `#ec4899`) | Violet (`#a78bfa`) |
| Profile balance card chrome | White card on pink (`bg-theme-card` + `bg-theme-bg`) | Zinc card on near-black |
| World cards in lobby grid | Each carries own theme | Unchanged |
| Loading skeletons | `ThemedSkeleton theme={t}` per-theme | Unchanged |
| Game / world routes | Themed | Unchanged |

## Tests

- **New test (file name TBD by the plan):** assert that `document.documentElement.getAttribute('data-theme')` resolves correctly per representative route:
  - `/` → `"lobby"`
  - `/profile` → `"lobby"`
  - `/faq` → `"lobby"`
  - `/rules` → `"lobby"`
  - `/game/<known-id>` → that game's theme
  - `/world/<known-theme>` → that theme

  Two implementation shapes are viable; the plan picks one:
  (a) extract the route-→-theme derivation in `App.tsx` into a pure function and unit-test that against the strings above; or
  (b) export `AppContent`, render it inside `MemoryRouter` per route, and read the live attribute from `document.documentElement`.

  Option (a) is smaller and faster; (b) tests integration. Prefer (a) unless something breaks the abstraction.

- **Existing tests** (`LobbyGrid.test.tsx`, `AppHeader.test.tsx`, `WorldPage.test.tsx`, etc.) — none assert color or palette tokens; should pass unchanged. Confirm by running `npm test` after the change.

## Risks

- **Lobby ↔ game crossfade is more visible.** A near-black lobby sliding into a pink sweets game (or vice versa) is a 500ms color transition that wasn't previously a strong visual event. The transition rule already exists (`body { transition: background-color 0.5s ease, color 0.5s ease }`); not changing it. If it feels wrong in the browser pass, adjust duration or easing then — out of scope here.
- **Profile's violet avatar ring + zinc card** — has not been verified in a real browser, only in mockup. If it reads wrong, pick a different `--theme-primary` for the lobby palette as a follow-up; the surface area is contained.
- **`bg_main` was generated for a sweets-y context** — at 0.55–0.7 overlay opacity it now shows through more, and the user may want to regenerate it under a darker brief. Out of scope; flag during browser pass.

## Out of scope (deliberately)

- Bespoke per-theme assets / audio / idle motion.
- Spacing-scale migration.
- CES messenger positioning.
- `prefers-reduced-motion` on roulette spin.
- Removing or refactoring the now-purely-historical "sweets default" mention in any code comments — fold into the change as cleanup, no separate task.

## Implementation footprint

Three files touched in the production build:

1. `src/index.css` — two added blocks.
2. `src/App.tsx` — type widening + default value flip (≈ two lines).
3. `src/App.test.tsx` (new) or extension — one test file.

No new dependencies. No server changes. No `themeManifesto` / `THEME_NAMES` change. No regenerate-batch impact.
