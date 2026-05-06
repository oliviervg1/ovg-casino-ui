import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

declare module 'express-serve-static-core' {
  interface Request {
    uid?: string;
  }
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
