#!/bin/bash
# Generate and upload HTML report for structured gating tests

set -e

ENV="${1:-prod}"
OUTPUT_DIR="/tmp"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')

echo "🧪 Running structured gating tests for $ENV..."
./scripts/testing/run-structured-gating-tests.sh --env $ENV > "$OUTPUT_DIR/gating-test-results.txt" 2>&1

# Extract test results
TOTAL_PASSED=$(grep "Total Tests Passed:" "$OUTPUT_DIR/gating-test-results.txt" | tail -1 | grep -o '[0-9]*')
TOTAL_FAILED=$(grep "Total Tests Failed:" "$OUTPUT_DIR/gating-test-results.txt" | tail -1 | grep -o '[0-9]*')
TOTAL_DURATION=$(grep "Total Duration:" "$OUTPUT_DIR/gating-test-results.txt" | tail -1 | sed 's/.*Total Duration: //')

echo "📊 Generating HTML report..."

cat > "$OUTPUT_DIR/structured-gating-tests.html" << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIPM Structured Gating Tests</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 5px; text-align: center; }
        .summary-card.passed { background: #e8f5e9; border-left: 4px solid #4CAF50; }
        .summary-card.failed { background: #ffebee; border-left: 4px solid #f44336; }
        .summary-card.duration { background: #e3f2fd; border-left: 4px solid #2196F3; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .test-results { margin-top: 30px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
        .timestamp { text-align: right; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 AIPM Structured Gating Tests</h1>
        
        <div class="summary">
            <div class="summary-card passed">
                <h3>Tests Passed</h3>
                <div class="value">TOTAL_PASSED_PLACEHOLDER</div>
            </div>
            <div class="summary-card failed">
                <h3>Tests Failed</h3>
                <div class="value">TOTAL_FAILED_PLACEHOLDER</div>
            </div>
            <div class="summary-card duration">
                <h3>Duration</h3>
                <div class="value" style="font-size: 24px;">TOTAL_DURATION_PLACEHOLDER</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Results</h2>
            <pre>TEST_OUTPUT_PLACEHOLDER</pre>
        </div>

        <div class="timestamp">
            Generated: TIMESTAMP_PLACEHOLDER
        </div>
    </div>
</body>
</html>
HTML

# Replace placeholders
sed -i "s/TOTAL_PASSED_PLACEHOLDER/$TOTAL_PASSED/g" "$OUTPUT_DIR/structured-gating-tests.html"
sed -i "s/TOTAL_FAILED_PLACEHOLDER/$TOTAL_FAILED/g" "$OUTPUT_DIR/structured-gating-tests.html"
sed -i "s/TOTAL_DURATION_PLACEHOLDER/$TOTAL_DURATION/g" "$OUTPUT_DIR/structured-gating-tests.html"
sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" "$OUTPUT_DIR/structured-gating-tests.html"

# Insert test output (escape HTML)
TEST_OUTPUT=$(cat "$OUTPUT_DIR/gating-test-results.txt" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
awk -v output="$TEST_OUTPUT" '{gsub(/TEST_OUTPUT_PLACEHOLDER/, output)}1' "$OUTPUT_DIR/structured-gating-tests.html" > "$OUTPUT_DIR/structured-gating-tests.html.tmp"
mv "$OUTPUT_DIR/structured-gating-tests.html.tmp" "$OUTPUT_DIR/structured-gating-tests.html"

echo "📤 Uploading to S3..."
aws s3 cp "$OUTPUT_DIR/structured-gating-tests.html" s3://aipm-static-hosting-demo/structured-gating-tests.html --content-type "text/html"

echo "✅ HTML report generated and uploaded"
echo "🔗 View at: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/structured-gating-tests.html"
