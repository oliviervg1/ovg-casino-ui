import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});
