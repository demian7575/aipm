# GitHub Actions Workflows

## Overview

Automated CI/CD pipelines for AIPM with comprehensive gating tests.

## Workflows

### 1. Gating Tests (`gating-tests.yml`)
**Triggers:** Push to main/develop, Pull Requests, Manual
**Purpose:** Run all 109 gating tests
- Environment tests (19 tests)
- Browser test validation (90 tests)

### 2. Deploy to Production (`deploy-production.yml`)
**Triggers:** Push to main, Manual
**Steps:**
1. Run gating tests
2. Deploy backend (Lambda + API Gateway)
3. Deploy frontend (S3)

### 3. Deploy to Development (`deploy-development.yml`)
**Triggers:** Push to develop, Manual
**Steps:**
1. Run gating tests
2. Deploy backend to dev environment
3. Deploy frontend to dev S3

### 4. PR Validation (`pr-validation.yml`)
**Triggers:** Pull Requests to main/develop
**Steps:**
1. Run all gating tests
2. Comment results on PR
3. Block merge if tests fail

## Required Secrets

Configure these in GitHub repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment

## Test Coverage

**Total: 109 automated tests**

- ✅ API endpoint validation
- ✅ Frontend asset checks
- ✅ Feature availability
- ✅ AWS infrastructure health
- ✅ Data structure integrity
- ✅ CORS policies

## Manual Trigger

All workflows can be manually triggered from GitHub Actions tab using "Run workflow" button.
