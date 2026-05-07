import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MenuDropdown } from './MenuDropdown';

describe('MenuDropdown', () => {
  afterEach(() => cleanup());

  function setup(overrides: Partial<React.ComponentProps<typeof MenuDropdown>> = {}) {
    const handlers = {
      onProfile: () => { (handlers as any)._profile = ((handlers as any)._profile ?? 0) + 1; },
      onRules: () => { (handlers as any)._rules = ((handlers as any)._rules ?? 0) + 1; },
      onHelp: () => { (handlers as any)._help = ((handlers as any)._help ?? 0) + 1; },
      onLogout: () => { (handlers as any)._logout = ((handlers as any)._logout ?? 0) + 1; },
      ...overrides,
    };
    render(<MenuDropdown {...handlers as any} />);
    return handlers as any;
  }

  it('renders a button labelled "Open menu" and the menu is closed by default', () => {
    setup();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu on click and shows the four items', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /rules/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /help/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeTruthy();
  });

  it('fires the matching callback and closes the menu when an item is clicked', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /profile/i }));
    expect(h._profile).toBe(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes when Escape is pressed', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes when a click happens outside the dropdown', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
