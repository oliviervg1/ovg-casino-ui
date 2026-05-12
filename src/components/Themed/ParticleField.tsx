import { useMemo } from 'react';
import { motion as fmotion } from 'motion/react';
import { useMotion } from '../../hooks/useMotion';
import type { ParticleMotion } from '../../utils/themeParticles';
import { Sparkle } from './particles/Sparkle';
import { Dot } from './particles/Dot';
import { Arc } from './particles/Arc';

interface Props {
  pool: string[];
  primitives: ('sparkle' | 'dot' | 'arc')[];
  primitiveTint?: string;
  count: number;
  motion: ParticleMotion;
}

const PRIMITIVE_MAP = { sparkle: Sparkle, dot: Dot, arc: Arc } as const;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function ParticleField({ pool, primitives, primitiveTint, count, motion: motionDef }: Props) {
  const reduced = !useMotion().shouldAnimate;

  const items = useMemo(() => {
    const slots: ('emoji' | 'sparkle' | 'dot' | 'arc')[] = [
      ...pool.map(() => 'emoji' as const),
      ...primitives,
    ];
    return Array.from({ length: count }, (_, i) => {
      const kind = slots[Math.floor(Math.random() * slots.length)];
      if (kind === 'emoji') {
        return { kind: 'emoji' as const, glyph: pool[Math.floor(Math.random() * pool.length)], key: i };
      }
      return { kind, key: i };
    });
  }, [pool, primitives, count]);

  if (reduced) {
    return (
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ color: primitiveTint }}>
        <div data-testid="particle-static" className="flex gap-2 flex-wrap justify-center max-w-xs">
          {items.map(item => (
            <span key={item.key} data-testid="particle-item" className="text-2xl">
              {item.kind === 'emoji'
                ? item.glyph
                : (() => { const C = PRIMITIVE_MAP[item.kind]; return <C size={20} />; })()}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ color: primitiveTint }}>
      {items.map(item => {
        const vx = rand(motionDef.velocityRange.x[0], motionDef.velocityRange.x[1]);
        const vy = rand(motionDef.velocityRange.y[0], motionDef.velocityRange.y[1]);
        const lifetime = rand(motionDef.lifetimeMs[0], motionDef.lifetimeMs[1]) / 1000;
        const finalX = vx * lifetime;
        const finalY = vy * lifetime + 0.5 * motionDef.gravity * lifetime * lifetime;
        const rot = motionDef.rotation ? motionDef.rotation.degPerSec * lifetime : 0;
        return (
          <fmotion.span
            key={item.key}
            data-testid="particle-item"
            className="absolute left-1/2 top-1/2 text-2xl"
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: finalX, y: finalY, opacity: 0, rotate: rot }}
            transition={{ duration: lifetime, ease: 'easeOut' }}
          >
            {item.kind === 'emoji'
              ? item.glyph
              : (() => { const C = PRIMITIVE_MAP[item.kind]; return <C size={16} />; })()}
          </fmotion.span>
        );
      })}
    </div>
  );
}
