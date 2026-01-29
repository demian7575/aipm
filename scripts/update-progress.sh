#!/bin/bash
# Update progress.md with latest git commits

PROGRESS_FILE=".kiro/steering/progress.md"
CURRENT_DATE=$(date +%Y-%m-%d)

# Get last 5 commits
RECENT_CHANGES=$(git log --oneline -5 --pretty=format:"- %s")

# Update progress.md
cat > "$PROGRESS_FILE" << EOF
---
inclusion: always
---

# Project Status & Progress

**Last Updated**: $CURRENT_DATE

## Recent Changes
$RECENT_CHANGES

## Active Services
- ✅ Semantic API (port 8083)
- ✅ Kiro Session Pool (port 8082)
- ✅ Queue Cleanup Service
- ✅ Backend API (port 4000)

## Architecture Status
- Dual EC2 setup (prod: 44.197.204.18, dev: 44.222.168.46)
- DynamoDB for data storage
- S3 for static hosting
- GitHub Actions for CI/CD
EOF

echo "✅ Updated $PROGRESS_FILE"
