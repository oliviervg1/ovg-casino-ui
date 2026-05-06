import type { DecodedIdToken } from 'firebase-admin/auth';

declare module 'express-serve-static-core' {
  interface Request {
    uid?: string;
    auth?: DecodedIdToken;
  }
}

export {};
