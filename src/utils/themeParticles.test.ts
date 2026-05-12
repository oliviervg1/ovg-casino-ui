import { describe, it, expect } from 'vitest';
import { THEME_NAMES } from './themeManifesto';
import { themeParticles } from './themeParticles';

describe('themeParticles', () => {
  it('every theme has a non-empty entry', () => {
    for (const theme of THEME_NAMES) {
      const p = themeParticles[theme];
      expect(p).toBeTruthy();
      expect(p.pool.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(p.primitives)).toBe(true);
      expect(p.motion).toBeTruthy();
    }
  });

  it('motion ranges are sensible (gravity ≥ 0, lifetimes ascending)', () => {
    for (const theme of THEME_NAMES) {
      const m = themeParticles[theme].motion;
      expect(m.gravity).toBeGreaterThanOrEqual(0);
      expect(m.lifetimeMs[0]).toBeLessThan(m.lifetimeMs[1]);
      expect(m.velocityRange.x[0]).toBeLessThanOrEqual(m.velocityRange.x[1]);
      expect(m.velocityRange.y[0]).toBeLessThanOrEqual(m.velocityRange.y[1]);
    }
  });

  it('primitives only contain valid names', () => {
    const valid = new Set(['sparkle', 'dot', 'arc']);
    for (const theme of THEME_NAMES) {
      for (const p of themeParticles[theme].primitives) {
        expect(valid.has(p)).toBe(true);
      }
    }
  });
});
