#!/bin/bash
# Test Environment Configuration

# Test execution mode
export TEST_MODE="${TEST_MODE:-real}"  # real | mock

# Database configuration
export TEST_DB_ENV="${TEST_DB_ENV:-dev}"  # prod | dev
export TEST_STORIES_TABLE="${TEST_STORIES_TABLE:-aipm-backend-dev-stories}"
export TEST_ACCEPTANCE_TESTS_TABLE="${TEST_ACCEPTANCE_TESTS_TABLE:-aipm-backend-dev-acceptance-tests}"

# GitHub integration
export TEST_USE_MOCK_GITHUB="${TEST_USE_MOCK_GITHUB:-true}"  # true | false

# API endpoints
export TEST_API_BASE="${TEST_API_BASE:-http://localhost:4000}"
export TEST_SEMANTIC_API_BASE="${TEST_SEMANTIC_API_BASE:-http://localhost:8083}"

# SSH configuration (for remote testing)
export TEST_SSH_HOST="${TEST_SSH_HOST:-}"

# Kiro CLI mock mode
export USE_KIRO_MOCK="${USE_KIRO_MOCK:-false}"

# Test execution settings
export TEST_TIMEOUT="${TEST_TIMEOUT:-60}"
export TEST_CLEANUP="${TEST_CLEANUP:-true}"

# Print configuration
echo "🔧 Test Environment Configuration:"
echo "   TEST_MODE: $TEST_MODE"
echo "   TEST_DB_ENV: $TEST_DB_ENV"
echo "   TEST_USE_MOCK_GITHUB: $TEST_USE_MOCK_GITHUB"
echo "   TEST_API_BASE: $TEST_API_BASE"
echo "   TEST_SEMANTIC_API_BASE: $TEST_SEMANTIC_API_BASE"
echo "   USE_KIRO_MOCK: $USE_KIRO_MOCK"
echo ""
