#!/bin/bash
# Install Git hooks from scripts/hooks/ to .git/hooks/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Installing Git hooks..."

# Check if we're in a git repository
if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "❌ Not in a git repository"
  exit 1
fi

# Install pre-commit hook
if [ -f "$SCRIPT_DIR/hooks/pre-commit" ]; then
  cp "$SCRIPT_DIR/hooks/pre-commit" "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "✅ Installed pre-commit hook"
else
  echo "⚠️  pre-commit hook not found"
fi

echo "✅ Git hooks installed successfully"
echo ""
echo "Installed hooks:"
ls -lh "$HOOKS_DIR" | grep -v ".sample" | grep "^-"
