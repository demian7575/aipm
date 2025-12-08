#!/bin/bash
# Load AIPM context into Kiro CLI session

cat << 'EOF'
I'm working on AIPM at /repo/ebaejun/tools/aws/aipm

Key context to understand:

## Project Structure
- bin/ - Quick access commands (deploy-dev, deploy-prod, startup)
- scripts/ - Organized scripts (deployment, workers, testing, utilities)
- apps/backend/ - Node.js API server with DynamoDB
- apps/frontend/ - Vanilla JS frontend (app.js, index.html, styles.css)
- docs/ - Documentation and archived conversations
- temp/ - Temporary files (git-ignored)

## Critical Principles (READ FIRST)
1. NEVER simplify code without understanding why it's complex
2. Test comprehensively - HTTP 200 ≠ working functionality
3. Always deploy to dev first: ./bin/deploy-dev
4. Manual browser testing is MANDATORY
5. Trust user experience over automation
6. Use minimal code - avoid verbose implementations

## Development Workflow
develop → test → demo → verify → main → production

## Quick Commands
./bin/deploy-dev     # Deploy to development environment
./bin/deploy-prod    # Deploy to production (includes gating tests)
./bin/startup        # Check environment health

## Environment URLs
Production Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
Production API: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
Development Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
Development API: https://chob6arn1k.execute-api.us-east-1.amazonaws.com/dev

## EC2 Services (44.220.45.57)
- Terminal Server: :8080 (Worker Pool)
- Kiro API: :8081 (Code Generation)
- PR Processor: :8082 (GitHub Automation)

## Key Features
- User Story Management with INVEST validation
- Development Tasks with PR workflow (Generate Code & PR, Test in Dev, Merge PR)
- Refine with Kiro button (header) - opens terminal modal for PR refinement
- Mindmap visualization with auto-layout
- Gating tests for deployment validation
- ChatGPT integration for INVEST analysis

## Testing
- Gating tests: scripts/testing/run-all-gating-tests.sh
- Browser tests: production-gating-tests.html
- Deployment config tests dynamically fetch API Gateway IDs from CloudFormation

## Recent Fixes
- Fixed "Merge PR" button to check PR mergeable state (conflicts vs behind)
- Fixed "Done" button to include all story fields in update
- Added "Refine with Kiro" button to header (moved from task cards)
- Refactored deployment config tests to use environment variables and loops
- Tests now dynamically fetch API Gateway IDs instead of hardcoding

## Key Files
- DevelopmentBackground.md - Complete development guide
- DEVELOPMENT_WORKFLOW.md - Workflow documentation
- README.md - Project overview
- serverless.yml - Backend Lambda configuration

Read DevelopmentBackground.md for complete context.
EOF
