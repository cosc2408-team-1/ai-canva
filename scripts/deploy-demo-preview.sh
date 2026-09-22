#!/usr/bin/env bash
#
# Build and deploy a Firebase Hosting Preview that routes only text generation
# through a public demo API base URL. The value is embedded in the client build,
# so it must be a public URL and must never contain an API key or credential.
#
# Usage:
#   DEMO_AI_API_BASE_URL=https://example.trycloudflare.com \
#     bash scripts/deploy-demo-preview.sh
#
# Optional:
#   FIREBASE_PROJECT=ai-canva-e9dff
#   FIREBASE_PREVIEW_CHANNEL=val-demo
#   FIREBASE_PREVIEW_EXPIRES=7d

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEMO_BASE="${DEMO_AI_API_BASE_URL:-}"
if [ -z "$DEMO_BASE" ]; then
  echo "ERROR: Set DEMO_AI_API_BASE_URL to the public tunnel root URL." >&2
  exit 1
fi

node -e '
const value = process.env.DEMO_AI_API_BASE_URL;
try {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error();
} catch {
  console.error("ERROR: DEMO_AI_API_BASE_URL must be a credential-free HTTPS URL.");
  process.exit(1);
}
'

DEFAULT_PROJECT="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(".firebaserc", "utf8")).projects.default)' 2>/dev/null || true)"
PROJECT="${FIREBASE_PROJECT:-$DEFAULT_PROJECT}"
CHANNEL="${FIREBASE_PREVIEW_CHANNEL:-val-demo}"
EXPIRES="${FIREBASE_PREVIEW_EXPIRES:-7d}"

if [ -z "$PROJECT" ]; then
  echo "ERROR: Could not read the default Firebase project. Set FIREBASE_PROJECT explicitly." >&2
  exit 1
fi

echo "==> Building Firebase Preview for project: $PROJECT"
echo "==> Preview channel: $CHANNEL (expires: $EXPIRES)"
echo "==> Text generation uses the supplied public API base URL; no secret is printed."

VITE_AI_API_BASE_URL="$DEMO_BASE" npm run build --prefix client

echo "==> Deploying Firebase Hosting Preview"
firebase hosting:channel:deploy "$CHANNEL" \
  --project "$PROJECT" \
  --expires "$EXPIRES"

echo
echo "==> Share only the Firebase Preview URL printed above with teammates and iPad users."
echo "    They do not need the tunnel URL or a localStorage override."
