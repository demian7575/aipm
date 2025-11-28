#!/bin/bash
set -e

MAX_ITERATIONS=10
ITERATION=0

echo "🔄 Automated Gating Test Fix Loop"
echo "=================================="
echo "This script will:"
echo "1. Run gating tests"
echo "2. Identify failures"
echo "3. Deploy fixes"
echo "4. Repeat until all pass (max $MAX_ITERATIONS iterations)"
echo ""

cd "$(dirname "$0")"

run_gating_tests() {
  echo "📊 Running gating tests..."
  
  # Test critical endpoints
  local failures=0
  
  # Test 1: API Health
  if curl -sf "https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/health" > /dev/null; then
    echo "  ✅ API Health"
  else
    echo "  ❌ API Health"
    failures=$((failures + 1))
  fi
  
  # Test 2: Frontend app.js
  if curl -sf "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/app.js" > /dev/null; then
    echo "  ✅ Frontend app.js"
  else
    echo "  ❌ Frontend app.js"
    failures=$((failures + 1))
  fi
  
  # Test 3: Bedrock text in app.js
  if curl -s "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/app.js" | grep -q "Bedrock implementing"; then
    echo "  ✅ Bedrock text present"
  else
    echo "  ❌ Bedrock text missing"
    failures=$((failures + 1))
  fi
  
  # Test 4: Objective display in app.js
  if curl -s "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/app.js" | grep -q "codewhisperer-objective"; then
    echo "  ✅ Objective display"
  else
    echo "  ❌ Objective display missing"
    failures=$((failures + 1))
  fi
  
  # Test 5: Workflow file on GitHub
  if curl -sf "https://raw.githubusercontent.com/demian7575/aipm/main/.github/workflows/deploy-staging.yml" > /dev/null; then
    echo "  ✅ Workflow file"
  else
    echo "  ❌ Workflow file missing"
    failures=$((failures + 1))
  fi
  
  # Test 6: Staging workflow has branch_name input
  if curl -s "https://raw.githubusercontent.com/demian7575/aipm/main/.github/workflows/deploy-staging.yml" | grep -q "branch_name"; then
    echo "  ✅ Workflow branch_name input"
  else
    echo "  ❌ Workflow branch_name input missing"
    failures=$((failures + 1))
  fi
  
  return $failures
}

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "🔄 Iteration $ITERATION/$MAX_ITERATIONS"
  echo "-----------------------------------"
  
  if run_gating_tests; then
    echo ""
    echo "✅ All gating tests passed!"
    echo "=================================="
    echo "Iterations needed: $ITERATION"
    exit 0
  else
    FAILED=$?
    echo ""
    echo "⚠️  $FAILED test(s) failed"
    
    if [ $ITERATION -lt $MAX_ITERATIONS ]; then
      echo "🔧 Deploying fixes..."
      ./deploy-prod-complete.sh 2>&1 | grep -E "(✅|❌|Deploying|deployed)" || true
      
      echo "⏳ Waiting 15 seconds for propagation..."
      sleep 15
    fi
  fi
done

echo ""
echo "❌ Failed to pass all tests after $MAX_ITERATIONS iterations"
echo ""
echo "📋 Next steps:"
echo "1. Check CloudWatch logs for errors"
echo "2. Verify S3 bucket contents"
echo "3. Test manually: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "4. Run: ./deploy-prod-complete.sh"
exit 1
