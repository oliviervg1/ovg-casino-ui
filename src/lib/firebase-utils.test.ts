import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'u1', email: 'a@b', emailVerified: true, isAnonymous: false, tenantId: null, providerData: [] } },
}));

describe('handleFirestoreError', () => {
  it('throws an Error (not a stringified-JSON Error) with structured fields as own properties', async () => {
    const { handleFirestoreError, OperationType } = await import('./firebase-utils');
    let caught: any;
    try {
      handleFirestoreError(new Error('inner boom'), OperationType.GET, 'users/u1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('inner boom');
    expect(caught.operationType).toBe('get');
    expect(caught.path).toBe('users/u1');
    expect(caught.authInfo.userId).toBe('u1');
    expect(caught.message).not.toMatch(/\{.*\}/);
  });
});
