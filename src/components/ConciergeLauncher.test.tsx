import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConciergeLauncher } from './ConciergeLauncher';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ConciergeLauncher />
    </MemoryRouter>
  );
}

function mountCesElement(opts?: {
  open?: () => void;
  display?: string;
}): HTMLElement {
  const cesm = document.createElement('ces-messenger');
  if (opts?.open) (cesm as unknown as { open: () => void }).open = opts.open;
  if (opts?.display) cesm.style.display = opts.display;
  document.body.appendChild(cesm);
  return cesm;
}

afterEach(() => {
  cleanup();
  document.querySelectorAll('ces-messenger').forEach((el) => el.remove());
});

describe('ConciergeLauncher', () => {
  it('renders nothing when no <ces-messenger> is in the document', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });

  it('renders the launcher button when <ces-messenger> is in the document', () => {
    mountCesElement();
    renderAt('/');
    const button = screen.getByRole('button', { name: /talk to concierge/i });
    expect(button).toBeTruthy();
    expect(button.textContent).toMatch(/Talk to concierge/);
  });

  it('renders title + subtitle text in the DOM (subtitle visibility is CSS-controlled)', () => {
    mountCesElement();
    renderAt('/');
    const button = screen.getByRole('button', { name: /talk to concierge/i });
    expect(button.textContent).toMatch(/Talk to concierge/);
    expect(button.textContent).toMatch(/Help, tips, anything/);
  });

  it('hides the launcher after a ces-chat-open-changed event with isOpen=true', () => {
    mountCesElement();
    renderAt('/');
    expect(screen.getByRole('button', { name: /talk to concierge/i })).toBeTruthy();
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: true } })
      );
    });
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });

  it('re-renders the launcher after a ces-chat-open-changed event with isOpen=false', () => {
    mountCesElement();
    renderAt('/');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: true } })
      );
    });
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
    act(() => {
      window.dispatchEvent(
        new CustomEvent('ces-chat-open-changed', { detail: { isOpen: false } })
      );
    });
    expect(screen.getByRole('button', { name: /talk to concierge/i })).toBeTruthy();
  });

  describe('theme-specific avatar', () => {
    const cases: Array<[string, string, string]> = [
      // route, expected avatar, theme name
      ['/',                  '✨', 'lobby'],
      ['/profile',           '✨', 'lobby'],
      ['/world/sweets',      '🍭', 'sweets'],
      ['/world/egypt',       '𓂀', 'egypt'],
      ['/world/space',       '🚀', 'space'],
      ['/world/west',        '🤠', 'west'],
      ['/world/ocean',       '🐚', 'ocean'],
      ['/world/jungle',      '🌿', 'jungle'],
      ['/world/vampire',     '🦇', 'vampire'],
      ['/world/ninja',       '🥷', 'ninja'],
    ];

    it.each(cases)('renders %s with the %s avatar (%s)', (route, expectedAvatar) => {
      mountCesElement();
      renderAt(route);
      const button = screen.getByRole('button', { name: /talk to concierge/i });
      const avatar = button.querySelector('.concierge-avatar');
      expect(avatar?.textContent).toBe(expectedAvatar);
    });
  });

  it('renders nothing when <ces-messenger> is in the document but display:none', () => {
    mountCesElement({ display: 'none' });
    renderAt('/');
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();
  });

  it('appears after a ces-messenger-loaded event when the element was missing at mount', () => {
    // Simulate the race: React mounts before <ces-messenger> exists in the DOM.
    renderAt('/');
    expect(screen.queryByRole('button', { name: /talk to concierge/i })).toBeNull();

    // The custom-element upgrade lands later (typical for an async script
    // from gstatic.com). We mirror that by inserting the element + dispatching
    // the load event the messenger emits at the end of upgrade.
    mountCesElement();
    act(() => {
      window.dispatchEvent(new Event('ces-messenger-loaded'));
    });

    expect(screen.getByRole('button', { name: /talk to concierge/i })).toBeTruthy();
  });

  describe('click behavior', () => {
    it('invokes cesm.open() when the method is present', () => {
      const open = vi.fn();
      mountCesElement({ open });
      renderAt('/');
      fireEvent.click(screen.getByRole('button', { name: /talk to concierge/i }));
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('dispatches a click MouseEvent on cesm when open() is absent', () => {
      const cesm = mountCesElement();
      const dispatch = vi.spyOn(cesm, 'dispatchEvent');
      renderAt('/');
      fireEvent.click(screen.getByRole('button', { name: /talk to concierge/i }));
      const calls = dispatch.mock.calls.filter(
        ([e]) => e instanceof MouseEvent && e.type === 'click'
      );
      expect(calls.length).toBe(1);
    });
  });
});
