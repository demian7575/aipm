# Project Rules & Constraints

**Last Updated**: 2026-01-24
**Review Cycle**: Monthly (every 1st of month)
**Next Review**: 2026-02-01

## 🚨 Critical Rules (MUST FOLLOW)

### Configuration Management
- ❌ **NEVER** hardcode IPs, ports, or table names in code
- ✅ **ALWAYS** use `config/environments.yaml` as single source of truth
- ✅ Load config via `scripts/utilities/load-env-config.sh`
- 📍 **Why**: Centralized config prevents deployment errors and makes updates easy

### INVEST Validation
- ❌ Stories with score < 80 are **REJECTED** in production
- ✅ Use `skipInvestValidation=true` only in tests
- ✅ AI-generated stories must meet quality threshold
- 📍 **Why**: Ensures story quality and prevents poorly defined work

### Testing Before Deployment
- ❌ **NEVER** deploy without running Phase 1 gating tests
- ✅ All tests must pass before merge to main
- ✅ GitHub Actions automatically runs tests on push
- 📍 **Why**: Prevents breaking production with bad deployments

### Data Safety
- ❌ **NEVER** delete production data without backup
- ✅ Test destructive operations in development first
- ✅ Use cascade delete carefully (stories → tests → PRs)
- 📍 **Why**: Data loss is unrecoverable

### Git Workflow
- ❌ **NEVER** commit directly to main
- ✅ Always use feature branches
- ✅ Require PR review before merge
- ✅ Use conventional commit messages (feat:, fix:, docs:)
- 📍 **Why**: Maintains code quality and enables rollback

## ⚠️ Important Constraints

### Technical Constraints
- **Node.js**: Version 18+ required (uses native test runner)
- **AWS Region**: us-east-1 only (DynamoDB tables are regional)
- **Ports**: 4000 (API), 8082 (Session Pool), 8083 (Semantic API)
- **DynamoDB**: No SQL joins - denormalize data if needed
- **Frontend**: Vanilla JS only - no build step, no frameworks

### Performance Constraints
- **API Response**: Must be < 500ms for health checks
- **Story Creation**: INVEST analysis adds ~2-3 seconds
- **Mindmap**: Performance degrades with > 500 nodes
- **SSE Streams**: Keep-alive required for long operations

### Security Constraints
- **No Authentication**: Internal tool only, not public-facing
- **IAM Roles**: EC2 uses instance profile for DynamoDB access
- **S3 Buckets**: Public read for static hosting only
- **API Keys**: Never commit to git, use environment variables

### Cost Constraints
- **EC2**: t3.small instances (2 vCPU, 2GB RAM)
- **DynamoDB**: On-demand pricing (no reserved capacity)
- **S3**: Standard storage (no Glacier)
- **Data Transfer**: Minimize cross-region transfers

## 📚 Lessons Learned

### Architecture Decisions

**✅ DO: Use Semantic API instead of direct Kiro integration**
- **Lesson**: Direct Kiro CLI integration is fragile
- **Solution**: Semantic API + Session Pool provides stability
- **Date**: 2025-12
- **Impact**: Reduced failures from 40% to 5%

**✅ DO: Centralize configuration in YAML**
- **Lesson**: Hardcoded IPs caused deployment failures
- **Solution**: Single `config/environments.yaml` file
- **Date**: 2026-01
- **Impact**: Zero config-related deployment failures

**❌ DON'T: Use Lambda for Semantic API**
- **Lesson**: Lambda cold starts break SSE streaming
- **Solution**: Use EC2 with long-running processes
- **Date**: 2025-11
- **Impact**: Consistent streaming performance

### Development Practices

**✅ DO: Use skipInvestValidation in tests**
- **Lesson**: AI-generated stories have unpredictable scores
- **Solution**: Skip validation in test environment
- **Date**: 2026-01
- **Impact**: Tests no longer flaky

**✅ DO: Keep documentation close to code**
- **Lesson**: Separate docs get outdated quickly
- **Solution**: Docs in same repo, reviewed with PRs
- **Date**: 2026-01
- **Impact**: Documentation accuracy improved

**❌ DON'T: Trust test counter in Phase 1**
- **Lesson**: Counter shows wrong failure count
- **Solution**: Check individual test results (✅/❌)
- **Date**: 2026-01
- **Impact**: Known issue, workaround documented

### Deployment Practices

**✅ DO: Run gating tests before deploy**
- **Lesson**: Broken deployments waste time
- **Solution**: Automated tests in GitHub Actions
- **Date**: 2025-12
- **Impact**: 90% reduction in failed deployments

**✅ DO: Deploy to dev first**
- **Lesson**: Production issues are expensive
- **Solution**: Test in dev environment first
- **Date**: 2025-11
- **Impact**: Zero production incidents in 2 months

**❌ DON'T: Deploy on Fridays**
- **Lesson**: Weekend issues are hard to fix
- **Solution**: Deploy Mon-Thu only
- **Date**: 2025-10
- **Impact**: Better work-life balance

## 🔄 Automatic Update Process

### Monthly Review (1st of each month)

**Automated Reminder**:
```bash
# Add to crontab
0 9 1 * * cd /path/to/aipm && echo "📅 Monthly rules review due!" | mail -s "AIPM Rules Review" team@example.com
```

**Review Checklist**:
- [ ] Review all rules - are they still relevant?
- [ ] Check constraints - any changes needed?
- [ ] Update lessons learned - any new insights?
- [ ] Update .kirocontext with new rules
- [ ] Update documentation if rules changed
- [ ] Commit changes with date

### Triggered Updates (When events occur)

**After Production Incident**:
1. Document what went wrong
2. Add new rule to prevent recurrence
3. Update .kirocontext
4. Share with team

**After Major Feature**:
1. Document new constraints
2. Update architecture decisions
3. Add lessons learned
4. Update relevant docs

**After Performance Issue**:
1. Document bottleneck
2. Add performance constraint
3. Update monitoring
4. Share solution

### Version Control

```bash
# Track rule changes
git log --oneline docs/RULES.md

# See what changed
git diff HEAD~1 docs/RULES.md

# Blame for context
git blame docs/RULES.md
```

## 📊 Metrics to Track

### Rule Compliance
- Configuration violations: 0 per month (target)
- Test skips before deploy: 0 per month (target)
- Direct main commits: 0 per month (target)

### Constraint Violations
- API response > 500ms: < 5% (target)
- INVEST score < 80: < 10% (acceptable for drafts)
- Failed deployments: < 1 per month (target)

### Lessons Applied
- Repeat incidents: 0 per quarter (target)
- Documentation accuracy: > 95% (target)
- Time to onboard new dev: < 1 day (target)

## 🔗 Integration with Development

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
# Check for hardcoded IPs
if git diff --cached | grep -E '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | grep -v 'config/environments.yaml'; then
  echo "❌ Hardcoded IP detected! Use config/environments.yaml"
  exit 1
fi
```

### PR Template
```markdown
## Checklist
- [ ] No hardcoded IPs/ports/tables
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Follows code style
- [ ] No new lessons learned to document?
```

### Kiro Context
Rules are automatically loaded via `.kirocontext`:
```bash
kiro-cli chat "What are the project rules?"
kiro-cli chat "Can I hardcode this IP?"
kiro-cli chat "What did we learn about Lambda?"
```

## 📝 How to Update This Document

### Adding a New Rule
1. Add to appropriate section
2. Include **Why** explanation
3. Update **Last Updated** date
4. Update `.kirocontext` if critical
5. Commit with: `docs: add rule about X`

### Adding a Lesson Learned
1. Add to Lessons Learned section
2. Include: Lesson, Solution, Date, Impact
3. Update **Last Updated** date
4. Share with team
5. Commit with: `docs: add lesson about X`

### Removing Outdated Rule
1. Move to "Deprecated Rules" section (create if needed)
2. Explain why it's no longer relevant
3. Update **Last Updated** date
4. Update `.kirocontext`
5. Commit with: `docs: deprecate rule about X`

## 🎯 Success Criteria

This document is successful if:
- ✅ New developers understand constraints in < 1 hour
- ✅ Rules prevent repeat mistakes
- ✅ Lessons are applied to new features
- ✅ Document stays up to date (< 1 month old)
- ✅ Team references it regularly

---

**Next Review**: 2026-02-01
**Owner**: Development Team
**Reviewers**: All contributors
