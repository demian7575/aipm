#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
if [ ! -f "${ROOT_DIR}/package.json" ]; then
  echo "[bootstrap] package.json not found. Run this script from within the cloned ai-pm-mindmap repository root." >&2
  exit 1
fi
pushd "${ROOT_DIR}" >/dev/null
if ! command -v npm >/dev/null 2>&1; then
  echo "[bootstrap] npm is required. Please install Node.js 18+ (which bundles npm)." >&2
  exit 1
fi
npm install --workspaces --include-workspace-root "$@"
popd >/dev/null
