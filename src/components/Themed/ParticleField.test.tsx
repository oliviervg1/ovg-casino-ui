import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ParticleField } from './ParticleField';
import type { ParticleMotion } from '../../utils/themeParticles';

const motion: ParticleMotion = {
  velocityRange: { x: [-100, 100], y: [-200, -100] },
  gravity: 500,
  lifetimeMs: [1000, 1500],
};

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('ParticleField', () => {
  afterEach(() => cleanup());

  it('renders the requested count of particles', () => {
    const { container } = render(
      <ParticleField pool={['🍬','🍭']} primitives={[]} count={10} motion={motion} />
    );
    expect(container.querySelectorAll('[data-testid="particle-item"]').length).toBe(10);
  });

  it('mixes pool emojis and primitives into the rendered set', () => {
    const { container } = render(
      <ParticleField pool={['🍬']} primitives={['sparkle','dot']} count={30} motion={motion} primitiveTint="#f0f" />
    );
    const items = container.querySelectorAll('[data-testid="particle-item"]');
    expect(items.length).toBe(30);
    const html = container.innerHTML;
    expect(html).toContain('🍬');
    expect(html).toContain('<svg');
  });

  it('wrapper has aria-hidden="true"', () => {
    const { container } = render(
      <ParticleField pool={['🍬']} primitives={[]} count={1} motion={motion} />
    );
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ParticleField (reduced motion)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
  });
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); });

  it('renders particles in a static layout (no Framer animate props on motion.div)', async () => {
    const { ParticleField: ReducedField } = await import('./ParticleField');
    const { container } = render(
      <ReducedField pool={['🍬']} primitives={[]} count={6} motion={motion} />
    );
    const items = container.querySelectorAll('[data-testid="particle-item"]');
    expect(items.length).toBe(6);
    expect(container.querySelector('[data-testid="particle-static"]')).toBeTruthy();
  });
});
