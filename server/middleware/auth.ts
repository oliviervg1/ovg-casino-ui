import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// RFC 6750 §2.1: scheme is case-insensitive.
const BEARER_RE = /^Bearer\s+(.+)$/i;

function unauthorized(res: Response): void {
  res.set('WWW-Authenticate', 'Bearer realm="api"').status(401).json({ error: 'unauthorized' });
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const match = req.headers.authorization?.match(BEARER_RE);
  if (!match) {
    unauthorized(res);
    return;
  }
  const token = match[1].trim();
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
