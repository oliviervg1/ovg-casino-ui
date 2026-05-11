import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalledPanel } from './CalledPanel';

describe('CalledPanel', () => {
  afterEach(() => cleanup());

  it('renders the panel root with data-testid="called-panel"', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect(screen.getByTestId('called-panel')).toBeTruthy();
  });

  it('renders the just-called badge container', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect(screen.getByTestId('just-called-badge')).toBeTruthy();
  });

  it('shows the lastDrawn number inside the badge when set', () => {
    render(<CalledPanel lastDrawn={17} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('17');
  });

  it('renders an empty badge when lastDrawn is null', () => {
    render(<CalledPanel lastDrawn={null} />);
    expect((screen.getByTestId('just-called-badge').textContent ?? '').trim()).toBe('');
  });

  it('updates the badge contents when lastDrawn changes', () => {
    const { rerender } = render(<CalledPanel lastDrawn={5} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('5');
    rerender(<CalledPanel lastDrawn={22} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('22');
  });
});
