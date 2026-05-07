# Themed-Immersive Casino Redesign — Design Spec

**Date:** 2026-05-07
**Status:** Approved (brainstorming)
**Next step:** writing-plans → implementation plan

## Context

OVG Casino is a B2B demo for online-casino operators showcasing how Gemini 3.1 (image generation) and Lyria 3 (music generation) can be used to ship richly-themed casino games quickly. The product generates per-theme backgrounds, slot symbols, game pictograms, and music tracks across 8 themes (sweets, egypt, space, west, ocean, jungle, vampire, ninja) × 3 game types (roulette, slots, bingo) — totaling 81 image assets and 24 music tracks per "world set".

The current UI does not visually capitalise on this generation investment:

- All 8 themes share identical UI chrome (same rounded card, same neon border, same generic pill button) — the only difference is colour and a couple of fonts. The "8 AI-generated worlds" pitch doesn't pay off visually.
- The Gemini-generated background art is dimmed by a 60% black wash and obscured by floating opaque cards. Two competing surfaces, neither winning.
- Game widgets are abstract: slot reels are bare white cards with a single emoji each (Gemini symbols don't even render due to a stale `data:` prefix check); the roulette "wheel" is a flat coloured circle showing only the result number; the bingo card is wrapped in a hot-pink heavy border.
- Win celebrations are anaemic: a generic green pill says "You won!" for small wins; jackpots use `react-confetti` + plain yellow text; losses get only an unstyled status line.
- Loading states are giant near-empty cards with low-contrast text — the lobby reads as "broken" not "loading", and there's no visible attribution of the AI generation pipeline that's the entire point of the product.

The redesign aligns the visual experience with the product's core pitch: each theme becomes a fully-formed world with its own surface vocabulary, button language, motion language, celebration style, and loading skeleton; the Gemini background art becomes the casino floor with restrained HUD-style chrome; and the AI generation pipeline is made visibly legible to the operator audience.

## Goals

1. **Make the per-theme generation investment visually pay off.** An operator should be able to see — at a glance — that the 8 worlds are distinctive, polished, and varied.
2. **Treat the Gemini art as the hero, not the wallpaper.** Game widgets should look like extensions of the painted scene, not floating overlays.
3. **Make the AI pipeline visible.** Loading states attribute the model and stage; the lobby features a "regenerate everything" hero CTA; the music pill keeps Lyria 3 visible.
4. **Polish the moments operators will scrutinise.** Win celebrations, slot spin animations, the roulette wheel itself.
5. **Fix the bugs surfaced during the audit** — slot Gemini symbols not rendering, two stacked headers, low-contrast text — as part of the redesign rather than as separate patches.

## Audience and direction

- **Audience:** B2B online-casino operators evaluating "how fast can we ship games with AI." Desktop-first (operator laptop / monitor / presentation screen). Tablet supported; mobile works but isn't optimised.
- **Direction:** "Themed immersive" — each theme is a fully-formed world. Confirmed over "refine in place" (too timid for this audience) and "modern unified" (would abandon the per-theme generation investment).

## Three pillars

1. **Vocabulary** — each theme is a fully-formed world, not a colour swap. The theme system extends from "colour + font" to a manifesto including surface, button, border, motion, celebration, skeleton, and audio cue.
2. **Framing** — the Gemini bg art is the casino floor; the UI is a HUD. Restrained semi-transparent chrome around the edges; game widgets visually integrate with the painted scene.
3. **Show your work** — the AI generation is the thesis; make it legible. Themed loading skeletons attribute the model; "regenerate everything" is a hero lobby interaction; the Lyria 3 music pill stays visible.

## AI attribution (UI strings)

Per the project memory `ai-attribution.md`: all user-visible strings reference **"Gemini 3.1"** and **"Lyria 3"**. This is a positioning decision independent of the actual model ID called server-side — the displayed name does not need to track changes in `server/lib/gemini.ts`.

---

## Section 1 — Theme token vocabulary (foundation)

A single `src/utils/themeManifesto.ts` file exports a typed map `themeManifesto: Record<ThemeType, Manifesto>`. The manifesto carries the per-theme design vocabulary across 7 categories:

| Token | Controls | Range of values |
|---|---|---|
| `surface` | Card / panel material — colour, shape language, texture, depth treatment | `pillowy-glass` · `parchment` · `holographic` · `wood-iron` · `coral` · `mossy-stone` · `black-marble` · `dark-wood-paper` |
| `button` | Interactive surface — primary action shape and feel | `gummy-3d` · `scarab-cartouche` · `neon-rim` · `branded-leather` · `bubble` · `vine-wrap` · `velvet-pill` · `seal-stamp` |
| `border` | Decorative frame around game widgets and important panels | `candy-wrapper` · `gold-leaf` · `neon-line` · `rope-iron` · `kelp-frame` · `vine` · `gothic-arch` · `ink-brush` |
| `motion.idle` | Subtle ambient motion on widgets (loop) | `jiggle` · `drift` · `pulse` · `sway` · `flicker` |
| `celebration` | Win moment — particles, motion, surface reaction | `candy-burst` · `sandstorm-gold` · `supernova` · `dust-storm` · `bioluminescent-burst` · `parrot-flock` · `bat-swarm` · `cherry-blossom-storm` |
| `skeleton` | Themed loading placeholder — shape and animation while assets generate | `unwrap` · `hieroglyph-fade` · `hyperspace-streak` · `wagon-wheel` · `sonar-ripple` · `vine-grow` · `candle-flicker` · `ink-bleed` |
| `audio.click` | Small UI feedback sound (extends existing soundEngine) | `candy-crinkle` · `parchment-rustle` · `laser-blip` · `spur-jingle` · `bubble-pop` · `wood-knock` · `velvet-tap` · `sword-tap` |

CSS custom properties carry colour, shape, and shadow tokens (set on `:root[data-theme="..."]`). Themed React components — `<ThemedButton>`, `<ThemedCard>`, `<ThemedSkeleton>`, `<ThemedCelebration>` — read the manifesto via a `useTheme()` hook and switch on the discriminator (e.g. `button === 'gummy-3d'` vs `'seal-stamp'`) to render the right variant. No string-based class soup; one switch per component.

### Per-theme manifesto values (one-line vibes)

| Theme | Vibe |
|---|---|
| Sweets 🍭 | Pillowy candy-coated. `pillowy-glass` surfaces · `gummy-3d` buttons · `candy-wrapper` borders · `unwrap` skeletons · `candy-burst` celebrations · `candy-crinkle` clicks |
| Egypt 🏺 | Parchment + gold leaf. `parchment` surfaces · `scarab-cartouche` buttons · `gold-leaf` borders · `hieroglyph-fade` skeletons · `sandstorm-gold` celebrations · `parchment-rustle` clicks |
| Space 🚀 | Holographic + neon. `holographic` surfaces · `neon-rim` buttons · `neon-line` borders · `hyperspace-streak` skeletons · `supernova` celebrations · `laser-blip` clicks |
| Wild West 🤠 | Rustic wood + iron. `wood-iron` surfaces · `branded-leather` buttons · `rope-iron` borders · `wagon-wheel` skeletons · `dust-storm` celebrations · `spur-jingle` clicks |
| Ocean 🦈 | Deep + bioluminescent. `coral` surfaces · `bubble` buttons · `kelp-frame` borders · `sonar-ripple` skeletons · `bioluminescent-burst` celebrations · `bubble-pop` clicks |
| Jungle 🐒 | Overgrown stone. `mossy-stone` surfaces · `vine-wrap` buttons · `vine` borders · `vine-grow` skeletons · `parrot-flock` celebrations · `wood-knock` clicks |
| Vampire 🦇 | Gothic + crimson. `black-marble` surfaces · `velvet-pill` buttons · `gothic-arch` borders · `candle-flicker` skeletons · `bat-swarm` celebrations · `velvet-tap` clicks |
| Ninja 🥷 | Dark wood + ink. `dark-wood-paper` surfaces · `seal-stamp` buttons · `ink-brush` borders · `ink-bleed` skeletons · `cherry-blossom-storm` celebrations · `sword-tap` clicks |

Detailed token *values* (gradients, exact shadows, particle definitions) land during implementation — the manifesto file is where they live.

---

## Section 2 — Lobby

The 3-second elevator pitch.

**Layout (top to bottom):**
1. Header (single unified, see Section 3).
2. AI pitch strip: *"Eight AI-generated casino worlds"* + sub-line *"Powered by Gemini 3.1 (art) + Lyria 3 (music) — generated on demand, fully customisable"* + a primary `♻ Regenerate everything` CTA on the right that triggers the existing batch-regenerate logic from `Profile.tsx` (worker pool of 4, ~3.5 min for all 105 assets).
3. 4×2 grid of 8 themed world cards.

**World card anatomy:**
- Hero image: `bg_slots_<theme>` at full-bleed (already generated, cached); soft inner vignette in the theme accent colour for legibility.
- Surface treatment per `themeManifesto.<theme>.surface` (so the card visibly belongs to its theme before you read the name).
- Theme name in the theme display font.
- 3 game-mini-icons (roulette / slots / bingo) as small frosted buttons in the bottom-left. Click an icon → straight to that game. Click the card body → defaults to slots (the bg-art game).
- Idle motion per `themeManifesto.<theme>.motion.idle`.

**Loading state:**
- Same 8-card grid with themed skeleton placeholders per `themeManifesto.<theme>.skeleton`. Each card resolves to its real `bg_slots_<theme>` independently as the asset returns.
- Status line above the grid: *"Gemini 3.1 generating · 6 / 8 worlds ready · ~30s remaining"*.

**Removed:**
- Welcome 🎰 emoji + "Step into the ultimate virtual casino" intro paragraph.
- "Group by Type / Theme" toggle.
- Current 24-card 4-column game grid.

**Lobby copy correction:** The current Bingo description "Complete lines on your 5×5 card" is wrong — `gameLogic.ts::makeBoard` produces a 3×3 board. Update to "Complete lines on your 3×3 card."

**Data and reuse:**
- New asset key set for the lobby: `bg_slots_<theme>` × 8. The current pictograms (`roulette_<theme>`, `slots_<theme>`, `bingo_<theme>`) are still generated — they remain the fallback / Profile.tsx batch-regenerate / per-game thumbnails.
- `useAssets()` hook unchanged — handles per-card lazy load.
- `navigate(\`/game/${gameId}\`)` from `App.tsx` unchanged — no router changes.

---

## Section 3 — Game-page chrome

Replaces today's two stacked headers (App + GameShell) with a single unified contextual header. Themed action bar at the bottom.

**Header — game mode:**
- Left: `← Lobby` back button (compact) + game title in the theme display font at large weight (e.g. "Sweet Line" in Chewy 28px, "Galactic Jackpots" in Orbitron 24px tracked-out).
- Right (in order):
  1. Music pill: `♪ Lyria 3 · <Theme> <Game>` with a live 4-bar waveform animating in time with playback. Click → mute/unmute.
  2. Balance pill: monospace, green, animates a count-up on win.
  3. `⋯` menu: dropdown with Profile / Rules / Help / Logout.
- Backdrop-blur over the Gemini bg art instead of the current 60% black wash.

**Header — lobby mode:**
- Left: `🎰 OVG Casino` logo + balance pill.
- Right: music pill (or hidden if no music) + ⋯ menu.

**Action bar (bottom of game page):**
- Bet cluster (left): rounded pill containing preset chips (5 / 10 / 25 / 100), a `±` stepper for arbitrary amounts, active value highlighted. Replaces today's bare `<input type="number">`.
- Primary action button (right): `<ThemedButton variant="hero">` per theme — gummy-3D candy for sweets, scarab cartouche for egypt, neon-rim for space, seal-stamp for ninja, etc. Always large and unmistakable.
- For roulette: button is themed-disabled with a small note "Pick Red / Black / Even / Odd above" until a bet type is selected.

**Themed loading state for the game page:**
- Bg art loads first.
- Game widget renders as a themed skeleton per `themeManifesto.<theme>.skeleton`.
- Status line at the bottom of the action bar: *"Gemini 3.1 generating Sweets symbols (3 / 4) · Lyria 3 composing your soundtrack…"*.
- As each symbol resolves, the corresponding skeleton card morphs into the real Gemini image (themed unwrap / fade animation).

**Removed:**
- Stacked App + GameShell headers (single unified now).
- 60% black wash over bg art.
- Bare `<input type="number">` bet input.
- Small generic SPIN pill button.
- Per-page Rules / Help buttons in the App header (now in ⋯ menu).

**New components:**
- `src/components/Layout/AppHeader.tsx` — contextual header, switches mode by route.
- `src/components/Games/BetControl.tsx` — chip cluster + stepper.
- `src/components/MusicPill.tsx` — reads from `useMusic` hook, renders waveform, toggles mute.

`src/components/Games/GameShell.tsx` becomes a thin layout wrapper around themed skeleton + game body + themed action bar; its internal header is removed.

---

## Section 4 — Slots surface

A real slot machine — themed chassis, 3 reels × 3 visible symbols, illuminated payline across the middle row, vertical scrolling spin animation.

**Anatomy:**
- Themed chassis wraps the slot window per `themeManifesto.<theme>.surface` + `border`. Variants:
  - Sweets: pillowy candy + double-pink shell + gummy lever
  - Egypt: gold-plated sarcophagus + hieroglyph engravings + scarab lever
  - Space: neon-edged metal + grid pattern + holographic lever
  - Wild West: wood + iron rivets + horseshoe lever
  - Ocean: coral with bubbles + bioluminescent lights + trident lever
  - Jungle: vine-wrapped wood + carved stone + bone lever
  - Vampire: black marble + crimson glow + bat-wing lever
  - Ninja: dark wood + shoji panels + katana-pull lever
- 3 reels × 3 visible symbols. **Middle row = the payline** (what `evaluateSlotsResult` evaluates). Top and bottom rows are decorative — they show "what was just on the reel" and "what's coming next" so the spin feels like a real reel scrolling.
- Live vs dim cells: middle row bright and crisp; top/bottom dimmed and slightly blurred. Operator's eyes go straight to the payline.
- Payline marker: horizontal LED strip across the middle of the slot window with arrow markers on both sides. Per-theme styling.
- Bottom LED bar: idle gentle theme-coloured glow; small win = chase pattern; jackpot = celebration trigger.

**Spin animation:**
- Vertical scroll: each reel translates Y from 0 to `-N × symbolHeight` with a tween over ~2s. Symbols stack vertically in a 24-deep virtual list (sampled from the 4 Gemini symbols with a deterministic final-3 ending).
- Staggered stop: left at ~1.5s, middle at ~2.0s, right at ~2.5s.
- Easing: `cubic-bezier(0.15, 0, 0.25, 1)` with a small overshoot bounce at the end.
- Optional motion blur during scroll, clears on stop.
- Sound: theme-specific spin loop (existing `soundEngine.playSlotSpin`) + per-reel "click" sample (gummy-thunk for sweets, latch-clack for ninja, etc.) on each reel's stop.

**Win animation:**
- Payline strip glows brighter and pulses outward from centre.
- Winning symbols (3 in payline row) pulse and scale ~1.1× with a yellow ring (existing — kept).
- Bottom LED bar runs a chase pattern in theme accent.
- Triggers Section 7 themed celebration anchored to the slot window.
- Win amount counter ticks up in balance pill.

**Bug fixes (folded in):**
- The existing `Slots.tsx:148` check `symbol.startsWith('data:')` is replaced with `/^https?:/.test(src)` so signed GCS URLs render as `<img>`. Emoji fallbacks render as text. This unblocks the Gemini symbols actually appearing.
- The existing one-shot reel-init effect (`reels[0] === ''` guard) is replaced with one that re-runs whenever the loaded asset URLs change. No more stuck-on-fallback-emoji behaviour.

**New components:**
- `src/components/Games/Slots/SlotMachine.tsx` — orchestrator (replaces today's `Slots.tsx` JSX; logic moves to hook).
- `src/components/Games/Slots/SlotChassis.tsx` — themed wrapper.
- `src/components/Games/Slots/SlotReel.tsx` — one reel with 3 visible cells, Framer-Motion vertical scroll, staggered stop, per-reel click.
- `src/components/Games/Slots/SlotSymbol.tsx` — single symbol, routes between `<img>` (URL) and emoji fallback.
- `src/hooks/useSlotsGame.ts` — game state (spinning, reels, win, message).

Existing `evaluateSlotsResult` kept verbatim.

---

## Section 5 — Roulette surface

A real European single-zero wheel.

**Wheel anatomy:**
- SVG wheel: 37 wedge segments (single-zero European), alternating red/black with green at 0, generated programmatically. Number labels on a virtual ring at radius 82, rotated to align radially.
- Themed outer rim per `themeManifesto.<theme>.border`:
  - Sweets: candy-pink double rim with white inner stripe
  - Egypt: gold-leaf rim with carved hieroglyph notches
  - Space: neon-tube rim that glows
  - Wild West: wagon-wheel rim with iron spokes
  - Ocean: shell rim with bioluminescent edge
  - Jungle: stone calendar rim with carved glyphs
  - Vampire: gothic crimson rim with candle wax drips
  - Ninja: shoji-screen rim with katana corner notches
- Inner cone: themed centre piece showing the winning number once the spin lands (in the theme display font). Idle: small motif (sweets candy, egypt eye-of-horus, etc.).
- Pointer: fixed at 12 o'clock, doesn't rotate. Themed shape.
- Themed ball: orbits during spin, settles in result pocket. Per-theme: gumball / scarab / asteroid / bullet / pearl / carved-stone / blood-drop / shuriken.

**Spin animation:**
- Wheel: rotates clockwise ~5 full turns (1800°) in 2.5s with cubic decel, settling at the result angle (`-resultNumber × (360 / 37)` from a fixed starting orientation).
- Ball: orbits counter-clockwise ~7 turns in 2.5s with decel, lands in the pocket at the result angle. Rendered outside the rotating wheel group so its path is independent.
- Sound: existing `soundEngine.playRouletteSpin` for the loop; "click" per wheel-segment-pass during decel; "drop" when the ball settles.
- Idle: very slow ambient rotation per `themeManifesto.<theme>.motion.idle`; pauses on hover. Cone breathes with 4s scale pulse.

**Bet table:**
- Felt-cloth background (diagonal stripe texture over green/themed felt) so it reads as a casino table.
- 4 bet cells: RED / BLACK / EVEN / ODD, each with its own visual treatment (red gradient, black gradient, diagonal red/black split for EVEN, mirror for ODD).
- Active state: themed chip drops onto the selected cell with bet amount on it (translateY + bounce). Cell gets a yellow ring + lift.
- Hover: subtle lift. Disabled while spinning.

**Result strip:**
- Below the bet table: themed result strip — *"Landed on [pocket] · You won 20!"* with the result number rendered as a coloured pocket badge matching the wheel segment colour.
- On loss: *"Landed on [pocket] · Better luck next round."* in dimmer themed text.
- Slides in from bottom on result, dwells 4s, fades on next spin.

**Win animation:**
- Result pocket pulses in theme accent.
- Inner cone pulses larger; winning number flashes.
- Triggers Section 7 themed celebration anchored to the wheel.
- Win amount counter ticks up in balance pill.

**New components:**
- `src/components/Games/Roulette/RouletteWheel.tsx` — pure SVG wheel renderer.
- `src/components/Games/Roulette/RouletteSegments.tsx` — generates 37 wedge paths + number labels (memoised pure function).
- `src/components/Games/Roulette/BetTable.tsx` — felt cloth + 4 bet cells + chip drop.
- `src/components/Games/Roulette/ResultStrip.tsx` — pocket badge + result message.
- `src/hooks/useRouletteGame.ts` — game state.

Existing `evaluateRouletteBet` and `RouletteColour` kept verbatim. New pure helper: `angleOfPocket(n) = n × (360 / 37)`.

---

## Section 6 — Bingo surface

Themed bingo card on a themed table surface.

**Card anatomy:**
- Themed card frame replaces the current hot-pink heavy border. Per `themeManifesto.<theme>.surface` + `border`:
  - Sweets: candy-bar card with side wrapper twists
  - Egypt: papyrus scroll card
  - Space: holographic translucent panel
  - Wild West: wanted-poster card
  - Ocean: coral card
  - Jungle: stone-tablet card
  - Vampire: parchment card with crimson seal
  - Ninja: rice-paper card with ink-brush border
- 3×3 number grid kept (matches existing `makeBoard` + `evaluateBingoBoard`).
- Cells: white rounded squares with the number in the theme display font.
- Marker overlay on matched cells: animated themed marker drops with a "stamp" animation (`scale(0.4) → scale(1)` with overshoot). Per-theme: gummy-bear / scarab / alien-blob / bullet-hole / pearl / carved-stone / bat-mark / shuriken. The marker mostly covers the cell; the number shows on top in white with shadow.
- Line-complete highlight: when a row/column/diagonal completes, all 3 cells get a yellow ring outline that persists.

**Side panel (right):**
- JUST CALLED: large themed circular badge (50% width of side panel) showing the most recent number. Bouncy entrance per call (existing logic kept). Themed: candy ball for sweets, hieroglyph cartouche for egypt, holographic orb for space, kanji-stamp for ninja.
- LINES tracker: 4 rows showing Row 1 / Row 2 / Row 3 / Cols & Diagonals, each with ✓ or pending. Operators see at a glance how close to a bingo.

**Called-so-far track (below card):**
- 15-column × 2-row grid showing all 30 numbers in the pool. Numbers called light up in theme accent.
- Caption: *"Called so far · 7 / 12"* (total drawn over `drawCount >= 12` ceiling from existing logic).
- Lit cells stay lit; reset only on new round.

**Win animation:**
- Completing line cells flash + scale (existing kept).
- "BINGO!" banner sweeps across the card in theme display font.
- Triggers Section 7 themed celebration anchored to the card.
- Win amount counter ticks up in balance pill.

**New components:**
- `src/components/Games/Bingo/BingoCard.tsx` — themed card frame + 3×3 grid.
- `src/components/Games/Bingo/BingoCell.tsx` — single cell with number + marker overlay animation.
- `src/components/Games/Bingo/BingoMarker.tsx` — themed marker, switches on manifesto.
- `src/components/Games/Bingo/CalledPanel.tsx` — JUST CALLED badge + LINES tracker.
- `src/components/Games/Bingo/CalledTrack.tsx` — 1-30 strip.
- `src/hooks/useBingoGame.ts` — game state.

Existing `makeBoard` and `evaluateBingoBoard` kept verbatim. The lines tracker derives from the same eval (exposes which lines completed, not just "any").

---

## Section 7 — Win &amp; loss feedback

Three tiers, all themed via `themeManifesto.<theme>.celebration`.

### Small win (~3s, anchored)

- Themed pill banner anchored above the winning element (slot payline / bingo line / roulette pocket).
- Themed marker icon + game-specific message + win amount in theme accent ("Sweet match! +30").
- Small particle burst around the banner (8-12 themed particles).
- Auto-dismisses after 3s. Doesn't block input — player can re-bet during dwell.

### Jackpot (~5s, full-screen takeover)

- Full-screen overlay with themed gradient background pulse (no more black). Theme colour at high saturation.
- Themed particle field (40-60 particles): candies / sand-storm / supernova / dust / bubbles / parrots / bats / cherry blossoms.
- Big themed "JACKPOT!" label + payout counter ticking from 0 to final value (~1.2s) in theme display font, large size.
- Themed jackpot label voice ("Yeehaw, jackpot!" / "Pharaoh's bounty!" / "Cosmic jackpot!" / "Cursed fortune!" / "Honour rewarded!" / etc.).
- Continue button (themed) or auto-dismiss after 5s.
- Replaces `react-confetti`.

### Loss / no-win (~2s, quiet)

- Themed plate (not just plain text) anchored at centre-bottom of game widget.
- Theme-voice message ("Not this round!" / "Tomb's silence." / "Stars misaligned." / etc.).
- Optional contextual hint where it adds value (only when trivially computable from current round state):
  - Bingo: "Closest line was Row 2 — needed 1 more." (only when one line is exactly 1 cell from completing; otherwise omit)
  - Roulette: "Landed on N (red), you bet odd."
  - Slots: omit (no useful context to surface)
- No flash; subtle themed "miss" wiggle on the game widget.

### Particle system

- Custom Framer-Motion-driven system replaces `react-confetti`. Each theme defines a particle pool (8-12 SVG / emoji shapes) and motion params (initial velocity range, gravity, lifetime).
- Particle count: small ≈ 8-12, jackpot ≈ 40-60 (capped via `requestAnimationFrame` budget).
- `prefers-reduced-motion`: falls back to static themed icon burst (no animation) and the win amount counter.

### Win amount counter

- Both small-win banners and jackpot overlays show the payout amount, ticking from 0 to the final value over ~600ms (small) or ~1200ms (jackpot).
- Themed display font, large size (especially jackpots).
- Balance pill in header simultaneously animates the same delta — player sees "where the money goes."

### Audio

- Existing `soundEngine.playWin` / `playLose` kept as the per-theme sound layer.
- Jackpot adds a second "fanfare" sample per theme (organ chord for vampire, taiko hit for ninja, brass for west, choir for egypt, synth-rise for space, marimba for ocean, jungle-call for jungle, music-box for sweets).
- Loss plays a short low-key cue — never silence.

### New components

- `src/components/Themed/ThemedCelebration.tsx` — single entry point. Props: `tier: 'small' | 'jackpot' | 'loss'`, `amount?: number`, `anchor?: HTMLElement`, `contextHint?: string`. Switches on the manifesto's celebration discriminator.
- `src/components/Themed/ParticleField.tsx` — generic particle renderer driven by per-theme particle definition.
- `src/components/Themed/WinAmountCounter.tsx` — animated counter, themed font.
- `src/components/Themed/CelebrationOverlay.tsx` — full-screen takeover for jackpot tier.
- Per-theme particle definitions in `src/utils/themeParticles.ts` (alongside `themeManifesto.ts`).

`GameShell.tsx` replaces today's inline `<AnimatePresence>` blocks with a single `<ThemedCelebration tier={…} amount={…} />` call. `react-confetti` dependency removed.

---

## Section 8 — Cross-cutting

### Loading states (3 contexts)

- **App boot** (≤1s, Firebase Auth): minimal generic spinner. Not part of AI pipeline; no attribution needed.
- **Lobby per-card**: 8 themed skeleton cards, each shimmering in its theme's pattern. Cards resolve independently as `bg_slots_<theme>` returns. Status line above grid: *"Gemini 3.1 generating · N / 8 worlds ready"*.
- **Game page**: themed skeleton of game widget (slot chassis with skeleton reels, wheel with skeleton segments, card with skeleton cells) + status pill at bottom of action bar with real progress: *"Gemini 3.1 · 3 / 4 symbols · Lyria 3 composing soundtrack · ~6s remaining"*.
- **Regenerate everything mid-flight**: lobby pitch strip transforms into live progress: *"Re-rolling 8 worlds · 47 / 105 assets · Lyria 3 composing 24 tracks"*. Themed-skeleton cards re-appear in place.

### Typography scale

| Level | Font | Use |
|---|---|---|
| Display | themed font · 36-48px · 1.0lh | Game titles, win labels |
| H1 | themed font · 24px · 1.1lh | Page heroes |
| H2 | Inter 700 · 18px · 1.3lh | Section heads |
| Body | Inter 400 · 14px · 1.55lh | Paragraphs |
| Label | Inter 600 · 11px · uppercase · 0.08em | "JUST CALLED", "BET" |
| Monospace | monospace 700 · 14px | Currency amounts |
| Micro | Inter 400 · 10px · 0.6 opacity | Captions, timing |

Themed display fonts (Chewy / Cinzel / Orbitron / Rye / Pattaya / Bangers / Creepster / Shojumaru) carry per-world feel. Body and labels always Inter — readability over personality. Monospace for currency (alignment matters in casino UI).

### Spacing scale

4-unit grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Replaces today's vh-based ad-hoc sizing (`w-[15vh]`, `border-[1vh]`).

Game widgets switch to a fixed-but-responsive scale: a base size at 1024px viewport with a single CSS scale variable for proportional growth on larger viewports. Tested at 1024px / 1440px / 1920px.

### Motion vocabulary

| Duration | Easing | Use |
|---|---|---|
| instant — 0.1s | ease-out | Button press, hover |
| quick — 0.25s | ease-out | Banner slide-in, marker stamp |
| standard — 0.4s | cubic-bezier(0.2, 0.8, 0.2, 1) | Card lift, panel transitions |
| slow — 1.2s | ease-in-out | Win amount counter |
| spin — 2.5s | cubic-bezier(0.15, 0, 0.25, 1) | Slot reels, roulette wheel |

Per-theme idle motion: subtle ±2px sine wave on game widgets, theme-specific (sweets jiggle, vampire flicker, space pulse, ninja drift).

`prefers-reduced-motion` respected globally via a central `useMotion()` hook that wraps Framer Motion variants with reduced-motion fallback. Idle motions stop; spin animations skip staggered stops; particle counts halve; counter ticks become instant.

### UI sounds

Extends existing `soundEngine`:
- Per-theme button click sample (`themeManifesto.<theme>.audio.click`) on every primary button press.
- Per-reel-stop click in slots (8 theme samples, ≤30KB each).
- Per-marker-stamp in bingo.
- Mute control in header ⋯ menu mutes both Lyria music and UI sounds. State persists in localStorage. Music pill shows muted state with strikethrough on waveform.

### Accessibility

- WCAG AA contrast minimum on all text. Themed plates and HUD glass surfaces meet the floor (today's plain text on bg art often doesn't).
- All interactive elements have visible focus rings (theme-accent-coloured 3px ring).
- `prefers-reduced-motion` respected.
- Game widgets keyboard-accessible: roulette bet cells with Tab/Enter, slot SPIN with Space, bingo card play with Enter.
- Screen reader labels on all icon-only buttons.
- Win amount counter announces final value via `aria-live` (not per-tick — would spam).

### Responsive

- Desktop-first (1024 / 1440 / 1920) — operator demo viewport.
- Tablet (768-1024): action bar stacks (bet cluster above primary button); lobby drops to 2 columns; bingo side panel stacks below card.
- Mobile (≤768): supported but not optimised. Lobby 1 column; game pages keep desktop layout at min scale; CES messenger overlay hidden.
- No PWA / installable app.

### CES messenger

- Kept as the floating bottom-right bubble (separate AI showcase per project history).
- Theme-aware position: bottom-right on lobby; bottom-left on game pages so it doesn't overlap the primary action button.
- Themed bubble colour matches active theme accent.
- Existing `game_carousel` Handlebars template (now in `public/ces-init.js`) unchanged.

---

## Files affected

### New files

- `src/utils/themeManifesto.ts` — typed manifesto map.
- `src/utils/themeParticles.ts` — per-theme particle definitions.
- `src/hooks/useTheme.ts` — manifesto access hook.
- `src/hooks/useMotion.ts` — motion hook with reduced-motion fallback.
- `src/hooks/useSlotsGame.ts`, `useRouletteGame.ts`, `useBingoGame.ts` — game state hooks.
- `src/components/Themed/ThemedButton.tsx`
- `src/components/Themed/ThemedCard.tsx`
- `src/components/Themed/ThemedSkeleton.tsx`
- `src/components/Themed/ThemedCelebration.tsx`
- `src/components/Themed/CelebrationOverlay.tsx`
- `src/components/Themed/ParticleField.tsx`
- `src/components/Themed/WinAmountCounter.tsx`
- `src/components/Layout/AppHeader.tsx` — single contextual header.
- `src/components/MusicPill.tsx`
- `src/components/Games/BetControl.tsx` — chip cluster + stepper.
- `src/components/Games/Slots/SlotMachine.tsx`, `SlotChassis.tsx`, `SlotReel.tsx`, `SlotSymbol.tsx`
- `src/components/Games/Roulette/RouletteWheel.tsx`, `RouletteSegments.tsx`, `BetTable.tsx`, `ResultStrip.tsx`
- `src/components/Games/Bingo/BingoCard.tsx`, `BingoCell.tsx`, `BingoMarker.tsx`, `CalledPanel.tsx`, `CalledTrack.tsx`
- 8 theme click-sound samples (≤30KB each).
- 8 theme reel-stop / marker-stamp / fanfare sound samples.

### Modified files

- `src/App.tsx` — replace inline header with `<AppHeader>`; remove duplicate balance/nav.
- `src/components/Lobby.tsx` — replace 24-card grid with 8 themed-world cards; correct "5×5" copy; integrate AI pitch strip + regenerate CTA.
- `src/components/Games/GameShell.tsx` — strip internal header; integrate `<ThemedCelebration>` + themed loading.
- `src/components/Games/Slots.tsx`, `Roulette.tsx`, `Bingo.tsx` — refactored to use new component set + game-state hooks. Game logic functions (`evaluateSlotsResult`, `evaluateRouletteBet`, `evaluateBingoBoard`) kept verbatim.
- `src/utils/themeStyles.ts` — extended (or replaced) by `themeManifesto.ts`.
- `src/index.css` — typography + spacing token CSS custom properties. Tailwind `@theme` extended.
- `package.json` — `react-confetti` removed.

### Removed files

- `src/utils/themeStyles.ts` — replaced by `src/utils/themeManifesto.ts`. Existing call sites (`Slots.tsx`, `Roulette.tsx`, `Bingo.tsx`, `Lobby.tsx`) are updated to read the `font` field from the manifesto. The replacement happens atomically in the same PR — no back-compat shim.

---

## Verification

### Manual (operator-acceptance criteria)

1. **Lobby first impression**: at 1440px, a fresh load shows 8 visually distinct themed world cards within ~5s. The 8 cards each visibly belong to their theme (different surface shape, different display font, different colour) before reading the name.
2. **Regenerate everything**: clicking the lobby CTA shows a live progress bar attributing Gemini 3.1 + Lyria 3, with themed skeleton cards in place. Completes in ≤4 min on a normal connection.
3. **Game page chrome**: only one header bar visible; game title in theme display font is the largest text on screen; bet preset chips work; primary button is themed and unmistakable.
4. **Slots**: Gemini-generated symbols visibly render as images (not as URL text or stuck emoji fallbacks). Spin animation has staggered reel stops. Win triggers the themed celebration anchored to the slot window.
5. **Roulette**: the wheel actually looks like a wheel (segments, numbers, ball, pointer). Spin animation lands the ball in the result pocket. Bet cells look like felt-cloth bet areas; chip drops on selection.
6. **Bingo**: themed markers stamp onto matched cells with overshoot bounce. LINES tracker visibly fills. Called-so-far strip lights up.
7. **Win celebrations**: small wins anchor to the winning element with payout amount and themed particles; jackpots take over the screen with themed gradient + particle field + counter; losses show themed plate with optional contextual hint.
8. **Theme switch sanity**: switching between themes (sweets → ninja → space) visibly transforms the UI's surface, button shape, motion, celebration, and skeleton — not just colour.
9. **Music pill**: visible in header; waveform animates in time with playback; clicking mutes both music and UI sounds.

### Automated tests

- `themeManifesto.ts` exports a complete entry for each of 8 themes (typed map; all 7 token categories present per theme). One test asserts `Object.keys(themeManifesto).length === 8` and each entry has all 7 keys.
- Each themed component (`ThemedButton`, `ThemedCard`, `ThemedSkeleton`, `ThemedCelebration`) renders without crashing for all 8 themes (snapshot or smoke test per theme).
- Slot symbol renderer: `<SlotSymbol src="https://x.com/y.png">` renders an `<img>`; `<SlotSymbol src="🍭">` renders text. Regression guard for the bug fix.
- Slot reel state effect re-runs when symbol URLs update. Test: render with empty assets (renders fallback emojis) → update to URLs → assert reels show URLs.
- Existing game-logic tests (`gameLogic.test.ts`) still pass unchanged — no logic changes.
- Existing CSP test (`server/index.test.ts`) still passes — no server changes.

### Accessibility

- axe-core or similar against the lobby and one game page per game type. Zero violations.
- Manual keyboard-only run: navigate from lobby → game → place bet → play → win/loss → back to lobby without using a mouse.
- macOS VoiceOver / Chrome screen reader: every interactive element announces a useful label; win amounts are announced once when they finalise.

### Performance

- Lobby first-paint ≤ 2s on a fresh load (cached Firebase Auth, cached Tailwind bundle, signed URL fetch for `bg_slots_<theme>` × 8 in parallel).
- Spin animation maintains 60fps on a 2020-era laptop (Chrome perf trace, no dropped frames during the 2.5s spin).
- Particle field: jackpot tier renders 40-60 particles without dropping frames on the same hardware.
- Bundle size budget: total JS ≤ current + 50KB (particle system + new components - `react-confetti` removal).

---

## Out of scope (named explicitly so the spec acknowledges them)

- 5×5 bingo card. Would require changes to `gameLogic.ts::makeBoard`, `evaluateBingoBoard`, and asset pool sizing. Game logic is held stable in this redesign.
- Roulette number bets, dozens, columns, splits, streets. Existing `evaluateRouletteBet` only supports red/black/even/odd; widening to cover real roulette betting is its own scope.
- Tournament / multiplayer / leaderboard features.
- Operator-mode toggle (per-theme regenerate from inside a game page, asset gallery, performance budget overlay). Useful for the demo but nontrivial; could be a follow-on.
- PWA / installable app.
- Per-theme custom Lyria prompts beyond what already exists in `MUSIC_PROMPTS`. The existing 24 tracks are reused.
- Localisation / i18n.
- A11y compliance beyond WCAG AA (AAA contrast, full ATAG, etc.).

---

## Decisions deferred to writing-plans

These are deliberately deferred — they're sequencing and tactical-implementation choices best made when the plan is written, not gaps in the spec:

1. **Component implementation order**: bottom-up (foundation → atoms → molecules → screens) vs top-down (lobby first, then game pages). Bottom-up reduces rework but takes longer to see UI changes; top-down lets the operator demo the new lobby sooner.
2. **Migration strategy**: feature-flag the new lobby and game pages behind a toggle so the old UI keeps working during transition vs full cut-over per PR.
3. **Per-theme manifesto values authoring**: this spec gives one-line vibes per theme + a fully-spec'd sweets example. Concrete CSS values (exact gradients, shadow stacks, particle SVG paths) for the other 7 themes can be authored upfront in the manifesto file or filled in per-theme as components ship. Either is fine; it's a sequencing call.
4. **Sound asset sourcing**: ~32 short audio files (8 theme-click + 8 reel-stop + 8 marker-stamp + 8 fanfare). Royalty-free library, Web Audio synthesis, or a generative pass via Lyria 3 — all viable; pick one in the plan.
5. **Test coverage strategy**: snapshot tests for every themed component variant (×8 themes × ~6 components ≈ 48 snapshots) vs smoke-test one canonical theme and rely on visual review for the rest. The snapshot maintenance cost vs regression-catching value is a tradeoff to call in the plan.
