import { auth } from '../firebase';
import { RegenQuotaExceededError, classifyRateLimit } from './errors';

// Re-export so existing callers (e.g. Profile.tsx, useAssets) keep working
// after the class moved to ./errors.ts.
export { RegenQuotaExceededError, RateLimitError } from './errors';

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
  if (res.status === 429) throw await classifyRateLimit(res);
  if (!res.ok) throw new Error(`asset_fetch_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

export async function regenerateAsset(key: string): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`/api/asset/${encodeURIComponent(key)}/regenerate`, { method: 'POST', headers });
  if (res.status === 429) throw await classifyRateLimit(res);
  if (!res.ok) throw new Error(`asset_regen_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key, data);
  return data.url;
}

// Kept for source-compat with hook signature; preloads via getAsset memoisation.
export async function preloadAssets(keys: string[]) {
  await Promise.all(keys.map(k => getAsset(k)));
}

// Re-thrown by the RegenQuotaExceededError class above so the original
// instanceof references in the rest of the codebase keep working without
// caring whether the rejection originated in AssetManager or MusicManager.
// (Both share the same shared class from ./errors.ts.)
