import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResultStrip } from './ResultStrip';

describe('ResultStrip', () => {
  afterEach(() => cleanup());

  it('renders nothing when resultNum is null', () => {
    render(<ResultStrip resultNum={null} resultColour={null} />);
    expect(screen.queryByTestId('result-strip')).toBeNull();
  });

  it('renders the pocket badge with the result number when resultNum is set', () => {
    render(<ResultStrip resultNum={17} resultColour="black" />);
    const badge = screen.getByTestId('result-pocket-badge');
    expect(badge.textContent).toContain('17');
    expect(badge.getAttribute('data-colour')).toBe('black');
  });

  it('renders pocket badge only — no message text', () => {
    render(<ResultStrip resultNum={23} resultColour="red" />);
    expect(screen.getByTestId('result-pocket-badge').textContent).toBe('23');
    // The strip should have NO additional message span. textContent of the strip
    // should equal the pocket number alone.
    expect(screen.getByTestId('result-strip').textContent).toBe('23');
  });

  it('badge data-colour reflects the result colour', () => {
    const { rerender } = render(<ResultStrip resultNum={0} resultColour="green" />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('green');
    rerender(<ResultStrip resultNum={36} resultColour="red" />);
    expect(screen.getByTestId('result-pocket-badge').getAttribute('data-colour')).toBe('red');
  });
});
