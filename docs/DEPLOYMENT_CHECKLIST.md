# Deployment Checklist

## Purpose

This checklist prevents common deployment errors by ensuring all prerequisites are met before deployment.

**Principle:** Prevention > Fixing

## Pre-Deployment Checklist

### Automated Checks

Run pre-deployment validation:
```bash
./scripts/testing/test-deployment-prerequisites.sh
```

This checks:
- [ ] Port 8081 accessible
- [ ] EC2 on develop branch
- [ ] No uncommitted changes on EC2
- [ ] EC2 up to date with origin
- [ ] Kiro API service running
- [ ] Kiro CLI installed
- [ ] AWS credentials configured
- [ ] Serverless framework available

### Manual Checks

- [ ] Code changes committed and pushed to develop
- [ ] Local tests passing
- [ ] No breaking changes in API
- [ ] Documentation updated

## Deployment Options

### Option 1: Safe Deployment (Recommended)

Uses automated error prevention:
```bash
./scripts/deployment/deploy-kiro-api-safe.sh
```

This script:
1. Runs pre-deployment validation
2. Auto-handles git state (stash, checkout, reset)
3. Deploys files
4. Auto-opens port 8081 if needed
5. Runs post-deployment validation
6. Runs gating tests

### Option 2: Manual Deployment

If you need more control:
```bash
# 1. Run pre-checks
./scripts/testing/test-deployment-prerequisites.sh

# 2. Fix any issues found

# 3. Deploy
./scripts/deployment/deploy-kiro-api.sh

# 4. Run gating tests
./scripts/testing/test-kiro-api-gating.sh
```

## Post-Deployment Checklist

### Immediate Verification

- [ ] Health check returns 200
  ```bash
  curl http://3.92.96.67:8081/health
  ```

- [ ] Gating tests pass
  ```bash
  ./scripts/testing/test-kiro-api-gating.sh
  ```

- [ ] Service is running
  ```bash
  ssh ec2-user@3.92.96.67 "sudo systemctl status kiro-api-server"
  ```

### Functional Testing

- [ ] Create test PR via UI
- [ ] Verify Development Task card appears
- [ ] Monitor Kiro API logs
  ```bash
  ssh ec2-user@3.92.96.67 "tail -f /tmp/kiro-api-server.log"
  ```
- [ ] Verify code is generated and pushed
- [ ] Check PR on GitHub

### Monitoring (First 24 Hours)

- [ ] Check logs every 2 hours for errors
- [ ] Monitor completion detection success rate
- [ ] Verify no tasks hanging indefinitely
- [ ] Check queue length stays reasonable (0-2)

## Common Issues and Prevention

### Issue: Port 8081 Not Accessible

**Prevention:**
- ✅ Pre-deployment test checks port
- ✅ Safe deployment script auto-opens port
- ✅ Gating test verifies port after deployment

**Manual Fix:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-02f23dc345006410d \
  --ip-permissions IpProtocol=tcp,FromPort=8081,ToPort=8081,IpRanges='[{CidrIp=0.0.0.0/0}]'
```

### Issue: EC2 Git Conflicts

**Prevention:**
- ✅ Pre-deployment test checks git state
- ✅ Safe deployment script auto-handles stash/reset
- ✅ Always deploys from clean state

**Manual Fix:**
```bash
ssh ec2-user@3.92.96.67 "cd ~/aipm && git stash && git checkout develop && git reset --hard origin/develop"
```

### Issue: Service Not Running

**Prevention:**
- ✅ Pre-deployment test checks service status
- ✅ Deployment script restarts service
- ✅ Post-deployment test verifies service

**Manual Fix:**
```bash
ssh ec2-user@3.92.96.67 "sudo systemctl restart kiro-api-server"
```

### Issue: Gating Tests Fail

**Prevention:**
- ✅ Run tests before deployment
- ✅ Run tests after deployment
- ✅ Block deployment if tests fail

**Manual Fix:**
- Check logs for specific failure
- Fix issue
- Re-run tests
- Re-deploy if needed

## Rollback Procedure

If deployment fails:

1. **Check what failed:**
   ```bash
   ssh ec2-user@3.92.96.67 "tail -100 /tmp/kiro-api-server.log"
   ```

2. **Rollback to previous version:**
   ```bash
   ssh ec2-user@3.92.96.67 "cd ~/aipm && git reset --hard <previous-commit>"
   ssh ec2-user@3.92.96.67 "sudo systemctl restart kiro-api-server"
   ```

3. **Verify rollback:**
   ```bash
   ./scripts/testing/test-kiro-api-gating.sh
   ```

4. **Document issue:**
   - Add to DEPLOYMENT_ERRORS.md
   - Create prevention measure
   - Update this checklist

## Success Criteria

Deployment is successful when:

- ✅ All pre-deployment checks pass
- ✅ All post-deployment checks pass
- ✅ All gating tests pass (10/10)
- ✅ Health endpoint returns 200
- ✅ Service is running
- ✅ Can create PR via UI
- ✅ Development Task card appears
- ✅ Code generation works end-to-end

## Continuous Improvement

After each deployment:

1. **Document any issues encountered**
   - Add to DEPLOYMENT_ERRORS.md
   - Include root cause and fix

2. **Add prevention measures**
   - Update pre-deployment tests
   - Update deployment scripts
   - Update this checklist

3. **Automate manual steps**
   - If you did it manually, automate it
   - Add to safe deployment script
   - Add to gating tests

4. **Update documentation**
   - Keep this checklist current
   - Update runbooks
   - Share learnings with team

## Quick Reference

```bash
# Full safe deployment
./scripts/deployment/deploy-kiro-api-safe.sh

# Just pre-checks
./scripts/testing/test-deployment-prerequisites.sh

# Just gating tests
./scripts/testing/test-kiro-api-gating.sh

# Check service
ssh ec2-user@3.92.96.67 "sudo systemctl status kiro-api-server"

# View logs
ssh ec2-user@3.92.96.67 "tail -f /tmp/kiro-api-server.log"

# Restart service
ssh ec2-user@3.92.96.67 "sudo systemctl restart kiro-api-server"
```

## Remember

**Prevention > Fixing**

Every error is an opportunity to improve the system. Don't just fix it—prevent it from happening again.
