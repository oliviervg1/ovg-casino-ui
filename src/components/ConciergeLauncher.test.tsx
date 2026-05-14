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
});
