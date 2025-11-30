#!/bin/bash

# Test grep/sed JSON parsing functionality
# This verifies that grep and sed can correctly parse YAML/JSON-like structures

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Testing grep/sed parsing..."

# Test 1: Parse YAML with grep
echo "Test 1: Parsing deploy-config.yaml with grep"
if [ -f "deploy-config.yaml" ]; then
    REGION=$(grep -A 10 "deployment:" deploy-config.yaml | grep "region:" | awk '{print $2}' | tr -d '"')
    STAGE=$(grep -A 10 "deployment:" deploy-config.yaml | grep "stage:" | awk '{print $2}' | tr -d '"')
    S3_BUCKET=$(grep -A 10 "frontend:" deploy-config.yaml | grep "s3Bucket:" | awk '{print $2}' | tr -d '"')
    
    echo "  Region: $REGION"
    echo "  Stage: $STAGE"
    echo "  S3 Bucket: $S3_BUCKET"
    
    if [ -n "$REGION" ] && [ -n "$STAGE" ]; then
        echo -e "${GREEN}✓ YAML parsing with grep works${NC}"
    else
        echo -e "${RED}✗ YAML parsing failed${NC}"
        exit 1
    fi
else
    echo "  deploy-config.yaml not found, skipping"
fi

# Test 2: Parse JSON-like output with sed
echo ""
echo "Test 2: Parsing URL with sed"
TEST_URL="https://example.com/api/{proxy+}"
CLEANED_URL=$(echo "$TEST_URL" | sed 's/{proxy+}//')
echo "  Original: $TEST_URL"
echo "  Cleaned: $CLEANED_URL"

if [ "$CLEANED_URL" = "https://example.com/api/" ]; then
    echo -e "${GREEN}✓ sed URL cleaning works${NC}"
else
    echo -e "${RED}✗ sed URL cleaning failed${NC}"
    exit 1
fi

# Test 3: Parse multi-line grep output
echo ""
echo "Test 3: Multi-line grep with awk"
cat > /tmp/test-config.txt << 'EOF'
deployment:
  region: "us-east-1"
  stage: "prod"
frontend:
  s3Bucket: "test-bucket"
EOF

PARSED_REGION=$(grep -A 10 "deployment:" /tmp/test-config.txt | grep "region:" | awk '{print $2}' | tr -d '"')
echo "  Parsed region: $PARSED_REGION"

if [ "$PARSED_REGION" = "us-east-1" ]; then
    echo -e "${GREEN}✓ Multi-line grep parsing works${NC}"
else
    echo -e "${RED}✗ Multi-line grep parsing failed${NC}"
    exit 1
fi

rm -f /tmp/test-config.txt

echo ""
echo -e "${GREEN}All grep/sed JSON parsing tests passed!${NC}"
