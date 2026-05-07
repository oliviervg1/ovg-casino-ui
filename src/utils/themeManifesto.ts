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
