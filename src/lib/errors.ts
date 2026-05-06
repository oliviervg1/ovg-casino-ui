// Shared error classes for the asset / music API clients. Hoisted so that
// `instanceof RegenQuotaExceededError` works regardless of whether the
// rejected promise came from AssetManager or MusicManager (previously each
// module exported its own class and the check failed for the music side).

export class RegenQuotaExceededError extends Error {
  constructor() {
    super('regen_quota_exceeded');
    this.name = 'RegenQuotaExceededError';
  }
}

// Per-minute throttle (server-side express-rate-limit). Distinct from the
// per-day quota so the UI can show "wait a minute" vs "wait until tomorrow".
export class RateLimitError extends Error {
  constructor() {
    super('rate_limit');
    this.name = 'RateLimitError';
  }
}

// Bucket a 429 response by reading its body. Falls back to RateLimitError
// when the body is missing/unknown so callers always get a typed error.
export async function classifyRateLimit(res: Response): Promise<Error> {
  let body: { error?: string } = {};
  try { body = await res.json() as { error?: string }; } catch { /* ignore */ }
  if (body.error === 'regen_quota_exceeded') return new RegenQuotaExceededError();
  return new RateLimitError();
}
