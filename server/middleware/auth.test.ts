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
  res.set = vi.fn(() => res);
  return res as Response;
}

describe('verifyFirebaseToken middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets req.uid and req.auth on a valid Bearer token and calls next()', async () => {
    const decoded = { uid: 'user-1', email_verified: true };
    mockVerifyIdToken.mockResolvedValueOnce(decoded);
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer good-token' } } as unknown as Request & { uid?: string; auth?: unknown };
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(req.uid).toBe('user-1');
    expect(req.auth).toBe(decoded);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts lowercase "bearer" prefix (RFC 6750 case-insensitive)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-2' });
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'bearer lower-token' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
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

  it('responds 401 when Bearer prefix has no token after it', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer    ' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer bad' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns sanitised JSON body and WWW-Authenticate header on 401', async () => {
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="api"');
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
  });

  it('logs the Firebase error code on verifier failure', async () => {
    const err = Object.assign(new Error('expired'), { code: 'auth/id-token-expired' });
    mockVerifyIdToken.mockRejectedValueOnce(err);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { verifyFirebaseToken } = await import('./auth.js');
    const req = { headers: { authorization: 'Bearer bad' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    await verifyFirebaseToken(req, res, next);
    expect(warnSpy).toHaveBeenCalledWith('verifyFirebaseToken failed', { code: 'auth/id-token-expired' });
    warnSpy.mockRestore();
  });
});
