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

interface Wiggle { duration_ms: number; magnitude_px: number; }

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
  wiggle: Wiggle;
}

export const themeManifesto: Record<ThemeType, Manifesto> = {
  sweets: { displayName: 'Sweets', font: 'font-sweets', surface: 'pillowy-glass', button: 'gummy-3d', border: 'candy-wrapper', motionIdle: 'jiggle', celebration: 'candy-burst', skeleton: 'unwrap', audioClick: 'candy-crinkle', wiggle: { duration_ms: 300, magnitude_px: 4 } },
  egypt: { displayName: 'Egypt', font: 'font-egypt font-bold', surface: 'parchment', button: 'scarab-cartouche', border: 'gold-leaf', motionIdle: 'pulse', celebration: 'sandstorm-gold', skeleton: 'hieroglyph-fade', audioClick: 'parchment-rustle', wiggle: { duration_ms: 250, magnitude_px: 3 } },
  space: { displayName: 'Space', font: 'font-space font-bold', surface: 'holographic', button: 'neon-rim', border: 'neon-line', motionIdle: 'pulse', celebration: 'supernova', skeleton: 'hyperspace-streak', audioClick: 'laser-blip', wiggle: { duration_ms: 200, magnitude_px: 4 } },
  west: { displayName: 'Wild West', font: 'font-west', surface: 'wood-iron', button: 'branded-leather', border: 'rope-iron', motionIdle: 'sway', celebration: 'dust-storm', skeleton: 'wagon-wheel', audioClick: 'spur-jingle', wiggle: { duration_ms: 350, magnitude_px: 5 } },
  ocean: { displayName: 'Ocean', font: 'font-ocean', surface: 'coral', button: 'bubble', border: 'kelp-frame', motionIdle: 'drift', celebration: 'bioluminescent-burst', skeleton: 'sonar-ripple', audioClick: 'bubble-pop', wiggle: { duration_ms: 400, magnitude_px: 3 } },
  jungle: { displayName: 'Jungle', font: 'font-jungle tracking-wider', surface: 'mossy-stone', button: 'vine-wrap', border: 'vine', motionIdle: 'sway', celebration: 'parrot-flock', skeleton: 'vine-grow', audioClick: 'wood-knock', wiggle: { duration_ms: 300, magnitude_px: 4 } },
  vampire: { displayName: 'Vampire', font: 'font-vampire tracking-wider', surface: 'black-marble', button: 'velvet-pill', border: 'gothic-arch', motionIdle: 'flicker', celebration: 'bat-swarm', skeleton: 'candle-flicker', audioClick: 'velvet-tap', wiggle: { duration_ms: 400, magnitude_px: 6 } },
  ninja: { displayName: 'Ninja', font: 'font-ninja', surface: 'dark-wood-paper', button: 'seal-stamp', border: 'ink-brush', motionIdle: 'drift', celebration: 'cherry-blossom-storm', skeleton: 'ink-bleed', audioClick: 'sword-tap', wiggle: { duration_ms: 150, magnitude_px: 5 } },
};
