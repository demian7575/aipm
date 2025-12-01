# Development Workflow

**Last Updated:** 2025-12-01  
**Purpose:** Concrete step-by-step process for implementing and deploying changes

---

## 🎯 Core Principle

**NEVER deploy directly to production. Always test in development first.**

---

## 📋 Standard Workflow

### Phase 1: Discussion & Planning

**Before writing any code:**

1. **User reports issue or requests feature**
   - User describes the problem/requirement
   - Provide screenshots or error messages if applicable

2. **AI analyzes and proposes solution**
   - Explain the root cause
   - Propose 2-3 solution options with pros/cons
   - Recommend the best approach
   - **WAIT for user approval**

3. **User approves approach**
   - User says "yes", "proceed", "go ahead", etc.
   - Only then move to implementation

**Example:**
```
User: "The fields are still editable"
AI: "I see the issue. Here are 3 options:
     Option 1: Make fields read-only (simple)
     Option 2: Disable fields (keeps form structure)
     Option 3: Remove fields entirely (cleanest)
     I recommend Option 1 because..."
User: "Go with Option 1"
AI: [starts implementation]
```

---

### Phase 2: Implementation

**On main branch:**

```bash
# 1. Ensure you're on main
git checkout main
git pull origin main

# 2. Make changes
# ... edit files ...

# 3. Commit with descriptive message
git add <files>
git commit -m "feat: <description>

- Change 1
- Change 2
- Change 3"

# 4. Push to main
git push origin main
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `test:` - Test changes

---

### Phase 3: Deploy to Development

**Deploy to dev environment for testing:**

```bash
# Option A: Full deployment (backend + frontend + data sync)
./deploy-dev-full.sh

# Option B: Frontend only (faster, when backend unchanged)
git checkout main
cp apps/frontend/public/config-dev.js apps/frontend/public/config.js
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ \
  --region us-east-1 --exclude "*.md" --delete
```

**Verify deployment:**
- Visit: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- Test the changes manually
- Check browser console for errors
- Verify functionality works as expected

---

### Phase 4: User Testing & Approval

**User tests in development:**

1. **AI provides test URL**
   ```
   ✅ Deployed to development!
   Test here: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
   
   Please verify:
   - [specific thing 1]
   - [specific thing 2]
   - [specific thing 3]
   ```

2. **User tests and provides feedback**
   - "Looks good" → Proceed to production
   - "Issue with X" → Fix and redeploy to dev
   - "Change Y instead" → Discuss and implement

3. **Iterate until approved**
   - Make fixes
   - Redeploy to dev
   - User tests again
   - Repeat until approved

---

### Phase 5: Deploy to Production

**Only after user approval:**

```bash
# Full production deployment
./deploy-prod-full.sh
```

**Verify production:**
- Visit: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- Quick smoke test
- Confirm changes are live

**Announce completion:**
```
✅ Deployed to production!
Changes are now live.
```

---

## 🚫 What NOT to Do

### ❌ Anti-Pattern 1: Skip Discussion
```
User: "The fields are editable"
AI: [immediately makes changes and deploys]  ❌ WRONG
```

**Correct:**
```
User: "The fields are editable"
AI: "I can make them read-only. Should I also remove the Save button?"
User: "Yes"
AI: [makes changes]  ✅ CORRECT
```

---

### ❌ Anti-Pattern 2: Deploy to Production First
```
AI: [makes changes]
AI: ./deploy-prod-full.sh  ❌ WRONG
```

**Correct:**
```
AI: [makes changes]
AI: ./deploy-dev-full.sh  ✅ CORRECT
AI: "Please test in dev"
User: "Looks good"
AI: ./deploy-prod-full.sh  ✅ CORRECT
```

---

### ❌ Anti-Pattern 3: No Verification
```
AI: [deploys to dev]
AI: [immediately deploys to prod]  ❌ WRONG
```

**Correct:**
```
AI: [deploys to dev]
AI: "Please test: [URL]"
User: "Approved"
AI: [deploys to prod]  ✅ CORRECT
```

---

## 🔧 Common Scenarios

### Scenario 1: Frontend-Only Change

```bash
# 1. Make changes to app.js or styles.css
git add apps/frontend/public/
git commit -m "feat: make fields read-only"
git push origin main

# 2. Deploy to dev
cp apps/frontend/public/config-dev.js apps/frontend/public/config.js
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ \
  --region us-east-1 --exclude "*.md" --delete

# 3. User tests and approves

# 4. Deploy to prod
./deploy-prod-full.sh
```

---

### Scenario 2: Backend-Only Change

```bash
# 1. Make changes to apps/backend/app.js
git add apps/backend/
git commit -m "fix: correct API endpoint logic"
git push origin main

# 2. Deploy to dev
npx serverless deploy --stage dev --function api

# 3. User tests and approves

# 4. Deploy to prod
npx serverless deploy --stage prod --function api
```

---

### Scenario 3: Full Stack Change

```bash
# 1. Make changes to both frontend and backend
git add apps/
git commit -m "feat: new feature with API changes"
git push origin main

# 2. Deploy to dev
./deploy-dev-full.sh

# 3. User tests and approves

# 4. Deploy to prod
./deploy-prod-full.sh
```

---

### Scenario 4: Hotfix (Production Issue)

```bash
# 1. Identify issue in production
# 2. Make minimal fix
git add <files>
git commit -m "fix: critical production issue"
git push origin main

# 3. Deploy to dev first (even for hotfix!)
./deploy-dev-full.sh

# 4. Quick verification in dev

# 5. Deploy to prod immediately after verification
./deploy-prod-full.sh
```

---

## 📊 Deployment Checklist

### Before Every Deployment

- [ ] Changes committed to git
- [ ] Commit message is descriptive
- [ ] Code follows existing patterns
- [ ] No console.log() left in code
- [ ] No commented-out code blocks

### Development Deployment

- [ ] Deployed to dev environment
- [ ] Manually tested in browser
- [ ] No console errors
- [ ] Functionality works as expected
- [ ] User notified with test URL

### Production Deployment

- [ ] User approved dev testing
- [ ] All issues resolved
- [ ] Deployed to production
- [ ] Quick smoke test completed
- [ ] User notified of completion

---

## 🎯 Success Criteria

**A deployment is successful when:**

1. ✅ User requested the change
2. ✅ AI proposed solution and got approval
3. ✅ Changes implemented on main branch
4. ✅ Deployed to development first
5. ✅ User tested and approved in dev
6. ✅ Deployed to production
7. ✅ Verified working in production
8. ✅ User confirmed satisfaction

---

## 📝 Communication Templates

### After Implementation (Before Dev Deploy)
```
✅ Changes implemented:
- [change 1]
- [change 2]

Deploying to development for testing...
```

### After Dev Deployment
```
✅ Deployed to development!

Test here: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

Please verify:
- [specific test 1]
- [specific test 2]

Let me know when ready for production deployment.
```

### After Production Deployment
```
✅ Deployed to production!

Live at: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

Changes are now live for all users.
```

---

## 🔄 Rollback Procedure

**If production deployment has issues:**

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Revert to that commit
git revert <bad-commit-hash>
git push origin main

# 3. Redeploy immediately
./deploy-prod-full.sh

# 4. Notify user
"⚠️ Rolled back production due to [issue].
Production is now stable.
Will fix and redeploy after testing in dev."
```

---

## 📚 Quick Reference

### URLs
- **Dev:** http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Prod:** http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Dev API:** https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev
- **Prod API:** https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod

### Commands
```bash
# Deploy dev (full)
./deploy-dev-full.sh

# Deploy prod (full)
./deploy-prod-full.sh

# Deploy backend only (dev)
npx serverless deploy --stage dev --function api

# Deploy backend only (prod)
npx serverless deploy --stage prod --function api

# Deploy frontend only (dev)
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --delete

# Deploy frontend only (prod)
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --delete
```

---

**Remember: Development → Testing → Approval → Production**

**Never skip steps. Never deploy to production without user approval.**
