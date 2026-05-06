import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockRunTransaction = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    firestore: () => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    }),
    apps: [{}],
    initializeApp: vi.fn(),
  },
  firestore: () => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
  apps: [{}],
  initializeApp: vi.fn(),
}));

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response;
}

const TODAY = '2026-05-05';

describe('createRegenLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ id: 'user-1' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  });

  it('first call of the day creates the document at count=1 and proceeds', async () => {
    const setSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: false }),
        set: setSpy,
        update: vi.fn(),
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), { date: TODAY, count: 1 });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('subsequent same-day call increments the counter', async () => {
    const updateSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: TODAY, count: 5 }) }),
        set: vi.fn(),
        update: updateSpy,
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(updateSpy).toHaveBeenCalledWith(expect.anything(), { count: 6 });
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects with 429 once count reaches the daily limit', async () => {
    const setSpy = vi.fn();
    const updateSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: TODAY, count: 200 }) }),
        set: setSpy,
        update: updateSpy,
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'regen_quota_exceeded' });
    expect(next).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('resets counter on UTC date rollover', async () => {
    const setSpy = vi.fn();
    mockRunTransaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ date: '2026-05-04', count: 200 }) }),
        set: setSpy,
        update: vi.fn(),
      };
      return fn(tx);
    });
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = { uid: 'user-1' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), { date: TODAY, count: 1 });
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401-equivalent if req.uid is missing', async () => {
    const { createRegenLimit } = await import('./regenLimit.js');
    const limiter = createRegenLimit({ limitPerDay: 200 });
    const req = {} as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
