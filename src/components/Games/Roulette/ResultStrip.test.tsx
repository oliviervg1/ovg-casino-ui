import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResultStrip } from './ResultStrip';

describe('ResultStrip', () => {
  afterEach(() => cleanup());

  it('renders nothing when resultNum is null', () => {
    render(<ResultStrip resultNum={null} resultColour={null} message={null} />);
    expect(screen.queryByTestId('result-strip')).toBeNull();
  });

  it('renders the pocket badge with the result number when resultNum is set', () => {
    render(<ResultStrip resultNum={17} resultColour="black" message="Landed on 17 (black). Better luck next time." />);
    const badge = screen.getByTestId('result-pocket-badge');
    expect(badge.textContent).toContain('17');
    expect(badge.getAttribute('data-colour')).toBe('black');
  });

  it('renders the message text', () => {
    render(<ResultStrip resultNum={7} resultColour="red" message="Won 20!" />);
    expect(screen.getByTestId('result-strip').textContent).toContain('Won 20!');
  });

  it('badge data-colour reflects the result colour', () => {
    const { rerender } = render(<ResultStrip resultNum={0} resultColour="green" message="Landed on 0." />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('green');
    rerender(<ResultStrip resultNum={36} resultColour="red" message="Landed on 36." />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('red');
  });
});
