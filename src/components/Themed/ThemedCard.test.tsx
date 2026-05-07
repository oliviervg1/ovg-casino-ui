import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedCard } from './ThemedCard';

describe('ThemedCard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the surface variant attribute`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedCard data-testid="c">child</ThemedCard>);
      const el = screen.getByTestId('c');
      expect(el.getAttribute('data-surface-variant')).toBeTruthy();
      expect(el.textContent).toContain('child');
    });
  });

  it('fires onClick when clicked', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedCard onClick={() => clicked++} data-testid="c">x</ThemedCard>);
    fireEvent.click(screen.getByTestId('c'));
    expect(clicked).toBe(1);
  });

  it('does not fire onClick when disabled', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedCard onClick={() => clicked++} disabled data-testid="c">x</ThemedCard>);
    fireEvent.click(screen.getByTestId('c'));
    expect(clicked).toBe(0);
  });
});
