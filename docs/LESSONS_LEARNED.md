# AIPM Development Lessons Learned - 2025

## 🎯 Critical Development Lessons

### **Configuration Management**
- **❌ Never modify local `config.js` during deployment**
  - **Issue**: Local config affects both environments when deployed
  - **Solution**: Use temporary files and direct S3 uploads only
  - **Date**: 2025-12-28

### **Git Workflow & Concurrent Development**
- **❌ Always check for concurrent PRs before rebasing**
  - **Issue**: PR #907 overwrote modal fix during rebase (showModal → style.display)
  - **Root Cause**: Concurrent development without coordination
  - **Solution**: Check active PRs, use feature branches for critical fixes
  - **Date**: 2025-12-28

### **Modal Implementation**
- **❌ Don't mix HTML5 dialog API with div elements**
  - **Issue**: `modal.showModal()` not supported on `<div>` elements
  - **Solution**: Use `modal.style.display = 'flex/none'` for div-based modals
  - **Date**: 2025-12-28

### **Environment Isolation**
- **❌ Shared resources cause production/development conflicts**
  - **Issue**: Both environments using same EC2 server
  - **Solution**: Dedicated EC2 instances for complete isolation
  - **Date**: 2025-12-28

### **Data Synchronization**
- **❌ Development environments need fresh production data**
  - **Issue**: Development had stale test data (20 vs 8 stories)
  - **Solution**: Implement production → development mirroring in deployment
  - **Date**: 2025-12-28

---

## 🔧 Technical Debt & Architecture

### **Lambda → EC2 Migration**
- **✅ EC2 provides better performance than Lambda**
  - **Benefits**: No cold starts, dedicated resources, no timeout limits
  - **Trade-offs**: Higher operational overhead, manual scaling
  - **Date**: 2025-12-28

### **VPC Configuration Issues**
- **❌ Lambda VPC configuration can cause DynamoDB timeouts**
  - **Issue**: Development Lambda (eppae4ae82) times out accessing DynamoDB
  - **Root Cause**: VPC security group blocking DynamoDB access
  - **Date**: 2025-12-28

---

## 🚀 Deployment Best Practices

### **Verification Steps**
1. **Always verify fixes survive git operations**
2. **Test critical functionality after merges/rebases**
3. **Check both environments after configuration changes**
4. **Verify service status after EC2 deployments**

### **Configuration Deployment**
1. **Use environment-specific temporary files**
2. **Deploy configs directly to S3, never via git**
3. **Verify configs are correct after deployment**
4. **Keep local config.js as template only**

### **Git Workflow**
1. **Check active PRs before major operations**
2. **Use feature branches for critical fixes**
3. **Coordinate with team on concurrent development**
4. **Verify critical changes survive merges**

---

## 📊 Monitoring & Debugging

### **Common Error Patterns**
- **"Using Offline Data"**: Frontend config pointing to wrong backend
- **Modal JavaScript errors**: Browser compatibility issues
- **504 Gateway Timeout**: VPC configuration or service down
- **CORS errors**: Missing HTTP methods in backend policy

### **Debugging Checklist**
1. **Check service status**: `systemctl status [service]`
2. **Verify endpoints**: `curl [endpoint]`
3. **Check logs**: `journalctl -u [service] -n 10`
4. **Verify configs**: Compare S3 vs local configs
5. **Test both environments**: Don't assume fixes work everywhere

---

## 🎓 Development Principles

### **Environment Management**
- **Complete isolation**: Separate EC2, DynamoDB, S3 configs
- **Data mirroring**: Keep development in sync with production
- **Service parity**: Same services running in both environments

### **Code Quality**
- **Browser compatibility**: Test modal/dialog implementations
- **Error handling**: Graceful fallbacks for API failures
- **Configuration validation**: Verify configs before deployment

### **Team Coordination**
- **Communication**: Coordinate on shared file changes
- **Documentation**: Update lessons learned after incidents
- **Testing**: Verify fixes work in both environments

---

## 📝 Incident Response

### **When Things Break**
1. **Identify scope**: Production only or both environments?
2. **Check recent changes**: Git log, deployments, config changes
3. **Verify basics**: Service status, network connectivity, configs
4. **Fix systematically**: One environment at a time
5. **Document lessons**: Add to this file for future reference

### **Post-Incident**
1. **Root cause analysis**: Trace exact sequence of events
2. **Process improvements**: Update procedures to prevent recurrence
3. **Documentation updates**: Reflect new understanding
4. **Team knowledge sharing**: Ensure lessons are communicated

---

*Last Updated: 2025-12-28*  
*Next Review: When significant incidents occur*
