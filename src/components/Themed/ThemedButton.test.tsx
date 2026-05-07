import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { ThemedButton } from './ThemedButton';

describe('ThemedButton', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the button variant attribute`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<ThemedButton onClick={() => {}}>Click</ThemedButton>);
      const btn = screen.getByRole('button', { name: 'Click' });
      expect(btn.getAttribute('data-button-variant')).toBeTruthy();
    });
  });

  it('fires onClick', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedButton onClick={() => clicked++}>Spin</ThemedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(1);
  });

  it('does not fire onClick when disabled', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    let clicked = 0;
    render(<ThemedButton onClick={() => clicked++} disabled>Spin</ThemedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(0);
  });

  it('reflects size="hero" in a data attribute', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(<ThemedButton onClick={() => {}} size="hero">Spin</ThemedButton>);
    expect(screen.getByRole('button').getAttribute('data-size')).toBe('hero');
  });
});
