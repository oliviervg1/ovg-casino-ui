import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlotReel } from './SlotReel';

describe('SlotReel', () => {
  afterEach(() => cleanup());

  const cells = { top: '🍭', middle: '🧁', bottom: '🍬' };

  it('renders all three cells in order top → middle → bottom', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} />);
    const symbols = screen.getAllByTestId('slot-symbol');
    expect(symbols.length).toBe(3);
    expect(symbols[0].textContent).toContain('🍭');
    expect(symbols[1].textContent).toContain('🧁');
    expect(symbols[2].textContent).toContain('🍬');
  });

  it('marks middle cell as bright and top/bottom as dim via data-state', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} />);
    const reel = screen.getByTestId('slot-reel');
    const cellEls = reel.querySelectorAll('[data-cell]');
    expect(cellEls[0].getAttribute('data-cell')).toBe('top');
    expect(cellEls[1].getAttribute('data-cell')).toBe('middle');
    expect(cellEls[2].getAttribute('data-cell')).toBe('bottom');
    expect(cellEls[0].getAttribute('data-state')).toBe('dim');
    expect(cellEls[1].getAttribute('data-state')).toBe('bright');
    expect(cellEls[2].getAttribute('data-state')).toBe('dim');
  });

  it('exposes data-reel-index for orchestrator wiring', () => {
    render(<SlotReel cells={cells} index={2} spinning={false} />);
    expect(screen.getByTestId('slot-reel').getAttribute('data-reel-index')).toBe('2');
  });

  it('renders the spin scroll stack while spinning', () => {
    render(<SlotReel cells={cells} index={0} spinning={true} pool={['🍭', '🧁', '🍬', '🍩']} />);
    const stack = screen.getByTestId('slot-reel-stack');
    expect(stack).toBeTruthy();
    // 12-deep virtual stack + the 3 final cells stays in DOM during spin.
    const stackCells = stack.querySelectorAll('[data-stack-cell]');
    expect(stackCells.length).toBeGreaterThanOrEqual(12);
  });

  it('does NOT render the spin stack when spinning=false (snaps to static cells)', () => {
    render(<SlotReel cells={cells} index={0} spinning={false} pool={['🍭']} />);
    expect(screen.queryByTestId('slot-reel-stack')).toBeNull();
  });

  it('staggers stop duration by reel index (1.5s / 2.0s / 2.5s)', () => {
    const { rerender } = render(<SlotReel cells={cells} index={0} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel').getAttribute('data-stop-duration')).toBe('1500');
    rerender(<SlotReel cells={cells} index={1} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel').getAttribute('data-stop-duration')).toBe('2000');
    rerender(<SlotReel cells={cells} index={2} spinning={true} pool={['🍭']} />);
    expect(screen.getByTestId('slot-reel').getAttribute('data-stop-duration')).toBe('2500');
  });
});
