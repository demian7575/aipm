#!/bin/bash

# Deploy from Development to Production
# This script promotes tested code from dev environment to production

set -e

echo "🚀 AIPM Development → Production Deployment"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEV_API="https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"
PROD_API="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
DEV_FRONTEND="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"
PROD_FRONTEND="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"

# Step 1: Run Development Gating Tests
echo -e "\n${YELLOW}1. Running Development Gating Tests...${NC}"
if npm run gating:dev; then
    echo -e "${GREEN}✓ Development gating tests passed${NC}"
else
    echo -e "${RED}✗ Development gating tests failed${NC}"
    echo "Cannot promote to production with failing tests"
    exit 1
fi

# Step 2: Build Application
echo -e "\n${YELLOW}2. Building Application...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"

# Step 3: Deploy Backend to Production
echo -e "\n${YELLOW}3. Deploying Backend to Production...${NC}"
serverless deploy --stage prod
echo -e "${GREEN}✓ Backend deployed to production${NC}"

# Step 4: Update Frontend Configuration for Production
echo -e "\n${YELLOW}4. Updating Frontend Configuration...${NC}"
cat > dist/public/config.js << EOF
// AIPM Frontend Configuration - Production Environment
// Deployed from development environment
window.__AIPM_API_BASE__ = 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod';

// Production API Gateway endpoint
EOF

# Step 5: Deploy Frontend to Production
echo -e "\n${YELLOW}5. Deploying Frontend to Production...${NC}"
aws s3 sync dist/public/ s3://aipm-static-hosting-demo --delete --region us-east-1
echo -e "${GREEN}✓ Frontend deployed to production${NC}"

# Step 6: Run Production Gating Tests
echo -e "\n${YELLOW}6. Running Production Gating Tests...${NC}"
sleep 10 # Wait for deployment to propagate
if curl -s "$PROD_FRONTEND/gating-tests.html" | grep -q "AIPM Gating Tests"; then
    echo -e "${GREEN}✓ Production gating tests page accessible${NC}"
else
    echo -e "${RED}✗ Production gating tests page not accessible${NC}"
fi

# Step 7: Verify Deployment
echo -e "\n${YELLOW}7. Verifying Deployment...${NC}"
PROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_API/api/stories")
if [ "$PROD_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Production API is responding${NC}"
else
    echo -e "${RED}✗ Production API not responding (HTTP $PROD_STATUS)${NC}"
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_FRONTEND")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Production frontend is accessible${NC}"
else
    echo -e "${RED}✗ Production frontend not accessible (HTTP $FRONTEND_STATUS)${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "Production URLs:"
echo "  Frontend: $PROD_FRONTEND"
echo "  API: $PROD_API"
echo "  Gating Tests: $PROD_FRONTEND/gating-tests.html"
