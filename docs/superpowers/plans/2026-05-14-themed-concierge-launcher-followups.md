# Themed Concierge Launcher — Follow-ups

Cleanup items deferred from the post-merge review of `feat/themed-concierge-launcher` (merged to `main` as `fdcb93c`, originally deployed as Cloud Run revision `ovg-casino-00034-dx4` on 2026-05-14).

Original work product:
- Spec: `docs/superpowers/specs/2026-05-14-themed-concierge-launcher-design.md`
- Plan: `docs/superpowers/plans/2026-05-14-themed-concierge-launcher.md`

## Shipped

- **2026-05-14 — `9a8f1fc`** — Extract shared `CesMessengerEl` type into `src/types/cesMessenger.ts`. Drops the `as any` in `src/App.tsx` and the local declaration in `src/components/ConciergeLauncher.tsx`. Single source of truth for the optional methods we call on the upgraded custom element (`open` / `close` / `setQueryParameters`).
- **2026-05-14 — `c976886`** — Refresh the stale `?natural-ces=1` reference in `src/index.css` (the flag was removed in `ffc5c93`). Comment now points at `docs/CES-MESSENGER-BUG.md` for the diagnosis story.

## Parked

Nothing slated; pick up if/when relevant.

1. **Loose `?no-ces=1` substring match** in `public/ces-init.js:4` — pre-existing, not introduced by the launcher work. Quick fix: `new URLSearchParams(location.search).has('no-ces')`.
2. **Hover state washes out on light themes (e.g. sweets).** Mix toward `var(--theme-primary)` instead of `white` in `.concierge-launcher:hover`.
3. **`box-shadow` doesn't animate on hover** — add `box-shadow 0.2s ease` to `.concierge-launcher`'s `transition` list.
4. **Mobile `<main>` bottom padding doesn't grow with safe-area-inset.** Swap `pb-20` for `pb-[calc(5rem+env(safe-area-inset-bottom,0px))]` and verify on iPhone emulator.
5. **`cesm.open()` vs synthetic-click — never confirmed which fires.** Run `document.querySelector('ces-messenger').open()` in the prod console; if chat opens, prune the synthetic-click branch in `openCesPanel`.
6. **`/game/<id>` route family not exercised in `ConciergeLauncher.test.tsx`'s avatar parameterisation.** Add a couple of cases like `['/game/sweets-roulette', '🍭', 'sweets']`.
7. **`clearStorage()` on chat close wipes CES's templates.** File against the CES messenger team following the pattern of `docs/CES-MESSENGER-BUG.md`. Our `public/ces-init.js` defends against it by re-registering on every open, but the proper fix is upstream.
