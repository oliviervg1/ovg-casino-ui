import { describe, it, expect } from 'vitest';
import { THEME_NAMES } from './themeManifesto';
import { themeCopy } from './themeCopy';

describe('themeCopy', () => {
  it('every theme has a non-empty entry with all three fields', () => {
    for (const theme of THEME_NAMES) {
      const c = themeCopy[theme];
      expect(c).toBeTruthy();
      expect(c.small.length).toBeGreaterThan(0);
      expect(c.jackpotLabel.length).toBeGreaterThan(0);
      expect(c.loss.length).toBeGreaterThan(0);
    }
  });
});
