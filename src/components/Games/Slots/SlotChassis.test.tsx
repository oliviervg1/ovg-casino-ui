import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlotChassis } from './SlotChassis';
import { THEME_NAMES } from '../../../utils/themeManifesto';

describe('SlotChassis', () => {
  afterEach(() => cleanup());

  it('renders children inside a frame', () => {
    render(
      <SlotChassis theme="sweets">
        <div data-testid="inner">x</div>
      </SlotChassis>,
    );
    expect(screen.getByTestId('inner')).toBeTruthy();
  });

  it.each(THEME_NAMES)('exposes data-surface and data-border for theme %s', (theme) => {
    render(<SlotChassis theme={theme}>x</SlotChassis>);
    const frame = screen.getByTestId('slot-chassis');
    expect(frame.getAttribute('data-theme')).toBe(theme);
    expect(frame.getAttribute('data-surface')).toBeTruthy();
    expect(frame.getAttribute('data-border')).toBeTruthy();
  });
});
