#!/bin/bash
# Cleanup redundant documentation and old files

set -e

echo "🧹 Cleaning up redundant documentation..."
echo ""

# Create archive directory
mkdir -p docs/archive/conversations
mkdir -p docs/archive/legacy

# Move conversation logs
echo "📦 Archiving conversation logs..."
mv Conversation_*.md docs/archive/conversations/ 2>/dev/null || echo "  No conversation logs to archive"

# Move legacy documentation
echo "📦 Archiving legacy documentation..."
LEGACY_DOCS=(
    "AMAZON_Q_IAM_AUTH.md"
    "AMAZON_Q_INTEGRATION.md"
    "AMAZON_Q_SETUP.md"
    "PR_CREATION_FIX.md"
    "PR_CREATION_SOLUTION.md"
    "PR_WORKFLOW_CHANGES.md"
    "ECS_DEPLOYMENT.md"
    "HEARTBEAT_QUICKSTART.md"
    "KIRO_WORKER_FIX.md"
    "LAUNCH_EC2.md"
    "DEPLOYMENT_SUCCESS.md"
    "FINAL_STATUS.md"
    "FIXES_SUMMARY.md"
    "ITERATION_RESULTS.md"
    "QUICKSTART.md"
)

for doc in "${LEGACY_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/legacy/
        echo "  ✓ Archived: $doc"
    fi
done

# Move old task files
echo "📦 Archiving old task files..."
mv TASK_*.md docs/archive/legacy/ 2>/dev/null || echo "  No task files to archive"

# Create archive README
cat > docs/archive/README.md << 'EOF'
# Archived Documentation

This directory contains old documentation that is no longer actively maintained but kept for historical reference.

## Structure

- `conversations/` - Auto-saved conversation logs
- `legacy/` - Superseded documentation files

## Active Documentation

See the main documentation index: [docs/INDEX.md](../INDEX.md)
EOF

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  Conversations: $(ls -1 docs/archive/conversations/*.md 2>/dev/null | wc -l) files archived"
echo "  Legacy docs: $(ls -1 docs/archive/legacy/*.md 2>/dev/null | wc -l) files archived"
echo ""
echo "📚 Active documentation:"
echo "  - README.md"
echo "  - DEVELOPMENT_WORKFLOW.md"
echo "  - DevelopmentBackground.md"
echo "  - AI_ASSISTANT_GUIDELINES.md"
echo "  - docs/INDEX.md"
