#!/bin/bash

# Auto-update START_HERE.md with current timestamp and context

TIMESTAMP=$(date '+%Y-%m-%d %H:%M JST')
FILE="/repo/ebaejun/tools/aws/aipm/START_HERE.md"

# Update timestamp
sed -i "s/\*\*Last Updated\*\*:.*/\*\*Last Updated\*\*: $TIMESTAMP/" "$FILE"

# Add update entry to Continuous Updates section
UPDATE_ENTRY="- **$(date '+%Y-%m-%d %H:%M')**: $1"

# Check if update message provided
if [ -z "$1" ]; then
  echo "Usage: ./update-start-here.sh \"Update message\""
  echo "Example: ./update-start-here.sh \"Added new deployment feature\""
  exit 1
fi

# Insert update entry after "Key changes:" line
sed -i "/Key changes:/a $UPDATE_ENTRY" "$FILE"

echo "✅ START_HERE.md updated with: $1"
echo "📝 Timestamp: $TIMESTAMP"

# Optional: Auto-commit
read -p "Commit changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add "$FILE"
  git commit -m "docs: Update START_HERE.md - $1"
  echo "✅ Changes committed"
fi
