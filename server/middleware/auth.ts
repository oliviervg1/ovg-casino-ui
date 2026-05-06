import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// RFC 6750 §2.1: scheme is case-insensitive.
const BEARER_RE = /^Bearer\s+(.+)$/i;

function unauthorized(res: Response): void {
  res.set('WWW-Authenticate', 'Bearer realm="api"').status(401).json({ error: 'unauthorized' });
}

function extractToken(req: Request): string | null {
  // Prefer the custom header: Cloud Shell's web-preview proxy intercepts
  // requests bearing an `Authorization` header (it tries to verify them as
  // Google IAM tokens and redirects to its JWT auth flow when the token
  // isn't a Google identity), which breaks SPA fetches in dev. Custom
  // headers pass through the proxy untouched.
  const fromCustom = req.headers['x-firebase-token'];
  if (typeof fromCustom === 'string') {
    const trimmed = fromCustom.trim();
    if (trimmed) return trimmed;
  }
  const match = req.headers.authorization?.match(BEARER_RE);
  if (match) {
    const trimmed = match[1].trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    unauthorized(res);
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.auth = decoded;
    next();
  } catch (err) {
    console.warn('verifyFirebaseToken failed', { code: (err as { code?: string }).code });
    unauthorized(res);
  }
}
