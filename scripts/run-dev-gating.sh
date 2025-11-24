#!/bin/bash

# Development Environment Gating Tests
# This script runs comprehensive gating tests for the development environment

set -e

echo "🚀 Starting Development Environment Gating Tests..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEV_API_BASE="https://0v2m13m6h8.execute-api.us-east-1.amazonaws.com/dev"
DEV_FRONTEND_BASE="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "Checking $description... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

# Function to run Node.js tests
run_node_tests() {
    echo -e "\n${YELLOW}Running Node.js Gating Tests...${NC}"
    if npm test -- tests/dev-gating.test.js; then
        echo -e "${GREEN}✓ Node.js tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Node.js tests failed${NC}"
        return 1
    fi
}

# Basic connectivity tests
echo -e "\n${YELLOW}1. Basic Connectivity Tests${NC}"
echo "--------------------------------"

CONNECTIVITY_PASSED=0

if check_url "$DEV_API_BASE/api/stories" "200" "API Gateway Stories Endpoint"; then
    ((CONNECTIVITY_PASSED++))
fi

if check_url "$DEV_FRONTEND_BASE" "200" "Frontend Static Website"; then
    ((CONNECTIVITY_PASSED++))
fi

if check_url "$DEV_FRONTEND_BASE/config.js" "200" "Frontend Configuration"; then
    ((CONNECTIVITY_PASSED++))
fi

# CORS tests
echo -e "\n${YELLOW}2. CORS Configuration Tests${NC}"
echo "--------------------------------"

CORS_PASSED=0

echo -n "Checking CORS preflight... "
if curl -s -X OPTIONS \
    -H "Origin: $DEV_FRONTEND_BASE" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$DEV_API_BASE/api/stories" \
    -w "%{http_code}" | grep -q "200"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((CORS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# API functionality tests
echo -e "\n${YELLOW}3. API Functionality Tests${NC}"
echo "--------------------------------"

API_PASSED=0

echo -n "Testing GET /api/stories... "
if curl -s "$DEV_API_BASE/api/stories" | grep -q '\['; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((API_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Run comprehensive Node.js tests
echo -e "\n${YELLOW}4. Comprehensive Test Suite${NC}"
echo "--------------------------------"

NODE_TESTS_PASSED=0
if run_node_tests; then
    NODE_TESTS_PASSED=1
fi

# Summary
echo -e "\n${YELLOW}Gating Test Results Summary${NC}"
echo "=================================="
echo "Connectivity Tests: $CONNECTIVITY_PASSED/3 passed"
echo "CORS Tests: $CORS_PASSED/1 passed"
echo "API Tests: $API_PASSED/1 passed"
echo "Node.js Tests: $NODE_TESTS_PASSED/1 passed"

TOTAL_PASSED=$((CONNECTIVITY_PASSED + CORS_PASSED + API_PASSED + NODE_TESTS_PASSED))
TOTAL_TESTS=6

echo -e "\nOverall: $TOTAL_PASSED/$TOTAL_TESTS tests passed"

if [ $TOTAL_PASSED -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}🎉 All gating tests passed! Development environment is ready.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some gating tests failed. Development environment needs attention.${NC}"
    exit 1
fi
