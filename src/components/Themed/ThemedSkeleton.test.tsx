import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedSkeleton } from './ThemedSkeleton';

describe('ThemedSkeleton', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} without crashing`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedSkeleton aspectRatio="3/4" data-testid="sk" />);
      expect(screen.getByTestId('sk')).toBeTruthy();
    });
  });

  it('reflects the skeleton variant in a data attribute for visual debugging', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(<ThemedSkeleton aspectRatio="3/4" data-testid="sk" />);
    expect(screen.getByTestId('sk').getAttribute('data-skeleton-variant')).toBe('unwrap');
  });
});
