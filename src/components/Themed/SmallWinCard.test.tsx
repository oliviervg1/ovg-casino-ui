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

  it('centers the card via explicit absolute+transform positioning (bulletproof against flex intrinsic-width quirks)', () => {
    // Earlier `flex items-center justify-center` on the backdrop produced an
    // off-center result against ThemedCelebrationCard's intrinsic-width
    // wrapper (auto width + percentage max-w child resolved
    // non-deterministically in real browsers). Switched to an explicit
    // absolute+transform positioner. This structural assertion locks the
    // pattern; jsdom can't compute layout to verify the visual centering
    // directly.
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    const positioner = screen.getByTestId('small-win-positioner');
    const cls = positioner.className;
    expect(cls).toContain('absolute');
    expect(cls).toContain('top-1/2');
    expect(cls).toContain('left-1/2');
    expect(cls).toContain('-translate-x-1/2');
    expect(cls).toContain('-translate-y-1/2');
  });

  it('backdrop no longer uses flex centering (replaced by explicit positioner)', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    const cls = screen.getByTestId('small-win-backdrop').className;
    // The backdrop only owns the dim+blur layer + the click-to-dismiss
    // surface. The centering moved to the inner positioner.
    expect(cls).not.toContain('justify-center');
    expect(cls).not.toContain('items-center');
  });
});
