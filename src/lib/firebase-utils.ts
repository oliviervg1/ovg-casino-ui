import { auth } from '../firebase';

export enum OperationType {
  UPDATE = 'update',
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

class FirestoreOperationError extends Error {
  operationType: OperationType;
  path: string | null;
  authInfo: FirestoreErrorInfo['authInfo'];

  constructor(info: FirestoreErrorInfo) {
    super(info.error);
    this.name = 'FirestoreOperationError';
    this.operationType = info.operationType;
    this.path = info.path;
    this.authInfo = info.authInfo;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const info: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };
  // Log only the upstream error message; the authInfo block (email,
  // photoURL, providers) is PII and the developer console is captured
  // by extensions, screen-recorders, and support-ticket screenshots.
  // The structured fields are preserved on the thrown error for callers
  // that genuinely need them.
  console.error('Firestore Error:', { operationType, path, error: info.error });
  throw new FirestoreOperationError(info);
}
