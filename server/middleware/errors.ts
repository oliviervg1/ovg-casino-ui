import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }
  // Log the real error server-side; never echo it to the client.
  console.error(JSON.stringify({ msg: 'request_failed', err: err.message, stack: err.stack }));
  res.status(502).json({ error: 'generation_failed' });
}
