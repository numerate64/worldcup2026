#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="/tmp/worldcup2026-pages-sync.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

cd "$REPO_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Skipping World Cup publish because the working tree has uncommitted changes."
  exit 0
fi

git pull --ff-only origin main
npm run sync:worldcup --silent

if git diff --quiet -- world-cup-2026.json; then
  echo "No World Cup data changes."
  exit 0
fi

git add world-cup-2026.json
git commit -m "Update World Cup data"
git push origin main
