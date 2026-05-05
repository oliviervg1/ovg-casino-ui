function requireStr(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Env var ${name} must be a number, got: ${raw}`);
  }
  return n;
}

export interface Config {
  port: number;
  geminiApiKey: string;
  gcsBucket: string;
  firebaseProjectId: string;
  signedUrlTtlSec: number;
  rateLimitRpm: number;
  regenLimitPerDay: number;
}

export function loadConfig(): Config {
  return {
    port: optionalInt('PORT', 8080),
    geminiApiKey: requireStr('GEMINI_API_KEY'),
    gcsBucket: requireStr('GCS_BUCKET'),
    firebaseProjectId: requireStr('FIREBASE_PROJECT_ID'),
    signedUrlTtlSec: optionalInt('SIGNED_URL_TTL_SEC', 3600),
    rateLimitRpm: optionalInt('RATE_LIMIT_RPM', 30),
    regenLimitPerDay: optionalInt('REGEN_RATE_LIMIT_PER_DAY', 200),
  };
}
