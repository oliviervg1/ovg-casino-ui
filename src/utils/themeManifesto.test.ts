import { describe, it, expect } from 'vitest';
import { themeManifesto, type ThemeType, THEME_NAMES } from './themeManifesto';

describe('themeManifesto', () => {
  it('exports an entry for all 8 theme names', () => {
    expect(THEME_NAMES).toEqual(['sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja']);
    THEME_NAMES.forEach((t: ThemeType) => {
      expect(themeManifesto[t]).toBeDefined();
    });
  });

  it('every manifesto entry has all 9 required keys', () => {
    const requiredKeys = ['displayName', 'font', 'surface', 'button', 'border', 'motionIdle', 'celebration', 'skeleton', 'audioClick'] as const;
    for (const t of THEME_NAMES) {
      const m = themeManifesto[t];
      for (const k of requiredKeys) {
        expect(m[k], `${t}.${k}`).toBeDefined();
      }
    }
  });

  describe('wiggle', () => {
    it('every theme has a wiggle with positive duration_ms and magnitude_px', () => {
      for (const theme of THEME_NAMES) {
        const w = themeManifesto[theme].wiggle;
        expect(w).toBeTruthy();
        expect(w.duration_ms).toBeGreaterThan(0);
        expect(w.magnitude_px).toBeGreaterThan(0);
      }
    });
  });
});
