import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { SmallWinCard } from './SmallWinCard';

afterEach(() => cleanup());

describe('SmallWinCard', () => {
  it('renders inside a surface-anchored absolute container with backdrop-blur', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    const backdrop = screen.getByTestId('small-win-backdrop');
    const cls = backdrop.className;
    expect(cls).toContain('absolute');
    expect(cls).toContain('inset-0');
    expect(cls).toContain('backdrop-blur');
  });

  it('renders the themed small-win copy from themeCopy[theme].small', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    expect(screen.getByTestId('small-win-backdrop').textContent).toContain('Sweet match!');
  });

  it('dismisses when the backdrop is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={onDismiss} />
      </CelebrationProvider>
    );
    fireEvent.click(screen.getByTestId('small-win-backdrop'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does NOT pass pointer-events-none to the inner card (would let card-body clicks pass through to the backdrop in real browsers)', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    // Structural assertion: jsdom synthetic fireEvent.click ignores CSS
    // pointer-events, so we lock the intent at the className level.
    const card = screen.getByTestId('celebration-card-small');
    expect(card.className).not.toContain('pointer-events-none');
  });
});
