#!/bin/bash
# Check for stuck git operations and clean them up

REPO_PATH="/home/ec2-user/aipm"

cd "$REPO_PATH" || exit 1

# Check for stuck rebase
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
    echo "⚠️  Stuck rebase detected, aborting..."
    git rebase --abort 2>/dev/null
fi

# Check for stuck merge
if [ -f ".git/MERGE_HEAD" ]; then
    echo "⚠️  Stuck merge detected, aborting..."
    git merge --abort 2>/dev/null
fi

# Check for vim processes
VIM_PROCS=$(pgrep -f "vim.*COMMIT_EDITMSG" || true)
if [ -n "$VIM_PROCS" ]; then
    echo "⚠️  Stuck vim processes detected, killing..."
    pkill -9 -f "vim.*COMMIT_EDITMSG"
fi

# Verify git config
EDITOR=$(git config core.editor)
if [ "$EDITOR" != "true" ]; then
    echo "⚠️  Git editor not set to non-interactive, fixing..."
    git config core.editor true
fi

echo "✅ Git health check complete"
