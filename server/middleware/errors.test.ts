import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { redact } from './errors.js';

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
    const req = { method: 'GET', path: '/api/asset/k' } as unknown as Request;
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

  it('redacts Gemini API keys from the logged message and stack', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { errorHandler } = await import('./errors.js');
    const err = new Error('Request to https://generativelanguage.googleapis.com/v1beta?key=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz0123456789 failed');
    const req = { method: 'POST', path: '/api/asset/k/regenerate' } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    const logged = errSpy.mock.calls[0][0] as string;
    expect(logged).not.toMatch(/AIza[0-9A-Za-z_-]{35}/);
    expect(logged).toContain('[REDACTED_API_KEY]');
    expect(logged).toContain('"method":"POST"');
    expect(logged).toContain('"path":"/api/asset/k/regenerate"');
    errSpy.mockRestore();
  });

  it('redacts Bearer tokens from the logged message', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { errorHandler } = await import('./errors.js');
    const err = new Error('verify failed: Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    errorHandler(err, req, res, next);
    const logged = errSpy.mock.calls[0][0] as string;
    expect(logged).toContain('Bearer [REDACTED_TOKEN]');
    expect(logged).not.toContain('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9');
    errSpy.mockRestore();
  });

  it('redact() helper handles undefined input', () => {
    expect(redact(undefined)).toBeUndefined();
  });
});
