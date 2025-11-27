#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
S3_BUCKET="aipm-static-hosting-demo"
STACK_NAME="aipm-backend"
STAGE="prod"

echo -e "${YELLOW}🚀 Starting full AIPM deployment...${NC}"

# Step 1: Backend (Lambda + API Gateway + DynamoDB)
echo -e "${YELLOW}📦 Deploying backend infrastructure...${NC}"
if ! command -v serverless &> /dev/null; then
    echo -e "${RED}❌ Serverless Framework not found. Installing...${NC}"
    npm install -g serverless
fi

cd /repo/ebaejun/tools/aws/aipm
serverless deploy --stage $STAGE --region $REGION

# Step 2: Frontend (S3 Static Hosting)
echo -e "${YELLOW}🌐 Deploying frontend to S3...${NC}"

# Upload all frontend files
aws s3 sync apps/frontend/public/ s3://$S3_BUCKET/ \
    --delete \
    --region $REGION \
    --exclude "*.DS_Store"

# Set proper content types
aws s3 cp s3://$S3_BUCKET/index.html s3://$S3_BUCKET/index.html \
    --content-type "text/html" \
    --metadata-directive REPLACE \
    --region $REGION

aws s3 cp s3://$S3_BUCKET/styles.css s3://$S3_BUCKET/styles.css \
    --content-type "text/css" \
    --metadata-directive REPLACE \
    --region $REGION

# Step 3: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

# Get API endpoint from serverless output
API_ENDPOINT=$(serverless info --stage $STAGE --region $REGION | grep "ServiceEndpoint:" | awk '{print $2}')
FRONTEND_URL="http://$S3_BUCKET.s3-website-$REGION.amazonaws.com"

echo -e "${GREEN}✅ API Endpoint: $API_ENDPOINT${NC}"
echo -e "${GREEN}✅ Frontend URL: $FRONTEND_URL${NC}"

# Step 4: Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check API health
if curl -s -f "$API_ENDPOINT/api/stories" > /dev/null; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    exit 1
fi

# Check frontend accessibility
if curl -s -f "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    exit 1
fi

# Step 5: Run gating tests
echo -e "${YELLOW}🧪 Running production gating tests...${NC}"

# Create a simple Node.js script to run gating tests
cat > /tmp/run-gating-tests.js << 'EOF'
const https = require('https');
const http = require('http');

const PROD_CONFIG = {
    api: process.argv[2],
    frontend: process.argv[3]
};

async function runTest(testName) {
    try {
        const url = new URL(`${PROD_CONFIG.api}/api/stories`);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        };
        
        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                resolve({ success: res.statusCode === 200, status: res.statusCode });
            });
            req.on('error', () => resolve({ success: false, status: 'ERROR' }));
            req.setTimeout(5000, () => resolve({ success: false, status: 'TIMEOUT' }));
            req.end();
        });
    } catch (error) {
        return { success: false, status: 'ERROR' };
    }
}

async function main() {
    console.log('Running basic connectivity test...');
    const result = await runTest('connectivity');
    
    if (result.success) {
        console.log('✅ Gating test passed');
        process.exit(0);
    } else {
        console.log(`❌ Gating test failed: ${result.status}`);
        process.exit(1);
    }
}

main();
EOF

if node /tmp/run-gating-tests.js "$API_ENDPOINT" "$FRONTEND_URL"; then
    echo -e "${GREEN}✅ Gating tests passed${NC}"
else
    echo -e "${RED}❌ Gating tests failed${NC}"
    exit 1
fi

# Step 6: Summary
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "   Frontend: $FRONTEND_URL"
echo -e "   API:      $API_ENDPOINT"
echo -e "   Region:   $REGION"
echo -e "   Stage:    $STAGE"

# Cleanup
rm -f /tmp/run-gating-tests.js

echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Open $FRONTEND_URL in your browser"
echo -e "   2. Test the Generate buttons functionality"
echo -e "   3. Monitor CloudWatch logs if issues occur"
