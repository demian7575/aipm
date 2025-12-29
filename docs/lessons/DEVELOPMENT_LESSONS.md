# Development Lessons Learned

## 🎓 Critical Lessons from AIPM Development

### Database Architecture Lessons

#### Lesson 1: SQLite Emulation Layer Limitations
**Problem**: DynamoDB emulation layer using SQLite syntax didn't properly sync UPDATE operations.

**Impact**: "Done" button status updates failed silently, causing user confusion.

**Solution**: Direct DynamoDB operations for critical updates.

**Rule**: 
```
RULE: For production DynamoDB deployments, use native AWS SDK operations 
for critical data updates rather than relying on emulation layers.
```

**Code Pattern**:
```javascript
// ❌ Avoid: SQLite emulation for critical updates
const update = db.prepare('UPDATE user_stories SET status = ? WHERE id = ?');

// ✅ Prefer: Direct DynamoDB operations
await dynamoClient.send(new UpdateItemCommand({
  TableName: 'stories',
  Key: { id: { N: String(storyId) } },
  UpdateExpression: 'SET #status = :status',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: { ':status': { S: newStatus } }
}));
```

#### Lesson 2: Environment Configuration Drift
**Problem**: Multiple deployment scripts overwrote configs, causing production to point to dead Lambda endpoints.

**Impact**: System appeared broken in production while working in development.

**Solution**: Centralized config management with environment-specific validation.

**Rule**:
```
RULE: Always validate configuration after deployment and implement 
config drift detection in monitoring systems.
```

### GitHub Integration Lessons

#### Lesson 3: Branch Name Conflicts
**Problem**: GitHub API returned 422 errors when branch names already existed.

**Impact**: PR creation failed intermittently, breaking user workflow.

**Solution**: Automatic retry with incremental suffixes (-1, -2, etc.).

**Rule**:
```
RULE: Always implement conflict resolution for resource creation 
operations that may have naming collisions.
```

#### Lesson 4: Empty Branch PR Creation
**Problem**: Creating PRs from branches with no commits caused "No commits between branches" errors.

**Impact**: PR creation appeared successful but GitHub rejected it.

**Solution**: Mandatory placeholder file creation before PR creation.

**Rule**:
```
RULE: Ensure branches have at least one commit before creating pull requests.
Create meaningful placeholder content that adds value.
```

### User Experience Lessons

#### Lesson 5: Modal Fatigue
**Problem**: Multiple modals for PR creation and code generation slowed workflow.

**Impact**: Users avoided using features due to friction.

**Solution**: One-click operations with smart defaults.

**Rule**:
```
RULE: Minimize modal dialogs in frequently-used workflows. 
Use smart defaults and allow customization through settings.
```

#### Lesson 6: ANSI Escape Code Display
**Problem**: Terminal output showed raw escape codes like `[0m`, `[1m` instead of colors.

**Impact**: Terminal was unreadable and unprofessional.

**Solution**: Convert ANSI codes to HTML spans with CSS colors.

**Rule**:
```
RULE: Always process terminal output for web display. 
Convert control characters to appropriate HTML/CSS equivalents.
```

### Service Integration Lessons

#### Lesson 7: Fresh Branch Strategy
**Problem**: Code generation on existing branches caused merge conflicts and stale code.

**Impact**: Generated code was often outdated or conflicted with recent changes.

**Solution**: Always create fresh branches from latest main for code generation.

**Rule**:
```
RULE: For AI code generation, always start from the latest main branch 
to avoid conflicts and ensure generated code is current.
```

#### Lesson 8: Service Health Monitoring
**Problem**: Development services (terminal, Kiro) went down without detection.

**Impact**: Features appeared broken with no clear indication why.

**Solution**: Comprehensive health checks and automatic service restart.

**Rule**:
```
RULE: Implement health endpoints for all services and monitor them 
continuously with automatic recovery procedures.
```

## 🏗️ Architecture Decision Records

### ADR-001: EC2 vs Lambda for Backend
**Decision**: Use EC2 instances instead of Lambda functions.

**Reasoning**: 
- Long-running AI operations exceed Lambda timeout limits
- WebSocket support needed for terminal functionality
- Persistent connections improve performance

**Trade-offs**: Higher operational overhead but better functionality.

### ADR-002: DynamoDB vs RDS
**Decision**: Use DynamoDB for primary data storage.

**Reasoning**:
- Serverless scaling matches usage patterns
- Better integration with AWS ecosystem
- No database maintenance overhead

**Trade-offs**: Less flexible querying but better performance and scalability.

### ADR-003: Vanilla JS vs React
**Decision**: Use vanilla JavaScript for frontend.

**Reasoning**:
- Simpler deployment (no build process)
- Faster loading (no framework overhead)
- Direct DOM manipulation for complex interactions

**Trade-offs**: More manual state management but better performance.

## 🚨 Common Pitfalls & Prevention

### Pitfall 1: Assuming Emulation Layer Reliability
**Prevention**: Always test critical operations against real services, not emulations.

### Pitfall 2: Ignoring Environment Configuration
**Prevention**: Implement config validation in deployment pipelines.

### Pitfall 3: Not Handling Resource Conflicts
**Prevention**: Build retry logic with exponential backoff for all resource creation.

### Pitfall 4: Modal-Heavy Workflows
**Prevention**: Design for one-click operations with smart defaults.

### Pitfall 5: Poor Error Visibility
**Prevention**: Implement comprehensive logging and user-friendly error messages.

## 📈 Performance Optimization Rules

### Rule 1: Minimize API Calls
```
Batch operations where possible. One API call is better than ten.
```

### Rule 2: Cache Frequently Accessed Data
```
Cache story data in frontend to reduce backend load and improve responsiveness.
```

### Rule 3: Use Appropriate Timeouts
```
Set realistic timeouts: 5s for simple operations, 30s for AI operations.
```

### Rule 4: Implement Progressive Enhancement
```
Core functionality should work without JavaScript. Enhance with JS features.
```

## 🔄 Continuous Improvement Process

### Weekly Reviews
- Review error logs and user feedback
- Identify recurring issues and patterns
- Update documentation and rules

### Monthly Architecture Reviews
- Assess system performance and scalability
- Review architecture decisions and trade-offs
- Plan improvements and optimizations

### Quarterly Lessons Learned Sessions
- Document major lessons and insights
- Update development guidelines
- Share knowledge across team

---

**Last Updated**: December 29, 2025  
**Version**: 4.0.6  
**Next Review**: January 5, 2026
