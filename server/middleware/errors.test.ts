import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.headersSent = false;
  return res as Response;
}

describe('errorHandler middleware', () => {
  it('responds 502 generation_failed without leaking the message', async () => {
    const { errorHandler } = await import('./errors.js');
    const err = new Error('upstream Gemini PERMISSION_DENIED key 12345');
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'generation_failed' });
  });

  it('passes the error through if headers already sent', async () => {
    const { errorHandler } = await import('./errors.js');
    const err = new Error('boom');
    const req = {} as Request;
    const res = makeRes();
    res.headersSent = true;
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
