#!/bin/bash
# Sync data from production to development environment
# Run this manually when you need to sync PRs, stories, and tests

set -e

echo "🔄 Syncing data from production to development..."
echo ""

# Run the sync script
node scripts/utilities/sync-prod-to-dev.cjs

echo ""
echo "✅ Sync completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Stories synced from prod to dev"
echo "  - Acceptance tests synced from prod to dev"
echo "  - PRs synced from prod to dev"
echo ""
echo "🔗 Verify in dev environment:"
echo "  http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
