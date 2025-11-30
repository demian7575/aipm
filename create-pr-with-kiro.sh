#!/bin/bash
# Create PR with AI code generation (loosely coupled design)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load abstractions
source "$SCRIPT_DIR/lib/credential-provider.sh"
source "$SCRIPT_DIR/lib/code-generator.sh"

TASK_TITLE="$1"
TASK_DETAILS="$2"

if [ -z "$TASK_TITLE" ]; then
  echo "Usage: $0 <task-title> [task-details]"
  exit 1
fi

BRANCH_NAME="feature/$(echo "$TASK_TITLE" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-50)"
TIMESTAMP=$(date +%s%3N)

echo "🚀 Creating PR with AI code generation"
echo "Task: $TASK_TITLE"
echo "Branch: $BRANCH_NAME"
echo ""

# Setup credentials (abstracted)
setup_credentials

# Ensure on main and up to date
git fetch origin main
git checkout main
git pull origin main

# Create branch
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Generate code (abstracted)
echo "🤖 Generating code with AI..."
generate_code "$TASK_TITLE" "$TASK_DETAILS"

# Check if changes were made
if git diff --quiet && git diff --cached --quiet; then
  echo "⚠️ No changes generated"
  echo "Creating placeholder task file..."
  
  cat > "TASK_${TIMESTAMP}.md" <<TASKEOF
# $TASK_TITLE

## Details
${TASK_DETAILS:-No additional details provided}

## Status
Ready for manual implementation
TASKEOF

  git add "TASK_${TIMESTAMP}.md"
  git commit -m "feat: $TASK_TITLE"
fi

# Push branch
echo ""
echo "📤 Pushing branch..."
git push -u origin "$BRANCH_NAME"

# Create PR
echo ""
echo "📝 Creating pull request..."
gh pr create \
  --base main \
  --head "$BRANCH_NAME" \
  --title "feat: $TASK_TITLE" \
  --body "## 🤖 AI-Generated Implementation

**Task:** $TASK_TITLE

**Details:** ${TASK_DETAILS:-No additional details provided}

## ✅ Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Manual review completed
- [ ] Gating tests pass"

echo ""
echo "✅ PR created successfully!"
