#!/bin/bash
# Generate code using Amazon Q CLI with full repository context

set -e

TASK_TITLE="$1"
TASK_DETAILS="$2"
BRANCH_NAME="$3"

if [ -z "$TASK_TITLE" ] || [ -z "$BRANCH_NAME" ]; then
  echo "Usage: $0 <task-title> <task-details> <branch-name>"
  exit 1
fi

echo "🚀 Generating code with Amazon Q..."
echo "Task: $TASK_TITLE"
echo "Branch: $BRANCH_NAME"
echo ""

# Ensure we're in the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create and checkout branch
git fetch origin main
git checkout main
git pull origin main
git checkout -b "$BRANCH_NAME" || git checkout "$BRANCH_NAME"

# Generate code with Amazon Q (has full repo context)
echo "💡 Amazon Q is analyzing the repository..."
q chat "Implement this feature: $TASK_TITLE. Requirements: $TASK_DETAILS. Follow existing code patterns in this repository." --non-interactive || true

# Commit changes
git add -A
if git diff --staged --quiet; then
  echo "⚠️  No changes generated"
  exit 1
fi

git commit -m "feat: $TASK_TITLE"
git push -u origin "$BRANCH_NAME"

echo "✅ Code generated and pushed to branch: $BRANCH_NAME"
echo "🔗 Create PR: https://github.com/demian7575/aipm/compare/$BRANCH_NAME?expand=1"
