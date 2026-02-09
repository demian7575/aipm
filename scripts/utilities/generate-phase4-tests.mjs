#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { writeFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Get all acceptance tests
const { Items: tests } = await docClient.send(new ScanCommand({
  TableName: 'aipm-backend-prod-acceptance-tests'
}));

console.log(`Found ${tests.length} acceptance tests`);

// Filter for API-testable scenarios (exclude pure UI tests)
const apiTests = tests.filter(t => {
  const whenText = t.when.join(' ').toLowerCase();
  return whenText.includes('post') || whenText.includes('get') || 
         whenText.includes('put') || whenText.includes('delete') ||
         whenText.includes('/api/');
});

console.log(`Found ${apiTests.length} API-testable scenarios`);

// Generate bash test script
let script = `#!/bin/bash
# Phase 4: Functionality Tests (Auto-generated from Acceptance Tests)
# Generated: ${new Date().toISOString()}

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../utilities/load-env-config.sh" prod

PASSED=0
FAILED=0
SKIPPED=0

RESULTS_FILE="/tmp/phase4-results-$(date +%s).txt"
echo "testId|title|status|endpoint" > "$RESULTS_FILE"

echo "🧪 Phase 4: Functionality Tests (${apiTests.length} tests)"
echo "====================================="
echo ""

`;

let testNum = 1;
for (const test of apiTests) { // All API tests
  const title = test.title;
  const given = test.given.join(', ');
  const when = test.when.join(', ');
  const then = test.then.join(', ');
  
  // Extract API endpoint from when clause
  const whenText = test.when.join(' ');
  const getMatch = whenText.match(/GET\s+(\/[^\s]+)/i) || whenText.match(/I GET\s+(\/[^\s]+)/i);
  const postMatch = whenText.match(/POST\s+(?:to\s+)?(\/[^\s]+)/i) || whenText.match(/I POST\s+(?:to\s+)?(\/[^\s]+)/i);
  const putMatch = whenText.match(/PUT\s+(\/[^\s]+)/i) || whenText.match(/I PUT\s+(\/[^\s]+)/i);
  const deleteMatch = whenText.match(/DELETE\s+(\/[^\s]+)/i) || whenText.match(/I DELETE\s+(\/[^\s]+)/i);
  
  script += `# Test ${testNum}: ${title}\n`;
  script += `echo "Test ${testNum}: ${title}"\n`;
  script += `echo "  Given: ${given}"\n`;
  script += `echo "  When: ${when}"\n`;
  script += `echo "  Then: ${then}"\n`;
  
  if (getMatch) {
    const endpoint = getMatch[1];
    script += `RESPONSE=$(curl -s "$API_BASE${endpoint}" 2>/dev/null)\n`;
    script += `if [ $? -eq 0 ] && echo "$RESPONSE" | jq -e '.' > /dev/null 2>&1; then\n`;
    script += `  echo "  ✅ PASS: GET ${endpoint} returned valid JSON"\n`;
    script += `  PASSED=$((PASSED + 1))\n`;
    script += `  echo "${test.id}|${title}|PASS|GET ${endpoint}" >> "$RESULTS_FILE"\n`;
    script += `else\n`;
    script += `  echo "  ❌ FAIL: GET ${endpoint} failed"\n`;
    script += `  FAILED=$((FAILED + 1))\n`;
    script += `  echo "${test.id}|${title}|FAIL|GET ${endpoint}" >> "$RESULTS_FILE"\n`;
    script += `fi\n`;
  } else if (postMatch) {
    script += `echo "  ⏭️  SKIP: POST requires test data setup"\n`;
    script += `SKIPPED=$((SKIPPED + 1))\n`;
    script += `echo "${test.id}|${title}|SKIP|POST endpoint" >> "$RESULTS_FILE"\n`;
  } else if (putMatch) {
    script += `echo "  ⏭️  SKIP: PUT requires test data setup"\n`;
    script += `SKIPPED=$((SKIPPED + 1))\n`;
    script += `echo "${test.id}|${title}|SKIP|PUT endpoint" >> "$RESULTS_FILE"\n`;
  } else if (deleteMatch) {
    script += `echo "  ⏭️  SKIP: DELETE requires test data setup"\n`;
    script += `SKIPPED=$((SKIPPED + 1))\n`;
    script += `echo "${test.id}|${title}|SKIP|DELETE endpoint" >> "$RESULTS_FILE"\n`;
  } else {
    script += `echo "  ⏭️  SKIP: No API endpoint detected"\n`;
    script += `SKIPPED=$((SKIPPED + 1))\n`;
    script += `echo "${test.id}|${title}|SKIP|No API endpoint" >> "$RESULTS_FILE"\n`;
  }
  
  script += `echo ""\n\n`;
  testNum++;
}

script += `# Summary
echo "====================================="
echo "Phase 4 Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  ⏭️  Skipped: $SKIPPED"
echo "  Total: $((PASSED + FAILED + SKIPPED))"
echo "====================================="
echo ""
echo "Results saved to: $RESULTS_FILE"
cat "$RESULTS_FILE"

# Upload results to RTM tracking
if command -v aws &> /dev/null; then
  echo ""
  echo "Uploading results to DynamoDB for RTM tracking..."
  node "$SCRIPT_DIR/../utilities/upload-test-results.mjs" "$RESULTS_FILE" "phase4"
fi

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0
`;

writeFileSync('/repo/ebaejun/tools/aws/aipm/scripts/testing/phase4-functionality.sh', script);
console.log('✅ Generated phase4-functionality.sh');
