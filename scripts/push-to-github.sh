#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="${1:-origin}"
BRANCH_NAME="${2:-$(git rev-parse --abbrev-ref HEAD)}"

if [[ -z "${BRANCH_NAME}" ]]; then
  echo "Unable to determine the branch to push. Please provide it explicitly." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "There are uncommitted or untracked changes. Commit or stash them before pushing." >&2
  exit 1
fi

REMOTE_URL_ENV="${GITHUB_PUSH_URL:-}"
REMOTE_URL_ARG="${3:-}" # optional third argument overrides env

if [[ -n "${REMOTE_URL_ARG}" ]]; then
  REMOTE_URL_ENV="${REMOTE_URL_ARG}"
fi

if ! git remote | grep -qx "${REMOTE_NAME}"; then
  if [[ -z "${REMOTE_URL_ENV}" ]]; then
    cat <<MSG >&2
Remote '${REMOTE_NAME}' is not configured. Provide a remote URL either by:
  - passing it as the third argument, e.g. scripts/push-to-github.sh origin work https://github.com/user/repo.git
  - or exporting GITHUB_PUSH_URL before running this script.
MSG
    exit 1
  fi

  git remote add "${REMOTE_NAME}" "${REMOTE_URL_ENV}"
else
  if [[ -n "${REMOTE_URL_ENV}" ]]; then
    git remote set-url "${REMOTE_NAME}" "${REMOTE_URL_ENV}"
  fi
fi

UPSTREAM_SET=false
if git rev-parse --abbrev-ref "${BRANCH_NAME}@{upstream}" >/dev/null 2>&1; then
  UPSTREAM_SET=true
fi

PUSH_ARGS=("${REMOTE_NAME}" "${BRANCH_NAME}")
if [[ "${UPSTREAM_SET}" = false ]]; then
  PUSH_ARGS=("--set-upstream" "${REMOTE_NAME}" "${BRANCH_NAME}")
fi

echo "Pushing branch '${BRANCH_NAME}' to remote '${REMOTE_NAME}'..."

git push "${PUSH_ARGS[@]}"

echo "Push completed."
