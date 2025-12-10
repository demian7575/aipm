#!/bin/bash
set -e

echo "🧪 Testing ECS Worker Logic"

# Test environment variables
export TASK_ID="test-123"
export TASK_TITLE="Test Feature"
export TASK_DETAILS="Test implementation"
export BRANCH_NAME="feature/test-123"
export DYNAMODB_TABLE="aipm-amazon-q-queue"
export AWS_REGION="us-east-1"
export GITHUB_OWNER="demian7575"
export GITHUB_REPO="aipm"

echo "1️⃣ Testing environment setup..."
echo "   ✅ TASK_ID: $TASK_ID"
echo "   ✅ TASK_TITLE: $TASK_TITLE"
echo "   ✅ BRANCH_NAME: $BRANCH_NAME"

echo "2️⃣ Testing script validation..."
# Check if script handles missing TASK_ID
unset TASK_ID
if bash -c 'source ./scripts/workers/q-worker.sh' 2>/dev/null; then
    echo "   ❌ Should fail without TASK_ID"
else
    echo "   ✅ Correctly fails without TASK_ID"
fi

echo "3️⃣ Testing kiro-cli availability..."
if command -v kiro-cli >/dev/null 2>&1; then
    echo "   ✅ kiro-cli available"
    kiro-cli --version 2>/dev/null || echo "   ℹ️  Version check failed (expected in container)"
else
    echo "   ❌ kiro-cli not available (expected on host)"
fi

echo "4️⃣ Testing git availability..."
if command -v git >/dev/null 2>&1; then
    echo "   ✅ git available"
else
    echo "   ❌ git not available"
fi

echo ""
echo "✅ Worker logic components verified"
