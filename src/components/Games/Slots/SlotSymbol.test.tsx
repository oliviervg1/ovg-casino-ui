import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlotSymbol } from './SlotSymbol';

describe('SlotSymbol', () => {
  afterEach(() => cleanup());

  it('renders an <img> when src is an https URL (Gemini signed URL)', () => {
    render(<SlotSymbol src="https://storage.googleapis.com/x/y.png" alt="sweet" />);
    const img = screen.getByRole('img', { name: 'sweet' });
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://storage.googleapis.com/x/y.png');
  });

  it('renders an <img> when src is an http URL (rare, but symmetric)', () => {
    render(<SlotSymbol src="http://example.com/x.png" alt="sweet" />);
    expect(screen.getByRole('img', { name: 'sweet' })).toBeTruthy();
  });

  it('renders text (no img) when src is an emoji fallback', () => {
    render(<SlotSymbol src="🍭" alt="sweet" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('🍭')).toBeTruthy();
  });

  it('renders text (no img) when src is empty', () => {
    render(<SlotSymbol src="" alt="sweet" />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
