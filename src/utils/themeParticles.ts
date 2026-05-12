import type { ThemeType } from './themeManifesto';

export interface ParticleMotion {
  velocityRange: { x: [number, number]; y: [number, number] };
  gravity: number;
  lifetimeMs: [number, number];
  rotation?: { degPerSec: number };
}

export interface ParticleDefinition {
  pool: string[];
  primitives: ('sparkle' | 'dot' | 'arc')[];
  primitiveTint?: string;
  motion: ParticleMotion;
}

export const themeParticles: Record<ThemeType, ParticleDefinition> = {
  sweets:  { pool: ['🍬','🍭','🧁','🍩','🍪','🍯'],     primitives: ['sparkle','dot'],       primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-700,-400]}, gravity: 900, lifetimeMs: [1200,1800], rotation: {degPerSec:360} } },
  egypt:   { pool: ['𓂀','⚱️','🐍','📜','🌅','✨'],      primitives: ['sparkle'],             primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-500,-200]}, gravity: 600, lifetimeMs: [1500,2200], rotation: {degPerSec:90} } },
  space:   { pool: ['✨','🪐','🌠','🚀','⭐','🌌'],       primitives: ['sparkle','dot','arc'], primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-300]}, gravity: 200, lifetimeMs: [1800,2500], rotation: {degPerSec:180} } },
  west:    { pool: ['🤠','🌵','💰','🐎','🌾','🔫'],      primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-350,350],y:[-500,-200]}, gravity: 800, lifetimeMs: [1300,1900], rotation: {degPerSec:120} } },
  ocean:   { pool: ['🐚','🐠','💎','🌊','🪸','🫧'],      primitives: ['arc','dot'],           primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-200,200],y:[-400,-100]}, gravity: 300, lifetimeMs: [2000,2800], rotation: {degPerSec:60} } },
  jungle:  { pool: ['🦜','🦋','🌺','🍃','🌴','🐒'],      primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-300,300],y:[-500,-200]}, gravity: 500, lifetimeMs: [1600,2200], rotation: {degPerSec:90} } },
  vampire: { pool: ['🦇','🩸','🌙','🕷️','⚰️','🥀'],     primitives: ['dot'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-400,400],y:[-600,-200]}, gravity: 400, lifetimeMs: [1800,2400], rotation: {degPerSec:240} } },
  ninja:   { pool: ['🌸','⚔️','🍃','🏯','🎋','🌑'],      primitives: ['arc'],                 primitiveTint: 'var(--theme-accent)', motion: { velocityRange: {x:[-250,250],y:[-500,-200]}, gravity: 350, lifetimeMs: [1700,2400], rotation: {degPerSec:45} } },
};
