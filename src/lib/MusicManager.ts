import { auth } from '../firebase';
import { classifyRateLimit } from './errors';

// Re-export the shared error so callers can import either Manager and the
// instanceof check works against a single class identity.
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

function key(theme: string, gameType: string) {
  return `${theme}_${gameType}`;
}

export async function getMusic(theme: string, gameType: string): Promise<string | null> {
  const k = key(theme, gameType);
  const cached = memo.get(k);
  if (memoFresh(cached)) return cached.url;
  const headers = await authHeader();
  const res = await fetch(`/api/music/${encodeURIComponent(theme)}/${encodeURIComponent(gameType)}`, { headers });
  if (res.status === 400) return null;
  if (res.status === 429) throw await classifyRateLimit(res);
  if (!res.ok) throw new Error(`music_fetch_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(k, data);
  return data.url;
}

export async function regenerateMusic(theme: string, gameType: string): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`/api/music/${encodeURIComponent(theme)}/${encodeURIComponent(gameType)}/regenerate`, {
    method: 'POST',
    headers,
  });
  if (res.status === 429) throw await classifyRateLimit(res);
  if (!res.ok) throw new Error(`music_regen_failed_${res.status}`);
  const data = (await res.json()) as MemoEntry;
  memo.set(key(theme, gameType), data);
  return data.url;
}
