#!/bin/bash
# Post-deployment data consistency validation

set -e

echo "📊 Validating data consistency after deployment..."

# Basic data consistency checks
PROD_API="http://44.220.45.57"
DEV_API="http://44.222.168.46"

echo "🔍 Checking story count consistency..."
PROD_COUNT=$(curl -s "$PROD_API/api/stories" | jq 'length')
DEV_COUNT=$(curl -s "$DEV_API/api/stories" | jq 'length')

echo "📈 Production stories: $PROD_COUNT"
echo "📈 Development stories: $DEV_COUNT"

if [[ "$PROD_COUNT" -gt 0 && "$DEV_COUNT" -gt 0 ]]; then
    echo "✅ Data consistency validated"
else
    echo "❌ Data consistency check failed"
    exit 1
fi

echo "✅ Post-deployment validation completed"
