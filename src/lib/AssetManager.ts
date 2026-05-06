import { auth } from '../firebase';

export class RegenQuotaExceededError extends Error {
  constructor() {
    super('regen_quota_exceeded');
    this.name = 'RegenQuotaExceededError';
  }
}

interface MemoEntry { url: string; expiresAt: number; }
const memo = new Map<string, MemoEntry>();
const REFRESH_BUFFER_MS = 60_000;

async function authHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('not_authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function memoFresh(entry: MemoEntry | undefined): entry is MemoEntry {
  return !!entry && entry.expiresAt - Date.now() > REFRESH_BUFFER_MS;
}

export async function getAsset(key: string): Promise<string> {
  const cached = memo.get(key);
  if (memoFresh(cached)) return cached.url;
  const headers = await authHeader();
  const res = await fetch(`/api/asset/${encodeURIComponent(key)}`, { headers });
  if (!res.ok) throw new Error(`asset_fetch_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

export async function regenerateAsset(key: string): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`/api/asset/${encodeURIComponent(key)}/regenerate`, { method: 'POST', headers });
  if (res.status === 429) throw new RegenQuotaExceededError();
  if (!res.ok) throw new Error(`asset_regen_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

// Kept for source-compat with hook signature; preloads via getAsset memoisation.
export async function preloadAssets(keys: string[]) {
  await Promise.all(keys.map(k => getAsset(k)));
}
