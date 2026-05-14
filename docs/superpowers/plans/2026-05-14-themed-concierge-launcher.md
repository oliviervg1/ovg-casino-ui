# Themed Concierge Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CES messenger's native bubble with a themed React launcher — a floating dialog card on desktop ≥768 px, a fixed footer on mobile — that opens the existing CES chat panel.

**Architecture:** A new portaled React component (`<ConciergeLauncher>`) renders the themed launcher and listens to the `ces-chat-open-changed` event already dispatched by CES. CSS hides the native CES bubble (`opacity: 0; pointer-events: none`) but keeps the `<ces-messenger>` element mounted, so its chat panel still works when our launcher invokes `cesm.open()` (with synthetic-click fallback). The Chrome-Android hit-test workaround (144 px host box) stays untouched.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest + @testing-library/react + jsdom, react-router-dom v7.

**Spec:** `docs/superpowers/specs/2026-05-14-themed-concierge-launcher-design.md`

---

## File Structure

| File | Role |
|---|---|
| `src/components/ConciergeLauncher.tsx` | New. The launcher component: detects `<ces-messenger>`, syncs open-state, derives theme + avatar, handles click. Portaled to `document.body`. |
| `src/components/ConciergeLauncher.test.tsx` | New. Vitest unit tests covering all behaviors. |
| `src/index.css` | Modify. Hide native CES bubble + add `.concierge-launcher` styles. |
| `src/App.tsx` | Modify. Mount `<ConciergeLauncher />` once + extend `<main>`'s padding so the mobile footer doesn't occlude content. |
| `CLAUDE.md` | Modify. Add `ConciergeLauncher.tsx` to the "adding a theme = touch seven places" list (becomes eight). |

---

## Task 1: Test scaffolding + empty component

**Files:**
- Create: `src/components/ConciergeLauncher.tsx`
- Create: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Write the test file with helpers + first failing test**

Create `src/components/ConciergeLauncher.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConciergeLauncher } from './ConciergeLauncher';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ConciergeLauncher />
    </MemoryRouter>
  );
}

function mountCesElement(opts?: {
  open?: () => void;
  display?: string;
}): HTMLElement {
  const cesm = document.createElement('ces-messenger');
  if (opts?.open) (cesm as unknown as { open: () => void }).open = opts.open;
  if (opts?.display) cesm.style.display = opts.display;
  document.body.appendChild(cesm);
  return cesm;
}

afterEach(() => {
  cleanup();
  document.querySelectorAll('ces-messenger').forEach((el) => el.remove());
});

describe('ConciergeLauncher', () => {
  it('renders nothing when no <ces-messenger> is in the document', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, expect failure (component does not exist)**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — module `./ConciergeLauncher` not found.

- [ ] **Step 3: Create the empty component to make the test pass**

Create `src/components/ConciergeLauncher.tsx`:

```tsx
export function ConciergeLauncher() {
  return null;
}
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
test(concierge): scaffold ConciergeLauncher with no-CES base case

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Render launcher when `<ces-messenger>` is present

**Files:**
- Modify: `src/components/ConciergeLauncher.tsx`
- Modify: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Add a failing test for the present case**

Append inside the `describe` block in `src/components/ConciergeLauncher.test.tsx`:

```tsx
  it('renders the launcher button when <ces-messenger> is in the document', () => {
    mountCesElement();
    renderAt('/');
    const button = screen.getByRole('button', { name: /talk to concierge/i });
    expect(button).toBeTruthy();
    expect(button.textContent).toMatch(/Talk to concierge/);
  });

  it('renders title + subtitle text in the DOM (subtitle visibility is CSS-controlled)', () => {
    mountCesElement();
    renderAt('/');
    const button = screen.getByRole('button', { name: /talk to concierge/i });
    expect(button.textContent).toMatch(/Talk to concierge/);
    expect(button.textContent).toMatch(/Help, tips, anything/);
  });
```

- [ ] **Step 2: Run tests, expect the new ones to fail**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — `getByRole` finds no button.

- [ ] **Step 3: Implement the launcher render path**

Replace `src/components/ConciergeLauncher.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
  }, []);

  if (!cesAvailable) return null;

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">✨</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): render launcher when CES is mounted

Detects <ces-messenger> at mount and renders a portaled button. Avatar is
a placeholder; click handler is wired in a follow-up task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Hide while the CES chat panel is open

**Files:**
- Modify: `src/components/ConciergeLauncher.tsx`
- Modify: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Add failing tests for the open-state behavior**

Add `act` to the existing imports in `src/components/ConciergeLauncher.test.tsx`:

```tsx
import { cleanup, render, screen, act } from '@testing-library/react';
```

Append inside the `describe` block:

```tsx
  it('hides the launcher after a ces-chat-open-changed event with isOpen=true', () => {
    mountCesElement();
    renderAt('/');
    expect(screen.getByRole('button', { name: /talk to concierge/i })).toBeTruthy();
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: true } })
      );
    });
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });

  it('re-renders the launcher after a ces-chat-open-changed event with isOpen=false', () => {
    mountCesElement();
    renderAt('/');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: true } })
      );
    });
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: false } })
      );
    });
    expect(screen.getByRole('button', { name: /talk to concierge/i })).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests, expect the new ones to fail**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — launcher does not hide because no event listener is wired.

- [ ] **Step 3: Add the event listener + isOpen state**

Replace `src/components/ConciergeLauncher.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen?: boolean }>).detail;
      setIsOpen(!!detail?.isOpen);
    };
    window.addEventListener('ces-chat-open-changed', handler);
    return () => window.removeEventListener('ces-chat-open-changed', handler);
  }, []);

  if (!cesAvailable || isOpen) return null;

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">✨</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): hide launcher while CES chat panel is open

Subscribes to the ces-chat-open-changed window event already dispatched by
CES (and listened to by public/ces-init.js for the .chat-open class).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Theme-specific avatar

**Files:**
- Modify: `src/components/ConciergeLauncher.tsx`
- Modify: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Add failing tests parameterised across all RouteTheme values**

Append inside the `describe` block in `src/components/ConciergeLauncher.test.tsx`:

```tsx
  describe('theme-specific avatar', () => {
    const cases: Array<[string, string, string]> = [
      // route, expected avatar, theme name
      ['/',                  '✨', 'lobby'],
      ['/profile',           '✨', 'lobby'],
      ['/world/sweets',      '🍭', 'sweets'],
      ['/world/egypt',       '𓂀', 'egypt'],
      ['/world/space',       '🚀', 'space'],
      ['/world/west',        '🤠', 'west'],
      ['/world/ocean',       '🐚', 'ocean'],
      ['/world/jungle',      '🌿', 'jungle'],
      ['/world/vampire',     '🦇', 'vampire'],
      ['/world/ninja',       '🥷', 'ninja'],
    ];

    it.each(cases)('renders %s with the %s avatar (%s)', (route, expectedAvatar) => {
      mountCesElement();
      renderAt(route);
      const button = screen.getByRole('button', { name: /talk to concierge/i });
      const avatar = button.querySelector('.concierge-avatar');
      expect(avatar?.textContent).toBe(expectedAvatar);
    });
  });
```

- [ ] **Step 2: Run tests, expect the new ones to fail**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — every case sees the placeholder `✨`, so non-lobby cases fail.

- [ ] **Step 3: Wire route → theme → avatar**

Replace `src/components/ConciergeLauncher.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { routeToTheme, type RouteTheme } from '../utils/routeTheme';

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

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen?: boolean }>).detail;
      setIsOpen(!!detail?.isOpen);
    };
    window.addEventListener('ces-chat-open-changed', handler);
    return () => window.removeEventListener('ces-chat-open-changed', handler);
  }, []);

  if (!cesAvailable || isOpen) return null;

  const theme = routeToTheme(location.pathname);
  const avatar = CONCIERGE_AVATARS[theme];

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">{avatar}</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 15 tests (5 + 10 parameterised).

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): theme-specific avatar driven by RouteTheme

CONCIERGE_AVATARS map keyed by RouteTheme guarantees a compile error if a
new theme is added without an avatar — same enforcement style as
themeManifesto / themeParticles / themeCopy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Click handler with `open()` preference + synthetic-click fallback

**Files:**
- Modify: `src/components/ConciergeLauncher.tsx`
- Modify: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Add failing tests for both click paths**

Add `vi` and `fireEvent` to the imports in `src/components/ConciergeLauncher.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
```

Append inside the outer `describe` block:

```tsx
  describe('click behavior', () => {
    it('invokes cesm.open() when the method is present', () => {
      const open = vi.fn();
      mountCesElement({ open });
      renderAt('/');
      fireEvent.click(screen.getByRole('button', { name: /talk to concierge/i }));
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('dispatches a click MouseEvent on cesm when open() is absent', () => {
      const cesm = mountCesElement();
      const dispatch = vi.spyOn(cesm, 'dispatchEvent');
      renderAt('/');
      fireEvent.click(screen.getByRole('button', { name: /talk to concierge/i }));
      const calls = dispatch.mock.calls.filter(
        ([e]) => e instanceof MouseEvent && e.type === 'click'
      );
      expect(calls.length).toBe(1);
    });
  });
```

- [ ] **Step 2: Run tests, expect the new ones to fail**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — no click handler attached, so `open` is never called and no synthetic click is dispatched.

- [ ] **Step 3: Add the click handler**

Replace `src/components/ConciergeLauncher.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { routeToTheme, type RouteTheme } from '../utils/routeTheme';

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

type CesMessengerEl = HTMLElement & { open?: () => void };

function openCesPanel() {
  const cesm = document.querySelector('ces-messenger') as CesMessengerEl | null;
  if (!cesm) return;
  if (typeof cesm.open === 'function') {
    cesm.open();
  } else {
    cesm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen?: boolean }>).detail;
      setIsOpen(!!detail?.isOpen);
    };
    window.addEventListener('ces-chat-open-changed', handler);
    return () => window.removeEventListener('ces-chat-open-changed', handler);
  }, []);

  if (!cesAvailable || isOpen) return null;

  const theme = routeToTheme(location.pathname);
  const avatar = CONCIERGE_AVATARS[theme];

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      onClick={openCesPanel}
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">{avatar}</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): click opens CES panel — open() preferred, synthetic click fallback

The CES web component's documented public API for programmatic open is
unverified; cesm.close() is the symmetric counterpart already used in
public/ces-init.js, so cesm.open() is the most likely candidate. Falls
back to dispatching a click on the host so the bubble's own handler runs.
Verify which path is needed during manual browser check; the unused
branch can be pruned in a follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hide the launcher when CES is hidden by `?no-ces=1`

**Files:**
- Modify: `src/components/ConciergeLauncher.tsx`
- Modify: `src/components/ConciergeLauncher.test.tsx`

- [ ] **Step 1: Add a failing test for the display:none case**

Append inside the outer `describe` block in `src/components/ConciergeLauncher.test.tsx`:

```tsx
  it('renders nothing when <ces-messenger> is in the document but display:none', () => {
    mountCesElement({ display: 'none' });
    renderAt('/');
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });
```

- [ ] **Step 2: Run the test, expect it to fail**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: FAIL — element exists, so `cesAvailable` is true; launcher renders.

- [ ] **Step 3: Tighten the availability check**

In `src/components/ConciergeLauncher.tsx`, replace the first `useEffect` with:

```tsx
  useEffect(() => {
    const cesm = document.querySelector('ces-messenger');
    if (!cesm) {
      setCesAvailable(false);
      return;
    }
    // ?no-ces=1 in public/ces-init.js sets display:none on the host. Honour it
    // so the diagnostic continues to hide the entire concierge surface.
    setCesAvailable(getComputedStyle(cesm).display !== 'none');
  }, []);
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run --project client src/components/ConciergeLauncher.test.tsx`
Expected: PASS — 18 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConciergeLauncher.tsx src/components/ConciergeLauncher.test.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): respect ?no-ces=1 — hide launcher when CES host is display:none

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Run full lint + tests + commit checkpoint

- [ ] **Step 1: Run the full type check**

Run: `npm run lint`
Expected: zero errors. If `tsc --noEmit` flags `ConciergeLauncher.tsx` (e.g. unused import), fix and re-run before continuing.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: both projects pass. The new ConciergeLauncher tests appear in the client project's count.

If anything fails outside the new test file, stop — investigate before continuing. The component is portaled to `document.body`, so it could in principle bleed into other tests' DOM state if `cleanup()` isn't called; the `afterEach` block already handles this, but verify by running just the suite that fails in isolation.

- [ ] **Step 3: No commit needed** — code is already committed.

---

## Task 8: Add launcher CSS to `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Read the existing `ces-messenger` block to know the surrounding context**

Run: `grep -n "ces-messenger\|wiggle-shake" src/index.css`
Note the line numbers so the next edit lands cleanly.

- [ ] **Step 2: Insert the launcher styles directly below the existing `ces-messenger.chat-open { … }` block**

After the existing `ces-messenger.chat-open { … }` rule and before the `@keyframes wiggle-shake { … }` block, insert:

```css

/* Themed concierge launcher — replaces the CES native bubble's closed state.
   Mobile (< 768px): full-width fixed footer flush with the bottom edge.
   Desktop (>= 768px): floating dialog card pinned bottom-right.
   Theming pulls live from the page's data-theme variables (--theme-card,
   --theme-primary, --theme-text, --theme-secondary, --theme-accent), so a
   new theme's launcher styling needs no additional CSS — only an avatar
   entry in CONCIERGE_AVATARS. */
.concierge-launcher {
  position: fixed;
  z-index: 55;
  /* Mobile-first: full-width fixed footer */
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--theme-card);
  backdrop-filter: blur(10px);
  border: 0;
  border-top: 1px solid var(--theme-primary);
  color: var(--theme-text);
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.concierge-launcher:hover {
  background: color-mix(in srgb, var(--theme-card) 88%, white 12%);
}
.concierge-launcher:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}
.concierge-launcher .concierge-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  display: grid;
  place-items: center;
  font-size: 14px;
  flex-shrink: 0;
}
.concierge-launcher .concierge-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.concierge-launcher .concierge-title {
  font-size: 13px;
  font-weight: 600;
}
.concierge-launcher .concierge-sub {
  font-size: 10px;
  opacity: 0.7;
  display: none; /* hidden on mobile — surfaced at >= 768px */
}
.concierge-launcher .concierge-chev {
  margin-left: auto;
  opacity: 0.5;
  font-size: 14px;
}

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
  .concierge-launcher .concierge-avatar {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .concierge-launcher .concierge-title {
    font-size: 14px;
  }
  .concierge-launcher .concierge-sub {
    display: block;
  }
  .concierge-launcher .concierge-chev {
    display: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
style(concierge): add .concierge-launcher styles — mobile footer + desktop card

Single class with one media-query flip. Theming reads live from the page's
--theme-* CSS variables so adding a theme requires no CSS change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Mount in `App.tsx` + add bottom padding to `<main>`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read the current App.tsx render tree**

Run: `grep -n "AppHeader\|ConciergeLauncher\|<main\|CelebrationProvider" src/App.tsx`
You should see the existing `<AppHeader profile={profile} onLogout={logout} />` line and the `<main className="w-full mx-auto p-4 md:p-8 …">` line.

- [ ] **Step 2: Add the import**

In `src/App.tsx`, add to the imports near the other component imports (right under `import { AppHeader }`):

```tsx
import { ConciergeLauncher } from './components/ConciergeLauncher';
```

- [ ] **Step 3: Mount the launcher**

In `src/App.tsx`, immediately after the `<AppHeader profile={profile} onLogout={logout} />` line and before the `<main … >` line, add:

```tsx
      <ConciergeLauncher />
```

(Indentation should match the existing `<AppHeader …>` line.)

- [ ] **Step 4: Extend `<main>`'s padding**

In `src/App.tsx`, find:

```tsx
      <main className="w-full mx-auto p-4 md:p-8 relative z-10 flex-1 flex flex-col overflow-y-auto">
```

Replace with:

```tsx
      <main className="w-full mx-auto p-4 md:p-8 pb-20 md:pb-8 relative z-10 flex-1 flex flex-col overflow-y-auto">
```

(`pb-20` overrides the mobile `p-4`'s padding-bottom to 5 rem so the fixed footer doesn't occlude content; `md:pb-8` restores the 2 rem padding-bottom on desktop where the floating card doesn't intrude.)

- [ ] **Step 5: Run lint + tests**

Run: `npm run lint && npm test`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
feat(concierge): mount ConciergeLauncher and reserve bottom space for the mobile footer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Hide the CES native bubble in CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Locate the existing `ces-messenger` block**

Run: `grep -n "^ces-messenger" src/index.css`
You should see two rules: `ces-messenger {` and `ces-messenger.chat-open {`.

- [ ] **Step 2: Add `opacity` and `pointer-events` to both rules**

In `src/index.css`, find:

```css
ces-messenger {
  /* Use !important so we win against any inline style the element sets on itself
     after upgrade. Visual-only — does not affect the element's behaviour. */
  position: fixed !important;
  right: 1.25rem !important;
  bottom: 1.25rem !important;
  left: auto !important;
  z-index: 60;
  width: 144px !important;
  height: 144px !important;
  overflow: hidden !important;
  transform: translateZ(0) !important;
}
```

Replace with:

```css
ces-messenger {
  /* Use !important so we win against any inline style the element sets on itself
     after upgrade. Visual-only — does not affect the element's behaviour.

     opacity:0 + pointer-events:none hide the CES native bubble. The closed-
     state launcher is now the themed React <ConciergeLauncher>. The CES host
     stays mounted so its chat panel still works when the launcher invokes
     cesm.open(). The .chat-open class below restores opacity + interactivity
     so the panel becomes visible the moment CES dispatches the open event. */
  position: fixed !important;
  right: 1.25rem !important;
  bottom: 1.25rem !important;
  left: auto !important;
  z-index: 60;
  width: 144px !important;
  height: 144px !important;
  overflow: hidden !important;
  transform: translateZ(0) !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

Then find:

```css
ces-messenger.chat-open {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  transform: none !important;
}
```

Replace with:

```css
ces-messenger.chat-open {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  transform: none !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
```

`!important` is consistent with the surrounding declarations and defensive against any inline `opacity` / `pointer-events` the CES web component sets on its own host after upgrade.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
fix(concierge): hide CES native bubble — themed launcher takes over closed state

opacity:0 + pointer-events:none on the ces-messenger host while closed.
.chat-open (toggled by public/ces-init.js on ces-chat-open-changed) restores
visibility + interactivity so the CES chat panel still works.

The 144px host box (Chrome Android hit-test workaround) is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Update `CLAUDE.md` — bump theme list to eight places

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Locate the theme-list section**

Run: `grep -n "Adding a theme = touch seven places\|FALLBACK_SYMBOLS_MAP\|GAME_REGISTRY" CLAUDE.md`
You should see the heading and items 1–7.

- [ ] **Step 2: Update the heading**

In `CLAUDE.md`, find:

```markdown
### Adding a theme = touch seven places
```

Replace with:

```markdown
### Adding a theme = touch eight places
```

Then find the section's intro line:

```markdown
Themes appear in seven locations and missing one silently breaks the new theme (404s on the API, doesn't appear in the lobby, slots reels render `❓`, no celebration copy, no themed background). For each new theme add:
```

Replace with:

```markdown
Themes appear in eight locations and missing one silently breaks the new theme (404s on the API, doesn't appear in the lobby, slots reels render `❓`, no celebration copy, no themed background, no concierge avatar). For each new theme add:
```

- [ ] **Step 3: Add item 8**

In `CLAUDE.md`, find item 7:

```markdown
7. **`src/config/games.ts`** — add 3 entries to `GAME_REGISTRY` (one each for roulette / slots / bingo) so the games are routable from `/game/:gameId`.
```

Add a new item 8 immediately after it:

```markdown
8. **`src/components/ConciergeLauncher.tsx`** — add the new theme key to `CONCIERGE_AVATARS` with a single emoji. The map is `Record<RouteTheme, string>`, so a missing entry is a TypeScript error at build / `npm run lint`.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(claude): bump theme-list to eight places — add ConciergeLauncher avatar map

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Manual browser verification

No code or commit. Per CLAUDE.md, UI changes must be verified in a browser before claiming completion.

- [ ] **Step 1: Start dev servers**

In two terminals:
- Terminal 1: `npm run dev:server`
- Terminal 2: `npm run dev`

Open the printed URL (typically `http://localhost:3000`) and log in.

- [ ] **Step 2: Desktop ≥ 768 px walkthrough**

In a desktop-width browser window:

- **Lobby (`/`)**: themed card visible bottom-right. Lobby palette (violet on dark). Avatar is `✨`. Subtitle "Help, tips, anything" visible.
- **Profile (`/profile`)**: same lobby palette + avatar.
- **Sweets game (`/game/<sweets-game-id>`)**: card adopts pink/white palette. Avatar is `🍭`.
- **Egypt game**: card adopts brown/gold palette. Avatar is `𓂀`.
- **Open the chat**: click the launcher. CES chat panel slides out. The launcher disappears.
  - **If the panel does NOT open**, the `cesm.open()` path failed and the synthetic-click fallback didn't either. Inspect `<ces-messenger>` in DevTools — call `$0.open?.()` and `$0.click()` from the console to see which works. Update `openCesPanel()` accordingly and amend with a fix-up commit.
- **Close the chat**: dismiss the panel. The launcher reappears in the same position with the same theme.
- **Tab to the launcher**: visible focus ring (theme accent color). `Enter` and `Space` activate it.

- [ ] **Step 3: Mobile < 768 px walkthrough**

Open Chrome DevTools, switch to a mobile device (e.g. iPhone 14 Pro):

- **Lobby**: full-width footer flush with the bottom edge. Avatar + "Talk to concierge" + chevron. No subtitle.
- **Game pages**: footer adopts theme.
- **Bottom of `<main>` is not occluded**: scroll a long page (FAQ for example) and confirm the footer doesn't cover content.
- **Safe-area inset**: in the device emulator, simulate a device with a home indicator (iPhone 14 Pro). The footer's bottom padding grows to clear the indicator.
- **Open + close the chat panel**: confirm the launcher hides while the panel is up and reappears on close.

- [ ] **Step 4: Diagnostic flag check**

- Visit `?no-ces=1` (e.g. `http://localhost:3000/?no-ces=1`). Neither the CES bubble area nor the themed launcher should be visible.

- [ ] **Step 5: Regression check (Chrome Android hit-test)**

If you have a Chrome Android device or remote-debug emulator handy: load a game page. Confirm bet / spin / daub buttons all respond to tap. The 144 px CES host box workaround is unchanged, so this should still work — the check is to confirm we haven't accidentally regressed it.

- [ ] **Step 6: Final test + lint pass**

Run: `npm run lint && npm test`
Expected: both pass.

If everything in steps 2–6 looks right, the change is complete.

---

## Self-Review Notes

Spec coverage check:
- ✅ Desktop card: Tasks 2 (markup), 8 (CSS).
- ✅ Mobile footer: Tasks 2 (markup), 8 (CSS), 9 (`pb-20`).
- ✅ Theming via CSS vars: Task 8.
- ✅ Theme-specific avatar: Task 4.
- ✅ Hide on chat-open: Task 3.
- ✅ Click → open CES (with fallback): Task 5.
- ✅ Hide on `?no-ces=1`: Task 6.
- ✅ Hide CES native bubble: Task 10.
- ✅ CES disabled (no element): Task 1.
- ✅ Bottom-padding for mobile content: Task 9.
- ✅ Update CLAUDE.md theme list: Task 11.
- ✅ Manual verification: Task 12.

Type / signature consistency:
- `RouteTheme` imported from `routeToTheme.ts` in Task 4 — same module, same name throughout.
- `CONCIERGE_AVATARS` defined in Task 4 with all 9 RouteTheme keys — same map shape used through to Task 12.
- `openCesPanel` introduced in Task 5; same signature ` () => void` thereafter.
- `ces-chat-open-changed` event payload `{ isOpen: boolean }` — same shape in Task 3 (test + impl) and unchanged in later tasks.

No placeholders found in any task.
