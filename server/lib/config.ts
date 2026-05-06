function requireStr(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optionalStr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
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
  // Optional: when running on Cloud Run, firebase-admin auto-detects the
  // project via GOOGLE_CLOUD_PROJECT, so this is only needed in local dev
  // where ADC may not have a project set. If present, it's passed through
  // to admin.initializeApp({ projectId }).
  firebaseProjectId: string | undefined;
  // Optional: target a non-default Firestore database. firebase-admin's
  // admin.firestore() always hits (default); set this to use getFirestore(app, id).
  firestoreDatabaseId: string | undefined;
  // Optional: service account email to impersonate for V4 URL signing.
  // Required when running locally with user ADC (signBlob needs an SA target;
  // user creds fail with "Gaia id not found"). On Cloud Run with an attached
  // SA, leave unset — the runtime SA signs as itself.
  signerSaEmail: string | undefined;
  signedUrlTtlSec: number;
  rateLimitRpm: number;
  regenLimitPerDay: number;
}

export function loadConfig(): Config {
  return {
    port: optionalInt('PORT', 8080),
    geminiApiKey: requireStr('GEMINI_API_KEY'),
    gcsBucket: requireStr('GCS_BUCKET'),
    firebaseProjectId: optionalStr('FIREBASE_PROJECT_ID'),
    firestoreDatabaseId: optionalStr('FIRESTORE_DATABASE_ID'),
    signerSaEmail: optionalStr('SIGNER_SA_EMAIL'),
    signedUrlTtlSec: optionalInt('SIGNED_URL_TTL_SEC', 3600),
    rateLimitRpm: optionalInt('RATE_LIMIT_RPM', 30),
    regenLimitPerDay: optionalInt('REGEN_RATE_LIMIT_PER_DAY', 200),
  };
}
