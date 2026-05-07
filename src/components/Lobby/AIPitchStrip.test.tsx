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
    fireEvent.click(screen.getByRole('button', { name: /regenerat/i }));
    expect(clicked).toBe(1);
  });

  it('disables the CTA when isRegenerating is true', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="3/105 regenerated" />);
    const btn = screen.getByRole('button', { name: /regenerat/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows the live status string while regenerating', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status="47/105 regenerated" />);
    expect(document.body.textContent).toContain('47/105');
  });

  it('shows a "starting…" placeholder when isRegenerating but status is still null', () => {
    // Regression: between click and the first task completion, status is null but
    // isRegenerating is true. Previous gating (`isRegenerating && status`) showed
    // the idle pitch text in that window, making the UI look unresponsive.
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={true} status={null} />);
    expect(document.body.textContent?.toLowerCase()).toContain('starting');
  });

  it('shows the final status string after regeneration completes (isRegenerating false but status set)', () => {
    // Regression: previously, when isRegenerating flipped back to false the status
    // line reverted to the idle pitch — the operator never saw the "113/113
    // regenerated" final line confirming success.
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status="113/113 regenerated" />);
    expect(document.body.textContent).toContain('113/113');
  });

  it('shows a quota error banner when error="quota"', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status="113/113 regenerated · 113 failed" error="quota" />);
    expect(document.body.textContent?.toLowerCase()).toContain('quota');
  });

  it('shows a rate-limit error banner when error="rate-limit"', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status={null} error="rate-limit" />);
    expect(document.body.textContent?.toLowerCase()).toContain('rate limit');
  });

  it('shows a partial-failure error banner when error="partial"', () => {
    render(<AIPitchStrip onRegenerate={() => {}} isRegenerating={false} status="113/113 regenerated · 5 failed" error="partial" />);
    expect(document.body.textContent?.toLowerCase()).toContain('failed');
  });
});
