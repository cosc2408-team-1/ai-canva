#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Branch: $(git branch --show-current)"
echo "HEAD: $(git rev-parse --short HEAD)"

npm test
npm run build --prefix client
npm run build --prefix server
npm run build --prefix functions
git diff --check
