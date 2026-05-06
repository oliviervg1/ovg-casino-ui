#!/usr/bin/env bash
# Entry point: ./deploy/deploy.sh {setup|deploy|rotate-key|logs}
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env.deploy"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from deploy/.env.deploy.example" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${SERVICE_NAME:?SERVICE_NAME required}"
: "${GCS_BUCKET:?GCS_BUCKET required}"

cmd="${1:-}"

run() { echo "+ $*"; "$@"; }

cmd_setup() {
  run gcloud config set project "$GCP_PROJECT_ID"

  echo "=== Enabling APIs ==="
  run gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    generativelanguage.googleapis.com \
    iamcredentials.googleapis.com \
    firestore.googleapis.com

  echo "=== Creating Artifact Registry repo (if absent) ==="
  if ! gcloud artifacts repositories describe ovg-casino --location="$GCP_REGION" >/dev/null 2>&1; then
    run gcloud artifacts repositories create ovg-casino \
      --repository-format=docker \
      --location="$GCP_REGION"
  fi

  echo "=== Creating GCS bucket (if absent) ==="
  if ! gcloud storage buckets describe "gs://${GCS_BUCKET}" >/dev/null 2>&1; then
    run gcloud storage buckets create "gs://${GCS_BUCKET}" \
      --location="$GCP_REGION" \
      --uniform-bucket-level-access
  fi

  echo "=== Creating Secret Manager secret (if absent) ==="
  if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
    if [[ -t 0 ]]; then
      read -r -s -p "Enter GEMINI_API_KEY: " key; echo
    else
      key=$(cat)
    fi
    printf "%s" "$key" | gcloud secrets create gemini-api-key --data-file=-
  fi

  echo "=== Granting IAM to Cloud Run service account ==="
  PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")
  RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

  run gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/datastore.user"
  run gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor"
  run gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/storage.objectAdmin"
  run gcloud iam service-accounts add-iam-policy-binding "$RUN_SA" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/iam.serviceAccountTokenCreator"

  echo "=== Deploying Firestore rules ==="
  if ! command -v firebase >/dev/null 2>&1; then
    echo "ERROR: firebase CLI not installed. Install with: npm install -g firebase-tools" >&2
    echo "       The regen_quota collection MUST be deny-all to clients (firestore.rules)," >&2
    echo "       otherwise a client can reset its own daily counter and bypass the quota." >&2
    exit 1
  fi
  run firebase deploy --only firestore:rules --project "$GCP_PROJECT_ID"

  echo "=== Setup complete ==="
}

cmd_deploy() {
  echo "=== Pre-build gate: npm test ==="
  (cd "$ROOT_DIR" && npm test)

  echo "=== Submitting Cloud Build ==="
  local subs=(
    "_SERVICE_NAME=${SERVICE_NAME}"
    "_REGION=${GCP_REGION}"
    "_GCS_BUCKET=${GCS_BUCKET}"
    "_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
    "_VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}"
    "_VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}"
    "_VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
    "_VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}"
    "_VITE_FIREBASE_DATABASE_ID=${VITE_FIREBASE_DATABASE_ID:-}"
    "_VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}"
    "_VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}"
    "_VITE_CES_DEPLOYMENT_ID=${VITE_CES_DEPLOYMENT_ID:-}"
    "_VITE_CES_TOKEN_BROKER_URL=${VITE_CES_TOKEN_BROKER_URL:-}"
    "_VITE_CES_CHAT_TITLE=${VITE_CES_CHAT_TITLE:-}"
    "_VITE_CES_THEME_ID=${VITE_CES_THEME_ID:-}"
  )
  local IFS=,
  run gcloud builds submit \
    --project "$GCP_PROJECT_ID" \
    --config "${ROOT_DIR}/deploy/cloudbuild.yaml" \
    --substitutions="${subs[*]}" \
    "$ROOT_DIR"
}

cmd_rotate_key() {
  if [[ -t 0 ]]; then
    read -r -s -p "Enter new GEMINI_API_KEY: " key; echo
  else
    key=$(cat)
  fi
  printf "%s" "$key" | gcloud secrets versions add gemini-api-key \
    --project "$GCP_PROJECT_ID" \
    --data-file=-
  echo "Rotated. Cloud Run picks up :latest on next request."
}

cmd_logs() {
  run gcloud run services logs tail "$SERVICE_NAME" \
    --project "$GCP_PROJECT_ID" \
    --region "$GCP_REGION"
}

case "$cmd" in
  setup) cmd_setup ;;
  deploy) cmd_deploy ;;
  rotate-key) cmd_rotate_key ;;
  logs) cmd_logs ;;
  *)
    echo "Usage: $0 {setup|deploy|rotate-key|logs}" >&2
    exit 1
    ;;
esac
