# Themed Concierge Launcher

Replace the CES messenger's native bubble with a themed React launcher that adapts shape per viewport: a floating dialog card on desktop / tablet, a fixed footer on mobile. Both say "Talk to concierge". Tapping opens the existing CES chat panel.

## Goals

- Replace the closed-state CES bubble with a launcher that matches the rest of the OVG Casino chrome (typography, palette, motion language).
- Adapt automatically across viewports — floating bottom-right card ≥ 768 px, full-width fixed footer < 768 px — without two component implementations.
- Keep all CES messenger functionality (chat panel, session management, agent integrations) intact. Only the closed-state visual is replaced.
- Preserve the Chrome Android hit-testing workaround already shipped in `src/index.css` (the 144 px host box).

## Non-goals

- Restyling the open CES chat panel itself. The panel continues to render as `theme-id="%VITE_CES_THEME_ID%"` configures it.
- Changing CES integration plumbing (token broker, deployment ID, handlebars `game_carousel` template).
- Per-page visibility rules. The launcher appears on every page where the CES bubble appears today.
- Animations beyond standard hover / focus / active states.

## Decisions

| | Decision |
|---|---|
| Desktop visual | Card with avatar circle + "Talk to concierge" title + "Help, tips, anything" subtitle, pinned bottom-right (240 px wide). |
| Mobile visual | Full-width fixed footer with avatar + title + chevron. No subtitle. |
| Theming | Adopts the current page theme via the existing `--theme-card`, `--theme-primary`, `--theme-text` CSS variables. Avatar emoji is theme-specific (e.g. 🍭 sweets, 𓂀 egypt). |
| Breakpoint | `min-width: 768px` (Tailwind's `md`). |
| Open-state | Launcher hides entirely while the CES chat panel is open; reappears on close. |
| Visibility | Render on every route that currently shows the CES bubble. |
| Trigger | Try `cesm.open()` first, fall back to a synthetic click on the `<ces-messenger>` host. |

## Architecture

### New component: `src/components/ConciergeLauncher.tsx`

Standalone React component. Mounted once in `src/App.tsx`'s authenticated render tree, alongside `<AppHeader>` and inside `CelebrationProvider`. Portaled to `document.body` so it sits outside `<main>`'s scrolling container and overlays the page chrome cleanly.

State and effects:

- `isOpen: boolean` — synced with the `ces-chat-open-changed` window event already dispatched by CES (and listened to by `public/ces-init.js`).
- `cesAvailable: boolean` — `true` if `document.querySelector('ces-messenger')` returns a node when the component mounts. When `false` (production builds with `VITE_CES_DEPLOYMENT_ID` empty have the entire `<ces-messenger>` block stripped at build time by `stripCesIfDisabled` in `vite.config.ts`), the component renders nothing.
- Theme is derived per-render from `useLocation().pathname` via the existing `routeToTheme()` helper. No additional context.

Render contract:

- Returns `null` if `!cesAvailable`.
- Returns `null` if `isOpen`.
- Otherwise renders a single `<button class="concierge-launcher">` containing an avatar `<span>`, a text wrapper (title + subtitle), and a chevron `<span aria-hidden>`. The subtitle is in the DOM at all viewports; CSS hides it below the breakpoint.

The avatar map lives in the same file:

```ts
import type { RouteTheme } from '../utils/routeTheme';

const CONCIERGE_AVATARS: Record<RouteTheme, string> = {
  lobby: '✨',
  sweets: '🍭',
  egypt: '𓂀',
  space: '🚀',
  west: '🤠',
  ocean: '🐚',
  jungle: '🌿',
  vampire: '🦇',
  ninja: '🥷',
};
```

`RouteTheme` (= `ThemeType | 'lobby'`, defined in `src/utils/routeTheme.ts`) is the right key type — it covers every value `routeToTheme()` can return, including the `'lobby'` chrome used on non-game routes. Using `Record<RouteTheme, …>` produces a missing-key compile error the moment a new theme is added to `ThemeType` without an avatar — same enforcement style as `themeParticles` and `themeCopy` already use for `Record<ThemeType, …>`.

### Trigger: opening the chat panel

On click, the launcher executes:

```ts
const cesm = document.querySelector('ces-messenger') as HTMLElement & {
  open?: () => void;
} | null;
if (!cesm) return;
if (typeof cesm.open === 'function') {
  cesm.open();
} else {
  cesm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
```

Why both paths: the symmetric `cesm.close()` is already used in `public/ces-init.js`, so an `open()` counterpart is the most likely public API. If it isn't named that (or doesn't exist), dispatching a synthetic click on the host triggers whatever the bubble's own click handler does. Verify which path is needed during implementation by inspecting the upgraded `<ces-messenger>` element's prototype in DevTools; remove the unused branch in a follow-up if `open()` is confirmed.

### CSS changes: `src/index.css`

#### Hide the native bubble

The existing `ces-messenger` rule (which constrains the host to a 144 px box for the Chrome Android hit-test bug) gains two declarations:

```css
ces-messenger {
  /* … existing position / size / overflow / transform — keep all of it … */
  opacity: 0;
  pointer-events: none;
}
ces-messenger.chat-open {
  /* … existing release of width / height / overflow / transform … */
  opacity: 1;
  pointer-events: auto;
}
```

The `.chat-open` class is already toggled by `public/ces-init.js` listening to `ces-chat-open-changed`. No JS change here. The bubble is permanently invisible / non-interactive in the closed state; the chat panel becomes visible the moment CES dispatches the open event.

#### New launcher styles

```css
.concierge-launcher {
  position: fixed;
  z-index: 55;                     /* below CES (60) and AppHeader (50)
                                       — sits above page content, below any
                                       open CES panel */
  /* Mobile: full-width fixed footer */
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--theme-card);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--theme-primary);
  color: var(--theme-text);
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.concierge-launcher:hover { background: color-mix(in srgb, var(--theme-card) 90%, white 10%); }
.concierge-launcher:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }

.concierge-launcher .concierge-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  display: grid; place-items: center;
  font-size: 14px;
  flex-shrink: 0;
}
.concierge-launcher .concierge-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.concierge-launcher .concierge-title { font-size: 13px; font-weight: 600; }
.concierge-launcher .concierge-sub  { font-size: 10px; opacity: 0.7; display: none; }
.concierge-launcher .concierge-chev { margin-left: auto; opacity: 0.5; font-size: 14px; }

@media (min-width: 768px) {
  .concierge-launcher {
    left: auto;
    right: 1.25rem;
    bottom: 1.25rem;
    width: 240px;
    border-top: none;
    border: 1px solid var(--theme-primary);
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }
  .concierge-launcher .concierge-avatar { width: 38px; height: 38px; font-size: 16px; }
  .concierge-launcher .concierge-title  { font-size: 14px; }
  .concierge-launcher .concierge-sub    { display: block; }
  .concierge-launcher .concierge-chev   { display: none; }
}
```

Single class, single responsive flip. The 240 px / 768 px breakpoint match Tailwind v4 defaults; raw CSS is used for the `env(safe-area-inset-bottom)` math (Tailwind v4 doesn't have a built-in utility for this).

### Mobile layout impact

A ~50 pt fixed footer on mobile occludes the bottom of `<main>`. Game pages especially have controls near the bottom (slot spin, roulette bet, bingo daub).

Mitigation: extend `<main>`'s existing className in `src/App.tsx` (currently `w-full mx-auto p-4 md:p-8 …`) with bottom-padding overrides:

```tsx
<main className="… p-4 md:p-8 pb-20 md:pb-8 …">
```

`pb-20` = 5rem ≈ 80 px on mobile, comfortably clears the ~50 pt footer plus the safe-area inset. `md:pb-8` restores the existing 32 px padding on desktop where the floating card doesn't need extra room. Tailwind's arbitrary-value precedence handles the override cleanly without changing the rest of the spacing.

Desktop is fine — the 240 px bottom-right card overlaps roughly the same region the CES bubble currently does, and game UIs already steer clear of that corner.

### `?no-ces=1` diagnostic

The existing `public/ces-init.js` flag hides the CES messenger entirely (`display: none`) when the URL contains `no-ces=1`. To keep this diagnostic useful, the launcher should also disappear when CES is hidden. Implementation: in the `cesAvailable` check, also test `getComputedStyle(cesm).display !== 'none'`. Re-check on the same `ces-messenger-loaded` listener used elsewhere.

### `?natural-ces=1` diagnostic

This flag (in `src/index.css`'s comment header) was added to confirm the Chrome Android bug is in CES, not our position override. After this redesign it loses some signal because our launcher would still cover the bubble region. We don't need to support it forward — the CES-MESSENGER-BUG.md report it produced has already been written. Leaving the existing CSS comment that mentions it is fine.

## Files touched

| File | Change |
|---|---|
| `src/components/ConciergeLauncher.tsx` | New. ~80 lines. |
| `src/components/ConciergeLauncher.test.tsx` | New. Vitest unit tests. |
| `src/App.tsx` | Mount `<ConciergeLauncher />` once inside `CelebrationProvider`. Add `pb-20 md:pb-8` to `<main>`. |
| `src/index.css` | Add `opacity: 0; pointer-events: none` to existing `ces-messenger` block (and the inverse to `.chat-open`). Add `.concierge-launcher` block. |
| `CLAUDE.md` | Add `src/components/ConciergeLauncher.tsx` (the avatar map) to the "adding a theme = touch seven places" list, bumping it to eight. |

## Testing

### Unit tests (`src/components/ConciergeLauncher.test.tsx`)

Vitest + jsdom. Cases:

1. Renders nothing when `<ces-messenger>` is not in the document.
2. Renders the launcher button when `<ces-messenger>` is in the document.
3. Renders nothing after a `ces-chat-open-changed` event with `detail.isOpen: true`.
4. Re-renders the launcher after a subsequent `ces-chat-open-changed` event with `detail.isOpen: false`.
5. Avatar text content matches the theme map for each `RouteTheme` value (parameterised across `[...THEME_NAMES, 'lobby']`, by rendering at routes that resolve to each — e.g. `/game/<id>` for game themes, `/` for lobby).
6. Click invokes `cesm.open()` when the method is present.
7. Click dispatches a click MouseEvent on `cesm` when `open()` is absent.

Hooks under test: `useLocation` is wrapped via `MemoryRouter` per route under test.

### Manual verification (per CLAUDE.md)

- `npm run dev:server` + `npm run dev`, log in.
- Lobby (desktop ≥ 768 px): card visible bottom-right, lobby-violet palette, ✨ avatar.
- Sweets game (desktop): card adopts sweets pink palette, 🍭 avatar.
- Lobby (mobile, DevTools 375 px): full-width footer at bottom, no subtitle, chevron present.
- Egypt game (mobile, with iOS device emulator): footer respects safe-area-inset-bottom; bottom of slot UI not occluded (game content has bottom padding).
- Click the launcher: CES chat panel opens. Launcher disappears.
- Close the chat panel: launcher reappears.
- `?no-ces=1` URL param: neither CES bubble nor launcher visible.
- Tab through page: launcher receives focus with visible focus ring; Enter / Space activates.

### Regression checks

- `npm test` — both projects pass.
- `npm run lint` — no `tsc --noEmit` errors.
- Chrome Android hit-test: tap an off-launcher button on a game page, confirm tap registers (the 144 px host box is unchanged).

## Open questions

- **CES `open()` API name.** Confirmed during implementation by inspecting the live element. Spec assumes `open()` exists; falls back to synthetic click if not.
- **CSP impact.** None expected — we're not adding inline styles, eval, or new external scripts. The existing `unsafe-eval` allowance for CES Handlebars is unaffected.
