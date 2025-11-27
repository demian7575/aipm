#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration (can be overridden by deploy-config.yaml)
REGION="us-east-1"
S3_BUCKET="aipm-static-hosting-demo"
STAGE="prod"
STACK_NAME="aipm-backend"

# Parse YAML config if available (simple parsing for our use case)
if [ -f "deploy-config.yaml" ]; then
    echo -e "${BLUE}📋 Loading configuration from deploy-config.yaml${NC}"
    REGION=$(grep -A 10 "deployment:" deploy-config.yaml | grep "region:" | awk '{print $2}' | tr -d '"' || echo $REGION)
    STAGE=$(grep -A 10 "deployment:" deploy-config.yaml | grep "stage:" | awk '{print $2}' | tr -d '"' || echo $STAGE)
    S3_BUCKET=$(grep -A 10 "frontend:" deploy-config.yaml | grep "s3Bucket:" | awk '{print $2}' | tr -d '"' || echo $S3_BUCKET)
fi

echo -e "${YELLOW}🚀 AIPM Full Stack Deployment${NC}"
echo -e "${BLUE}   Region: $REGION${NC}"
echo -e "${BLUE}   Stage:  $STAGE${NC}"
echo -e "${BLUE}   Bucket: $S3_BUCKET${NC}"
echo ""

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 not found. Please install it first.${NC}"
        exit 1
    fi
}

# Pre-flight checks
echo -e "${YELLOW}🔍 Pre-flight checks...${NC}"
check_command "aws"
check_command "node"
check_command "npm"

if ! command -v serverless &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Serverless Framework...${NC}"
    npm install -g serverless
fi

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

# Step 2: Deploy backend infrastructure
echo -e "${YELLOW}🏗️  Deploying backend (Lambda + API Gateway + DynamoDB)...${NC}"
serverless deploy --stage $STAGE --region $REGION

# Step 3: Get API endpoint
API_ENDPOINT=$(serverless info --stage $STAGE --region $REGION | grep "https://" | head -1 | awk '{print $3}' | sed 's/{proxy+}//')
if [ -z "$API_ENDPOINT" ]; then
    echo -e "${RED}❌ Failed to get API endpoint${NC}"
    exit 1
fi

# Step 4: Update frontend config
echo -e "${YELLOW}⚙️  Updating frontend configuration...${NC}"
cat > apps/frontend/public/config.js << EOF
// Production configuration
window.CONFIG = {
    api: '$API_ENDPOINT',
    environment: 'production'
};
EOF

# Step 5: Deploy frontend to S3
echo -e "${YELLOW}🌐 Deploying frontend to S3...${NC}"

# Sync all files
aws s3 sync apps/frontend/public/ s3://$S3_BUCKET/ \
    --delete \
    --region $REGION \
    --exclude "*.DS_Store" \
    --exclude "*.git*"

# Set content types
aws s3 cp s3://$S3_BUCKET/index.html s3://$S3_BUCKET/index.html \
    --content-type "text/html" \
    --metadata-directive REPLACE \
    --region $REGION

aws s3 cp s3://$S3_BUCKET/styles.css s3://$S3_BUCKET/styles.css \
    --content-type "text/css" \
    --metadata-directive REPLACE \
    --region $REGION

# Step 6: Health checks
FRONTEND_URL="http://$S3_BUCKET.s3-website-$REGION.amazonaws.com"

echo -e "${YELLOW}🏥 Running health checks...${NC}"

# API health check
echo -n "   API endpoint... "
if curl -s -f "$API_ENDPOINT/api/stories" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo -e "${RED}API health check failed. Check CloudWatch logs.${NC}"
    exit 1
fi

# Frontend health check
echo -n "   Frontend... "
if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo -e "${RED}Frontend health check failed.${NC}"
    exit 1
fi

# Step 6.5: Validate gating tests are up to date
echo -e "${YELLOW}🔍 Validating gating test coverage...${NC}"
if [ -f "update-gating-tests.js" ]; then
    echo "   Gating test update system available ✅"
else
    echo -e "${YELLOW}   ⚠️  Gating test update system not found${NC}"
fi

# Step 7: Run gating tests
echo -e "${YELLOW}🧪 Running production gating tests...${NC}"

# Create comprehensive gating test
cat > /tmp/comprehensive-gating-test.js << 'EOF'
const https = require('https');
const { URL } = require('url');

const API_BASE = process.argv[2];

async function runTest(test) {
    return new Promise((resolve) => {
        const url = new URL(API_BASE + test.path);
        const postData = test.body ? JSON.stringify(test.body) : null;
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: test.method,
            headers: {
                'Accept': 'application/json',
                ...(postData && { 'Content-Type': 'application/json', 'Content-Length': postData.length })
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const success = res.statusCode >= 200 && res.statusCode < 300;
                resolve({ success, status: res.statusCode, test: test.name, data });
            });
        });

        req.on('error', () => resolve({ success: false, status: 'ERROR', test: test.name }));
        req.setTimeout(10000, () => resolve({ success: false, status: 'TIMEOUT', test: test.name }));
        
        if (postData) req.write(postData);
        req.end();
    });
}

async function main() {
    console.log('Running comprehensive gating tests...');
    
    let passed = 0;
    let failed = 0;
    const createdStoryIds = [];
    
    // First get stories to find a valid story ID
    const storiesTest = { name: 'Stories API', path: '/api/stories', method: 'GET' };
    process.stdout.write(`   ${storiesTest.name}... `);
    const storiesResult = await runTest(storiesTest);
    
    let storyId = null;
    if (storiesResult.success) {
        console.log('✅');
        passed++;
        try {
            const stories = JSON.parse(storiesResult.data);
            if (stories.length > 0) {
                storyId = stories[0].id;
            }
        } catch (e) {
            console.log('   Warning: Could not parse stories response');
        }
    } else {
        console.log(`❌ (${storiesResult.status})`);
        failed++;
    }
    
    // Test story draft creation
    const storyDraftTest = { name: 'Story Draft', path: '/api/stories/draft', method: 'POST', body: { idea: 'test story' } };
    process.stdout.write(`   ${storyDraftTest.name}... `);
    const storyDraftResult = await runTest(storyDraftTest);
    
    if (storyDraftResult.success) {
        console.log('✅');
        passed++;
    } else {
        console.log(`❌ (${storyDraftResult.status})`);
        failed++;
    }
    
    // Test actual story creation (not just draft)
    const storyCreateTest = { 
        name: 'Story Creation', 
        path: '/api/stories', 
        method: 'POST', 
        body: { 
            title: 'Gating Test Story', 
            description: 'Test story creation',
            asA: 'a tester',
            iWant: 'to verify story creation works',
            soThat: 'the system functions correctly',
            acceptWarnings: true
        } 
    };
    process.stdout.write(`   ${storyCreateTest.name}... `);
    const storyCreateResult = await runTest(storyCreateTest);
    
    if (storyCreateResult.success) {
        try {
            const createdStory = JSON.parse(storyCreateResult.data);
            if (createdStory && createdStory.id) {
                console.log('✅');
                passed++;
                createdStoryIds.push(createdStory.id);
            } else {
                console.log('❌ (null response)');
                failed++;
            }
        } catch (e) {
            console.log('❌ (invalid response)');
            failed++;
        }
    } else {
        console.log(`❌ (${storyCreateResult.status})`);
        failed++;
    }
    
    // Test acceptance test draft if we have a story ID
    if (storyId) {
        const acceptanceTestTest = { 
            name: 'Acceptance Test Draft', 
            path: `/api/stories/${storyId}/tests/draft`, 
            method: 'POST', 
            body: { idea: 'test' } 
        };
        process.stdout.write(`   ${acceptanceTestTest.name}... `);
        const acceptanceTestResult = await runTest(acceptanceTestTest);
        
        if (acceptanceTestResult.success) {
            console.log('✅');
            passed++;
        } else {
            console.log(`❌ (${acceptanceTestResult.status})`);
            failed++;
        }
    } else {
        console.log('   Acceptance Test Draft... ⚠️  (No story ID available)');
    }
    
    // Test Create PR flow if we have a created story
    if (createdStoryIds.length > 0) {
        const createPRTest = { 
            name: 'Create PR Flow', 
            path: `/api/stories/${createdStoryIds[0]}/tests`, 
            method: 'POST', 
            body: { 
                given: ['Given the system is ready'],
                when: ['When the user performs the action'],
                then: ['Then the expected result occurs'],
                acceptWarnings: true
            } 
        };
        process.stdout.write(`   ${createPRTest.name}... `);
        const createPRResult = await runTest(createPRTest);
        
        if (createPRResult.success) {
            console.log('✅');
            passed++;
        } else {
            console.log(`❌ (${createPRResult.status})`);
            failed++;
        }
    } else {
        console.log('   Create PR Flow... ⚠️  (No created story available)');
    }
    
    // Cleanup: Delete created stories
    if (createdStoryIds.length > 0) {
        console.log('\n🧹 Cleaning up created stories...');
        for (const storyId of createdStoryIds) {
            const deleteTest = { 
                name: `Delete Story ${storyId}`, 
                path: `/api/stories/${storyId}`, 
                method: 'DELETE' 
            };
            const deleteResult = await runTest(deleteTest);
            if (deleteResult.success) {
                console.log(`   Deleted story ${storyId} ✅`);
            } else {
                console.log(`   Failed to delete story ${storyId} ❌`);
            }
        }
    }
    
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
EOF

if node /tmp/comprehensive-gating-test.js "$API_ENDPOINT"; then
    echo -e "${GREEN}✅ All gating tests passed${NC}"
else
    echo -e "${RED}❌ Some gating tests failed${NC}"
    exit 1
fi

# Step 8: Success summary
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Deployment Summary:${NC}"
echo -e "   🌐 Frontend:  $FRONTEND_URL"
echo -e "   🔗 API:       $API_ENDPOINT"
echo -e "   🌍 Region:    $REGION"
echo -e "   🏷️  Stage:     $STAGE"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo -e "   1. Open the frontend URL in your browser"
echo -e "   2. Test the Generate buttons functionality"
echo -e "   3. Monitor CloudWatch logs: aws logs tail /aws/lambda/$STACK_NAME-$STAGE-api --follow"

# Cleanup
rm -f /tmp/comprehensive-gating-test.js

echo -e "${GREEN}✨ Ready to use!${NC}"
