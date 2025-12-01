#!/bin/bash
# Load AIPM context into Kiro CLI session

cat << 'EOF'
I'm working on AIPM at /repo/ebaejun/tools/aws/aipm

Key context to understand:

## Project Structure
- bin/ - Quick access commands (deploy-dev, deploy-prod, startup)
- scripts/ - Organized scripts (deployment, workers, testing, utilities)
- apps/backend/ - Node.js API server with DynamoDB
- apps/frontend/ - Vanilla JS frontend
- docs/ - Documentation and archived conversations
- temp/ - Temporary files (git-ignored)

## Critical Principles (READ FIRST)
1. NEVER simplify code without understanding why it's complex
2. Test comprehensively - HTTP 200 ≠ working functionality
3. Always deploy to dev first: ./bin/deploy-dev
4. Manual browser testing is MANDATORY
5. Trust user experience over automation

## Development Workflow
develop → test → demo → verify → main → production

## Quick Commands
./bin/deploy-dev     # Deploy to development
./bin/deploy-prod    # Deploy to production (after dev testing)
./bin/startup        # Check environment health

## Environment URLs
Production: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
Development: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com

## Key Files
- DevelopmentBackground.md - Complete development guide
- DEVELOPMENT_WORKFLOW.md - Workflow documentation
- README.md - Project overview

Read DevelopmentBackground.md for complete context.
EOF
