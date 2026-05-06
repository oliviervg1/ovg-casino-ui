import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockVerifyIdToken = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
    apps: [{}],
    initializeApp: vi.fn(),
  },
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  apps: [{}],
  initializeApp: vi.fn(),
}));

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response;
}

describe('verifyFirebaseToken middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets req.uid on a valid Bearer token and calls next()', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer good-token' } } as unknown as Request & { uid?: string };
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(req.uid).toBe('user-1');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 when the Authorization header is missing', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 on a malformed header', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'NotBearer xyz' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer bad' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
