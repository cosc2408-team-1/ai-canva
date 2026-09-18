#!/usr/bin/env bash
#
# Deploy AI Canva to Firebase (Hosting + Cloud Functions + Firestore/Storage rules).
#
# This script encodes the deployment know-how for this repo so a deploy is one
# deterministic command for humans, CI, and AI agents. It handles the gotchas:
#   - builds the client from the client/ dir (Vite needs cwd = client/ for index.html)
#   - cleans functions/dist so stale provider files (e.g. an old claude.js) never ship
#   - copies the selected text provider's settings from server/.env into
#     functions/.env (never echoes a key value)
#   - deploys the project, then you can verify via the URLs printed at the end
#
# Prereqs:
#   - firebase CLI installed and logged in (firebase login)
#   - server/.env populated for the selected AI_PROVIDER:
#       AI_PROVIDER=val    -> VAL_API_KEY (optionally VAL_MODEL)
#       AI_PROVIDER=ollama -> OLLAMA_API_KEY
#     plus FAL_KEY / STITCH_API_KEY if those boxes are in scope
#   - functions/.env with your keys (this script syncs the text-provider ones)
#
# Usage:
#   bash scripts/deploy.sh                 # deploy to the .firebaserc default project
#   FIREBASE_PROJECT=my-proj bash scripts/deploy.sh

set -euo pipefail

# Resolve the repo root regardless of where the script is invoked from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Target project. Defaults to the "default" alias in .firebaserc so this repo's
# own project is used. Upstream shipped a hardcoded default pointing at the
# upstream author's project, which would publish our build to someone else's
# Firebase. Override deliberately with FIREBASE_PROJECT when you mean to.
DEFAULT_PROJECT="$(python3 -c 'import json;print(json.load(open(".firebaserc"))["projects"]["default"])' 2>/dev/null || echo "")"
if [ -z "$DEFAULT_PROJECT" ]; then
  echo "ERROR: could not read the default project from .firebaserc." >&2
  echo "       Set FIREBASE_PROJECT=<project-id> explicitly." >&2
  exit 1
fi
PROJECT="${FIREBASE_PROJECT:-$DEFAULT_PROJECT}"

echo "==> Deploy target project: $PROJECT"
firebase use "$PROJECT"

if [ ! -f server/.env ]; then
  echo "ERROR: server/.env not found. Copy server/.env.example to server/.env and add keys." >&2
  exit 1
fi

# Copies one KEY=value line from server/.env into functions/.env if it is not
# already there. Values are never printed — only the key name is echoed.
sync_env_var() {
  local key="$1"
  if grep -q "^${key}=" functions/.env 2>/dev/null; then
    echo "   ${key} already set in functions/.env (left as is)"
  elif grep -q "^${key}=" server/.env; then
    grep "^${key}=" server/.env | head -1 >> functions/.env
    echo "   copied ${key} into functions/.env (value not echoed)"
  fi
}

# The deployed backend must use the same text provider the team agreed in
# docs/ai-api-decision.md. Read it from server/.env so local and deployed
# runs cannot silently disagree.
AI_PROVIDER="$(grep '^AI_PROVIDER=' server/.env | head -1 | cut -d= -f2- | tr -d '"' | tr '[:upper:]' '[:lower:]' || echo "")"
AI_PROVIDER="${AI_PROVIDER:-ollama}"
echo "==> Selected text provider: $AI_PROVIDER"

case "$AI_PROVIDER" in
  val)
    if ! grep -q '^VAL_API_KEY=.\+' server/.env; then
      echo "ERROR: AI_PROVIDER=val but server/.env has no VAL_API_KEY value." >&2
      echo "       Set an RMIT-issued key, or set AI_PROVIDER=ollama to use the fallback." >&2
      exit 1
    fi
    ;;
  ollama)
    if ! grep -q '^OLLAMA_API_KEY=.\+' server/.env; then
      echo "ERROR: AI_PROVIDER=ollama but server/.env has no OLLAMA_API_KEY value." >&2
      echo "       Cloud Functions cannot reach a local Ollama daemon, so a cloud key is required." >&2
      exit 1
    fi
    ;;
  *)
    echo "ERROR: Unsupported AI_PROVIDER \"$AI_PROVIDER\". Use \"val\" or \"ollama\"." >&2
    exit 1
    ;;
esac

echo "==> Syncing text-provider settings into functions/.env"
touch functions/.env
sync_env_var AI_PROVIDER
if [ "$AI_PROVIDER" = "val" ]; then
  sync_env_var VAL_API_KEY
  sync_env_var VAL_MODEL
else
  sync_env_var OLLAMA_API_KEY
fi

echo "==> Building client (from client/)"
( cd client && npm run build )

echo "==> Building functions (cleaning dist to drop stale provider files)"
rm -rf functions/dist
( cd functions && npm run build )

echo "==> Deploying to $PROJECT (hosting + functions + firestore/storage rules)"
firebase deploy --project "$PROJECT"

echo
echo "==> Deploy complete."
echo "   Hosting URL:  https://$PROJECT.web.app"
echo "   Verify with:"
echo "     curl -s https://$PROJECT.web.app/"
echo "     curl -s https://$PROJECT.web.app/api/health"
echo "     curl -s -X POST https://$PROJECT.web.app/api/generate -H 'Content-Type: application/json' -d '{\"userPrompt\":\"Say hi\"}'"
