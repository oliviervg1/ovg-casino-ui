import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { consumeGenerationToken, GenerationRateLimitError, _resetForTests } from './genLimit.js';

describe('consumeGenerationToken', () => {
  beforeEach(() => {
    _resetForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('first call for a uid succeeds and registers the bucket', () => {
    expect(() => consumeGenerationToken('user-1', 30)).not.toThrow();
  });

  it('repeated calls under the limit all succeed', () => {
    for (let i = 0; i < 30; i++) {
      expect(() => consumeGenerationToken('user-1', 30)).not.toThrow();
    }
  });

  it('the (limit+1)th call within the window throws GenerationRateLimitError', () => {
    for (let i = 0; i < 30; i++) consumeGenerationToken('user-1', 30);
    expect(() => consumeGenerationToken('user-1', 30)).toThrow(GenerationRateLimitError);
  });

  it('thrown error includes retryAfterSec aligned with the window reset', () => {
    for (let i = 0; i < 30; i++) consumeGenerationToken('user-1', 30);
    // Advance 12s into the 60s window, so 48s should remain.
    vi.advanceTimersByTime(12_000);
    try {
      consumeGenerationToken('user-1', 30);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(GenerationRateLimitError);
      expect((e as GenerationRateLimitError).retryAfterSec).toBe(48);
    }
  });

  it('counters are per-uid: one user hitting the limit does not affect another', () => {
    for (let i = 0; i < 30; i++) consumeGenerationToken('user-1', 30);
    expect(() => consumeGenerationToken('user-1', 30)).toThrow();
    expect(() => consumeGenerationToken('user-2', 30)).not.toThrow();
  });

  it('window reset after 60s allows a fresh 30 requests', () => {
    for (let i = 0; i < 30; i++) consumeGenerationToken('user-1', 30);
    expect(() => consumeGenerationToken('user-1', 30)).toThrow();
    vi.advanceTimersByTime(60_001);
    for (let i = 0; i < 30; i++) {
      expect(() => consumeGenerationToken('user-1', 30)).not.toThrow();
    }
    expect(() => consumeGenerationToken('user-1', 30)).toThrow();
  });

  it('respects a custom limit value', () => {
    consumeGenerationToken('user-1', 2);
    consumeGenerationToken('user-1', 2);
    expect(() => consumeGenerationToken('user-1', 2)).toThrow(GenerationRateLimitError);
  });
});
