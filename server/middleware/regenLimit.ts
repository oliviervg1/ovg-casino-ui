import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface RegenLimitOptions {
  limitPerDay: number;
}

interface QuotaDoc { date: string; count: number; }

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((nextMidnight - now.getTime()) / 1000);
}

function isValidQuotaDoc(data: unknown): data is QuotaDoc {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.date === 'string' && typeof d.count === 'number' && Number.isFinite(d.count);
}

export function createRegenLimit(opts: RegenLimitOptions) {
  return async function regenLimit(req: Request, res: Response, next: NextFunction) {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const db = admin.firestore();
    const ref = db.collection('regen_quota').doc(uid);
    const today = todayUtc();

    try {
      const allowed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : undefined;
        // Reset if missing, malformed, or stale (yesterday or earlier).
        if (!isValidQuotaDoc(data) || data.date !== today) {
          tx.set(ref, { date: today, count: 1 });
          return true;
        }
        if (data.count >= opts.limitPerDay) {
          return false;
        }
        tx.update(ref, { count: data.count + 1 });
        return true;
      });

      if (!allowed) {
        res.set('Retry-After', String(secondsUntilUtcMidnight()))
          .status(429)
          .json({ error: 'regen_quota_exceeded' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
