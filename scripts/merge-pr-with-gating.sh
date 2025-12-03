#!/bin/bash
set -e

OWNER=$1
REPO=$2
PR_NUMBER=$3

if [ -z "$OWNER" ] || [ -z "$REPO" ] || [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <owner> <repo> <pr_number>"
  exit 1
fi

echo "Running gating tests..."
npm test

echo "Gating tests passed. Merging PR #$PR_NUMBER..."

GITHUB_TOKEN=${GITHUB_TOKEN:-$(git config --get github.token)}

curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge" \
  -d '{"merge_method":"squash"}'

echo "PR merged successfully"
