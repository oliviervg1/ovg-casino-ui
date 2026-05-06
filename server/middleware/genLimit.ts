// Per-uid generation rate limiter — gates the actual Gemini/Lyria call sites,
// NOT every /api/* request. Cache-hit fetches (HEAD + sign existing GCS object)
// don't consume tokens; only first-time generations and explicit /regenerate
// POSTs do. Concurrent same-key requests share the leader's generation via
// the cache.ts inFlight map, so they share the cost of one consumed token.
//
// In-memory + per-instance (same scaling caveat as the old apiLimiter): with
// N Cloud Run instances and no session affinity, the effective per-uid rate
// is N × limitPerMin. Plug in a Redis-backed store for a hard global cap.

export class GenerationRateLimitError extends Error {
  readonly retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super('generation_rate_limit');
    this.name = 'GenerationRateLimitError';
    this.retryAfterSec = retryAfterSec;
  }
}

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

export function consumeGenerationToken(uid: string, limitPerMin: number): void {
  const now = Date.now();
  const b = buckets.get(uid);
  if (!b || now >= b.resetAt) {
    buckets.set(uid, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (b.count >= limitPerMin) {
    throw new GenerationRateLimitError(Math.ceil((b.resetAt - now) / 1000));
  }
  b.count += 1;
}

// Test-only — clear the in-memory bucket map between cases.
export function _resetForTests(): void {
  buckets.clear();
}
