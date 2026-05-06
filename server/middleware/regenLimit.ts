import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface RegenLimitOptions {
  limitPerDay: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
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
        if (!snap.exists) {
          tx.set(ref, { date: today, count: 1 });
          return true;
        }
        const data = snap.data() as { date: string; count: number };
        if (data.date !== today) {
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
        res.status(429).json({ error: 'regen_quota_exceeded' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
