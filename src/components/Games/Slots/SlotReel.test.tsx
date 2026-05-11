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
});
