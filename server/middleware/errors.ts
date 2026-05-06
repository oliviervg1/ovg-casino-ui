import type { Request, Response, NextFunction } from 'express';
import { GenerationRateLimitError } from './genLimit.js';

// Patterns that should never reach Cloud Logging. Cloud Logging access
// (roles/logging.viewer) is broader than Secret Manager access, and key
// rotation does not invalidate already-logged entries.
const REDACT_PATTERNS: Array<[RegExp, string]> = [
  // Google API keys ("AIza" + 35 base64url chars). Gemini SDK errors often
  // echo the key in the request URL inside the error message.
  [/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]'],
  // Bearer tokens (Firebase ID tokens, OAuth access tokens).
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED_TOKEN]'],
];

export function redact(s: string | undefined): string | undefined {
  if (!s) return s;
  let out = s;
  for (const [pat, replacement] of REDACT_PATTERNS) {
    out = out.replace(pat, replacement);
  }
  return out;
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof GenerationRateLimitError) {
    res.set('Retry-After', String(err.retryAfterSec))
      .status(429)
      .json({ error: 'rate_limit' });
    return;
  }
  // Log the real error server-side, with key/token patterns redacted; never
  // echo any of it to the client.
  console.error(JSON.stringify({
    msg: 'request_failed',
    method: req.method,
    path: req.path,
    err: redact(err.message),
    stack: redact(err.stack),
  }));
  res.status(502).json({ error: 'generation_failed' });
}
