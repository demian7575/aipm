# AI Assistant Prompt for AIPM Development

## Context Loading Prompt

When starting AIPM development with an AI assistant, use this prompt:

---

**AIPM Development Context**

I'm working on the AI Project Manager (AIPM) application. Please read and understand these key documents:

1. **START_HERE.md** - Complete development guide and principles
2. **DEPLOYMENT_STRATEGY.md** - Environment isolation and deployment details
3. **DEVELOPMENT_PRINCIPLES.md** - Core development principles
4. **LESSONS_LEARNED.md** - Key insights and anti-patterns

**Key Principles to Follow:**

1. **Complete Environment Isolation**
   - Each environment (dev/prod) has its own: Frontend, Backend, Lambda, API Gateway, DynamoDB
   - Never share resources between environments
   - Use `./deploy-dev-full.sh` or `./deploy-prod-full.sh` for complete deployments

2. **Development First, Production After**
   - Always test in development environment first
   - Run gating tests before production deployment
   - Manual browser testing is mandatory
   - Never skip the verification cycle

3. **Trust User Experience Over Automation**
   - Automated tests can pass while browser fails (CORS, DOM, timing issues)
   - Always verify in actual browser
   - User reports are ground truth

4. **Minimal Code Approach**
   - Write only the absolute minimal code needed
   - Avoid verbose implementations
   - Focus on what directly contributes to the solution

**Current Architecture:**

```
Tech Stack:
- Frontend: Vanilla JavaScript, HTML, CSS
- Backend: Node.js 18.x, Express 5.x
- Database: DynamoDB (stories + acceptance tests)
- Infrastructure: AWS Lambda, API Gateway, S3
- Deployment: Serverless Framework 3.x

Environments:
- Development: develop branch → aipm-dev-* resources
- Production: main branch → aipm-prod-* resources
```

**Standard Workflow:**

```bash
# 1. Develop
git checkout develop
# ... make changes ...
git push origin develop

# 2. Deploy to dev
./deploy-dev-full.sh

# 3. Test & verify
node run-comprehensive-gating-tests.cjs
# Manual browser testing

# 4. Promote to prod
git checkout main
git merge develop
git push origin main

# 5. Deploy to prod
./deploy-prod-full.sh
```

**Critical Rules:**

❌ Never:
- Deploy directly to production without dev testing
- Skip gating tests
- Trust automation alone
- Share resources between environments
- Ignore user-reported issues

✅ Always:
- Test in development first
- Run gating tests
- Manual browser verification
- Deploy complete environment
- Follow the workflow cycle

**When helping me:**
- Suggest minimal, focused solutions
- Consider environment isolation
- Remind me to test in dev first
- Check for browser compatibility issues
- Follow the established patterns in the codebase

---

## Quick Reference for AI

### File Structure
```
/repo/ebaejun/tools/aws/aipm/
├── apps/frontend/public/     # Frontend files
├── apps/backend/             # Backend API
├── deploy-dev-full.sh        # Deploy complete dev
├── deploy-prod-full.sh       # Deploy complete prod
├── serverless.yml            # Infrastructure config
└── START_HERE.md             # Main guide
```

### Common Commands
```bash
# Deploy environments
./deploy-dev-full.sh          # Complete dev deployment
./deploy-prod-full.sh         # Complete prod deployment

# Testing
node run-comprehensive-gating-tests.cjs

# Logs
npx serverless logs -f api --stage dev --tail
npx serverless logs -f api --stage prod --tail

# Rollback
git reset --hard <commit>
./deploy-<dev|prod>-full.sh
```

### Environment URLs
- Dev Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- Prod Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

### Resource Naming
- Dev: `aipm-backend-dev-*`
- Prod: `aipm-backend-prod-*`

### Key Insights
1. Automated tests ≠ Reality (always test in browser)
2. Environment context matters (same-origin testing)
3. DOM access limitations (test artifacts, not runtime)
4. User experience is truth
5. Complete isolation prevents cross-environment issues

---

## Update Instructions

When making significant changes to AIPM:

```bash
# Update START_HERE.md with changes
./update-start-here.sh "Description of changes"

# Update this prompt file if principles change
# Edit AI_ASSISTANT_PROMPT.md
```

---

**Last Updated**: 2025-11-28 10:02 JST
