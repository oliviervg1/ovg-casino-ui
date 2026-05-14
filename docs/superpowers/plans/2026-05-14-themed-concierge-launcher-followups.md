# Themed Concierge Launcher — Follow-ups

Cleanup items deferred from the post-merge review of `feat/themed-concierge-launcher` (merged to `main` as `fdcb93c`, deployed as Cloud Run revision `ovg-casino-00034-dx4` on 2026-05-14).

The two items below are slated for the next session. Other follow-ups from the same review are listed at the bottom under "Other deferred items" — those are parked and don't have a planned owner yet.

## Verify before starting

Make sure nothing's regressed since the merge:

```bash
cd /home/admin_/ovg-casino-ui
git status                                # should be clean
git log --oneline -1                      # HEAD on main
npm run lint                              # tsc --noEmit × 2, must pass
npm test 2>&1 | tail -3                   # 470/470, must pass
```

Original work product:
- Spec: `docs/superpowers/specs/2026-05-14-themed-concierge-launcher-design.md`
- Plan: `docs/superpowers/plans/2026-05-14-themed-concierge-launcher.md`

---

## Follow-up 1: Unify the `<ces-messenger>` typed alias

**Problem.** Two files cast the `<ces-messenger>` host element with different shapes:

| File | Cast |
|---|---|
| `src/App.tsx:89` | `document.querySelector('ces-messenger') as any` |
| `src/components/ConciergeLauncher.tsx:18` | declares `type CesMessengerEl = HTMLElement & { open?: () => void };` |

Both need additional methods (`close?`, `setQueryParameters?`, `endSession?`, `disconnectWebStream?`, `clearStorage?`, `registerTemplate?`) — `App.tsx` calls `setQueryParameters`; `public/ces-init.js` calls the others (but as a `.js` file, no TS typing concern there).

**Fix.** Extract a shared type, import in both TS files.

### Step 1: Create the shared type

Create `src/types/cesMessenger.ts`:

```ts
/**
 * The third-party CES messenger custom element. Loaded asynchronously from
 * gstatic.com (see index.html) and upgraded by its own script. The standard
 * lib.dom.d.ts has no type for it; this alias documents the methods we
 * actually call from TS code.
 *
 * `setQueryParameters` is called from src/App.tsx to sync the user's first
 * name into the agent context. `open` is called from
 * src/components/ConciergeLauncher.tsx when the user taps the launcher.
 *
 * Methods are all optional: the upgrade is async, and at the moment we
 * query the element a method may not yet be attached.
 */
export type CesMessengerEl = HTMLElement & {
  open?: () => void;
  close?: () => void;
  setQueryParameters?: (params: Record<string, unknown>) => void;
};
```

### Step 2: Import in `ConciergeLauncher.tsx`

In `src/components/ConciergeLauncher.tsx`:

- **Remove** the local declaration on line 18 (`type CesMessengerEl = HTMLElement & { open?: () => void };`).
- **Add** the import near the other type imports (right under `import { routeToTheme, type RouteTheme } from '../utils/routeTheme';`):

```ts
import type { CesMessengerEl } from '../types/cesMessenger';
```

The rest of the file is unchanged — the existing `as CesMessengerEl | null` cast in `openCesPanel` continues to work.

### Step 3: Use in `App.tsx`

In `src/App.tsx`:

- **Add** the import alongside the other imports:

```ts
import type { CesMessengerEl } from './types/cesMessenger';
```

- **Replace** the `as any` on line 89:

```ts
// Before
const cesm = document.querySelector('ces-messenger') as any;

// After
const cesm = document.querySelector('ces-messenger') as CesMessengerEl | null;
if (!cesm || !profile?.displayName) return;
```

The subsequent uses (`cesm.setQueryParameters`, `cesm.addEventListener`, `cesm.removeEventListener`) all type-check against `CesMessengerEl` — `addEventListener` / `removeEventListener` come from `HTMLElement`, `setQueryParameters` from our alias.

The `if ('setQueryParameters' in cesm && typeof cesm.setQueryParameters === 'function')` check on line 105 stays — it guards the optional method.

### Step 4: Verify

```bash
npm run lint                              # zero errors
npm test 2>&1 | tail -3                   # 470/470 still pass
```

### Step 5: Commit

```bash
git add src/types/cesMessenger.ts src/App.tsx src/components/ConciergeLauncher.tsx
git commit -m "$(cat <<'EOF'
refactor(ces): extract shared CesMessengerEl type — drops App.tsx's `as any`

Single source of truth for the optional methods we call on the upgraded
custom element (open / close / setQueryParameters).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Follow-up 2: Refresh the stale `?natural-ces=1` comment

**Problem.** `src/index.css:174` references the `?natural-ces=1` diagnostic flag, but that flag was removed in commit `ffc5c93` (it lives only in git history now). Anyone hitting the comment, then grepping the codebase for `natural-ces`, finds nothing and gets confused.

**Fix.** Reword the comment to acknowledge the flag is historical and link to the bug report it produced.

### Step 1: Edit the comment

In `src/index.css`, find the existing comment around line 174:

```
   Verified necessary in commits 826fcf0, b7c208a, 29bfb43; ?natural-ces=1
   confirmed the bug is in CES, not in our position-fixed override. */
```

Replace with:

```
   Verified necessary in commits 826fcf0, b7c208a, 29bfb43; the bug was
   originally diagnosed via a `?natural-ces=1` URL flag (removed in ffc5c93
   once the diagnosis stuck). The full bug report is at
   docs/CES-MESSENGER-BUG.md. */
```

### Step 2: Verify

```bash
npm run lint                              # CSS doesn't go through tsc; just confirm no syntax error
npm test 2>&1 | tail -3                   # 470/470
```

### Step 3: Commit

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
docs(css): refresh stale ?natural-ces=1 reference in ces-messenger workaround

The diagnostic flag was removed in ffc5c93. Point readers at
docs/CES-MESSENGER-BUG.md for the full diagnosis story instead.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 4: Push (and optionally redeploy)

These two commits are docs/refactor only — no behavior change. Push to share, no deploy needed:

```bash
git push origin main
```

If you want them in prod anyway (e.g., to keep dist-prod in lockstep with main):

```bash
./deploy/deploy.sh deploy
```

---

## Other deferred items (not slated)

The remaining follow-ups from the post-merge review, parked for now:

3. **Loose `?no-ces=1` substring match** in `public/ces-init.js:4` — pre-existing, not introduced by the launcher work. Quick fix: `new URLSearchParams(location.search).has('no-ces')`.
4. **Hover state washes out on light themes (e.g. sweets).** Mix toward `var(--theme-primary)` instead of `white` in `.concierge-launcher:hover`.
5. **`box-shadow` doesn't animate on hover** — add `box-shadow 0.2s ease` to `.concierge-launcher`'s `transition` list.
6. **Mobile `<main>` bottom padding doesn't grow with safe-area-inset.** Swap `pb-20` for `pb-[calc(5rem+env(safe-area-inset-bottom,0px))]` and verify on iPhone emulator.
7. **`cesm.open()` vs synthetic-click — never confirmed which fires.** Run `document.querySelector('ces-messenger').open()` in the prod console; if chat opens, prune the synthetic-click branch in `openCesPanel`.
8. **`/game/<id>` route family not exercised in `ConciergeLauncher.test.tsx`'s avatar parameterisation.** Add a couple of cases like `['/game/sweets-roulette', '🍭', 'sweets']`.
9. **`clearStorage()` on chat close wipes CES's templates.** File against the CES messenger team following the pattern of `docs/CES-MESSENGER-BUG.md`. Our `public/ces-init.js` defends against it by re-registering on every open, but the proper fix is upstream.
