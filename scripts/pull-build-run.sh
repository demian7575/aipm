#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

printf '\n[%s] Updating repository...\n' "$(date '+%Y-%m-%d %H:%M:%S')"
if ! git pull --ff-only; then
  echo "Git pull failed. Resolve conflicts or stash local changes before retrying." >&2
  exit 1
fi

printf '\n[%s] Installing workspace dependencies...\n' "$(date '+%Y-%m-%d %H:%M:%S')"
npm install

printf '\n[%s] Building workspaces...\n' "$(date '+%Y-%m-%d %H:%M:%S')"
npm run build

printf '\n[%s] Starting development servers (press Ctrl+C to stop)...\n' "$(date '+%Y-%m-%d %H:%M:%S')"

npm run dev:server &
SERVER_PID=$!

npm run dev --workspace client &
CLIENT_PID=$!

cleanup() {
  echo '\nShutting down development servers...'
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$SERVER_PID" "$CLIENT_PID"
