# Themed-Immersive Redesign — Plan 2 Status as of 2026-05-07

**Pause point** for picking up later. Captures: what shipped, where to find it, what's next, known limitations.

## TL;DR

Plan 2 of 6 (Game-Page Chrome) is complete on a feature branch. 15 commits, 219/219 tests, lint clean, build green (904 KB JS / 47.8 KB CSS — within Plan 1's "+50 KB" budget). **Not yet merged to `main`. Not yet deployed.** **Browser click-through verification (Task 14 Step 3) still pending — user should do.** Next session can: manual browser pass → open PR → merge + deploy → start Plan 3.

## Branch state

- **Branch:** `feat/plan-2-game-page-chrome`
- **Tip:** `f71e57b` — `feat(layout): CES messenger moves to bottom-left on game routes`
- **Diverges from main:** 15 commits ahead, 0 behind (Plan 1 already merged at `ec8cdd1`)
- **Pushed:** the parent commit `d644e42` was pushed; the 9 commits since then are local-only as of pause
- **PR URL:** not yet created
- **CI gates:** `npm run lint` exit 0, `npm test` 219/219 across 38 files, `npx vite build` succeeds in 8.35s

## What landed in Plan 2

Tasks were executed in spec order via the `superpowers:subagent-driven-development` flow (implementer → spec reviewer → code quality reviewer per task). All 13 implementation tasks shipped; Task 14 was a verification gate (no commit); Task 15 is this doc.

### Foundation (Tasks 1-2)

- `src/contexts/AudioControlsContext.tsx` — React context exposing `{ muted, toggleMute, nowPlaying, setNowPlaying }`. `muted` persisted to `localStorage` under `ovg-audio-muted`. `nowPlaying` is `{ theme, gameType }` or `null`.
- `src/utils/SoundEngine.ts` gained `setMuted(b: boolean)` that gates `masterGain.gain.value`. Initialised from `localStorage` so the first sound respects the persisted preference.

### Header atoms (Tasks 3-5)

- `src/components/Layout/BalancePill.tsx` — monospace green pill, count-up on win via Framer Motion + `useMotion` (snaps when reduced-motion is set), aria-live announcement.
- `src/components/Layout/MenuDropdown.tsx` — `⋯` icon → dropdown with Profile / Rules / Help / Logout. Click-outside closes; Esc closes; ↑/↓ navigates; Enter activates.
- `src/components/MusicPill.tsx` — reads `useAudioControls()` + `useTheme()`. Renders `♪ Lyria 3 · <Theme> <Game>` + 4-bar animated waveform. Click toggles mute. Returns `null` when `nowPlaying` is `null` (so it self-gates: the lobby header doesn't render it).

### Composed header + game atoms (Tasks 6-8)

- `src/components/Games/BetControl.tsx` — pill containing `−` / `+` stepper + 4 preset chips (5 / 10 / 25 / 100). Active preset highlighted via `bg-theme-accent`. Disabled state cascades to all interactive elements; stepper disables independently when `value <= min` or `value >= max`.
- `src/components/Games/GameStatusLine.tsx` — AI-attribution status pill: `"Gemini 3.1 generating · Lyria 3 composing soundtrack"` while loading; `null` when ready. Optional `detail` suffix.
- `src/components/Layout/AppHeader.tsx` — single contextual header. **Lobby mode** (`/`): "🎰 OVG Casino" logo + balance + menu, no music pill. **Page mode** (everything else): back-to-lobby button + page title (in theme display font where applicable) + balance + music pill + menu. Title source: `GAME_REGISTRY.find(g => g.id === ...)` for `/game/:id`, `themeManifesto[t].displayName` for `/world/:theme`, static labels for `/profile|/rules|/faq`.

### Wiring (Task 9)

- `src/App.tsx` — inline `<header>` block (~40 lines) replaced with `<AppHeader profile={profile} onLogout={logout} />`. Authenticated tree wrapped in `<AudioControlsProvider>`. New `useEffect` writes `data-route="lobby|world|game|other"` on `<html>` for the CES messenger CSS rule.

### GameShell + WorldPage refactor (Tasks 10-11)

- `src/components/Games/GameShell.tsx` — internal `<header>` stripped (lives in `AppHeader` now), `props.onBack` kept in props but ignored (JSDoc-deprecated to prevent cleanup), `min-h-screen` → `flex-1 flex flex-col` so the page sits in `<main>`'s scroll container, 60% black wash → `bg-black/30 backdrop-blur-sm`. Loading state replaced with `<ThemedSkeleton aspectRatio="16/9" width="min(80%, 480px)">` + tagline. Action bar: `<BetControl>` + `<ThemedButton size="hero">`. Audio binding: `useAudioControls` consumed; `setNowPlaying({ theme, gameType })` registered while mounted; `audioRef.current.muted` bound to context `muted` via a **standalone effect that owns all mute writes** (the music-load effect's deps are intentionally `[musicUrl]` only — see "Deviations" below).
- `src/components/Games/{Slots,Roulette,Bingo}.tsx` — `Props.theme` tightened from `string` to `ThemeType`, redundant `theme as ThemeType` casts dropped. The chain is now end-to-end type-safe (`gameDef.theme: ThemeType` → `App.tsx` → `Slots/Roulette/Bingo Props.theme` → `GameShellProps.theme`).
- `src/components/WorldPage.tsx` — same audio integration pattern as GameShell: `useAudioControls`, `setNowPlaying({ theme, gameType: 'world' })`, standalone mute effect.

### Roulette UX fix (Task 12)

- `src/components/Games/Roulette.tsx` — `playLabel` is now `spinning ? 'SPINNING...' : !betType ? 'Pick Red / Black / Even / Odd' : 'SPIN THE WHEEL'`. Eliminates the first-paint footgun where the disabled hero button gave no hint why.

### CES messenger (Task 13)

- `src/index.css` — appended a position rule for `<ces-messenger>`: bottom-right by default, bottom-left when `data-route="game"`. Uses `!important` to override the `index.html` inline `style` set on the custom element. Z-index 60 sits above the `z-50` header + dropdown so the chat affordance is always reachable.

## Deviations from the literal plan (intentional)

1. **GameShell + WorldPage mute effect ownership (Tasks 10, 11).** Plan said to add `muted` to the music-load effect's dep array AND write `audioRef.current.muted = muted` inside it. Doing so causes the music-load effect to re-fire on every mute toggle, which in real browsers reassigns `audio.src` and can stutter or restart playback. The Task 10 fix-up commit `c0e85fa` switched to a single-owner pattern: the standalone mute effect owns all mute writes, the music-load effect's deps stay narrow at `[musicUrl]`. Task 11 applied the same correction preemptively. Caught by the code-quality reviewer; jsdom doesn't reproduce the bug because it doesn't implement `.play()`.
2. **GameShell narrowed `theme: string` → `ThemeType` (Task 10 fix-up).** The plan kept it as `string` for caller compat. Reviewer pointed out all current callers pass `ThemeType` already, and the cast `props.theme as ThemeType` in `setNowPlaying` was unsafe. Tightening cascaded into Slots/Roulette/Bingo `Props.theme` and removed 5 redundant casts.
3. **`onBack` JSDoc-deprecated (Task 10 fix-up).** Plan kept the prop in `GameShellProps` for compat but didn't document why. Without the comment a future cleanup would have removed it and broken the call sites. JSDoc lifted from spec rationale.
4. **GameShell test loading-state regex narrowed to `/generating unique/i` (Task 10).** The new shell renders TWO matching strings during loading (the skeleton's "Generating unique sweets world…" AND `GameStatusLine`'s "Gemini 3.1 generating · Lyria 3…"); `getByText(/generating/i)` would throw on multiple matches.
5. **Roulette test added vi.mock for useAssets/useMusic (Task 12).** GameShell hides `props.children` behind a loading skeleton until both hooks resolve; in jsdom they never do. Without the mocks, the bet-type buttons (which are `children`) wouldn't be in the DOM and the click assertion would fail. Mirrors GameShell.test.tsx exactly. Plan-mandated assertions kept verbatim.

## Known limitations / things to revisit

1. **Browser click-through verification (Task 14 Step 3) is still pending.** The implementing engineer should manually walk through: lobby → world → game → mute toggle → bet preset chip → stepper → menu open/close → CES messenger position swap on `/game/...`. The plan's checklist is in `docs/superpowers/plans/2026-05-07-game-page-chrome.md` Task 14 Step 3.
2. **AppHeader page title is `<span>`, not `<h1>`.** Spec dictated `<span>`. Code-quality reviewer flagged that downstream pages each render their own headings (Profile/FAQ/Rules use `<h2>`, GameShell/WorldPage use `<h1>`), so the document semantically still has a top-level heading per page. Worth a holistic chrome-a11y pass once Plans 3-5 land.
3. **`data-route` first-paint flash.** `index.html` doesn't set `data-route` on `<html>` initially; the attribute lands when the App.tsx useEffect commits after first render. The CES messenger CSS rule could briefly evaluate against a missing attribute. In practice the messenger is async-mounted and resolves after the first effect commit, so the flash is unlikely to be visible. Could be eliminated by initialising `data-route="lobby"` (or `"other"`) directly in `index.html`. Verify in Task 14 browser pass; defer if not visible.
4. **The plan doc itself is now stale on the muted-effect deps (Tasks 10, 11).** The `[musicUrl, muted]` dependency the plan dictates would reintroduce the audio-restart bug. If the plan is referenced for porting the same chrome to another surface, apply the single-owner pattern.
5. **`ThemeType` import in `Roulette.tsx`/`Slots.tsx`/`Bingo.tsx`** comes from `'../../App'` (which re-exports from `themeManifesto`), not from `themeManifesto` directly. Plan 1's de-duplication commit `4a60ebe` made `App.tsx` the canonical re-export point. Don't accidentally re-introduce a local `ThemeType` declaration in any of these files.
6. **`prefers-reduced-motion` is wired through `useMotion` for `BalancePill` count-up + `MusicPill` waveform.** Other animated atoms (`ThemedButton` hero glow, `ThemedSkeleton` shimmer) inherit reduced-motion from CSS-level `@media (prefers-reduced-motion: reduce)` blocks added in Plan 1.
7. **`Slots.tsx` symbol-rendering bug** (the `data:`-prefix-only check that breaks Gemini URLs) is **still present** — not in Plan 2's scope, will be folded into Plan 3.
8. **Plan 1's known limitations carry forward** verbatim: light/dark `profile.theme` reconciliation still out of scope; `screenshots/` dir still untracked and intentionally never committed; CES messenger styling is now route-aware (✓ Plan 2) but the bubble color is still its default.

## Tasks for the next session

In rough order of value:

1. **User does fresh manual browser pass** on the latest tip (`f71e57b`). Confirm:
   - Lobby header shows logo + balance + `⋯` menu, no music pill, no back button.
   - Click world card → `/world/<theme>` — back button + theme name in display font + music pill (waveform animating). Music plays, click pill → bars dim + `data-muted="true"`. Click again → bars resume. Mute persists across reload.
   - Click game card → `/game/<id>` — themed loading skeleton + `GameStatusLine` ("Gemini 3.1 generating · Lyria 3 composing soundtrack") while assets resolve. Once loaded: themed game body + `<BetControl>` (preset chip click changes value, ± stepper steps by 1) + themed hero button.
   - Roulette specifically: before picking a bet, hero label reads "Pick Red / Black / Even / Odd" and is disabled. After picking, "SPIN THE WHEEL".
   - `⋯` menu: opens, click outside / Esc closes, items navigate.
   - CES messenger sits bottom-right on `/` and `/world/...`, bottom-left on `/game/...`. Position transition feels smooth.
   - Reduced-motion users: `BalancePill` snaps on win instead of counting up; `MusicPill` waveform stops.
2. **Open PR**, review, merge to `main`. Suggested PR title: `Plan 2: Game-page chrome — single header, BetControl, MusicPill, themed loading`.
3. **Deploy to prod** — `./deploy/deploy.sh deploy`. Plan 1 deploy used `ovg-casino-00007-p8j`; this would land as the next revision.
4. **Start Plan 3 (Slots surface).** Atoms ready: `ThemedSkeleton`, `ThemedCard`, `ThemedButton`, `useTheme`, `useMotion`, `themeManifesto`, `BetControl`, `GameStatusLine`. Plan 3 needs writing first via `superpowers:writing-plans`. Folds in the `Slots.tsx` symbol-rendering bug (the `data:`-prefix-only check that breaks Gemini URLs).

## Where to find things

- **Spec:** `docs/superpowers/specs/2026-05-07-themed-immersive-redesign-design.md` (8 sections; Plan 2 implements Section 3 + cross-cuts from Section 8)
- **Plan 2 doc:** `docs/superpowers/plans/2026-05-07-game-page-chrome.md` (15 tasks; all executed)
- **This progress doc:** `docs/superpowers/progress/2026-05-07-plan-2-status.md`
- **Plan 1 progress doc:** `docs/superpowers/progress/2026-05-07-plan-1-status.md` (for prior context)
- **Memory pointer:** `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`

## Sanity checks to run on next session start

```bash
git fetch origin
git checkout feat/plan-2-game-page-chrome
git status                                          # should be clean
git log --oneline main..HEAD | wc -l                # should report 15 (or higher if more added)
npm run lint && npm test                            # 219/219 + lint exit 0
npx vite build                                      # ~904 KB JS / ~47.8 KB CSS
```

If counts don't match, something landed since pause — investigate before continuing.
