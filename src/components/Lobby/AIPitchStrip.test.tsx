import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AIPitchStrip } from './AIPitchStrip';

describe('AIPitchStrip', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders the pitch heading and Gemini 3.1 + Lyria 3 attribution', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status={null} />);
    expect(screen.getByText(/Eight AI-generated casino worlds/i)).toBeTruthy();
    // attribution mentions Gemini 3.1 + Lyria 3 in idle copy
    expect(document.body.textContent).toMatch(/Gemini 3\.1/i);
    expect(document.body.textContent).toMatch(/Lyria 3/i);
  });

  it('fires onRegenerate when the CTA is clicked', () => {
    let clicked = 0;
    render(<AIPitchStrip onRegenerate={() => clicked++} isRegenerating={false} status={null} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(clicked).toBe(1);
  });

  it('disables the CTA when isRegenerating is true', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="3/105 regenerated" />);
    const btn = screen.getByRole('button', { name: /regenerate/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows the live status string while regenerating', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="47/105 regenerated" />);
    expect(document.body.textContent).toContain('47/105');
  });
});
