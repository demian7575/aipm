---
inclusion: always
---

# Tech Stack

**Backend**: Node.js 18+ ES modules, Express 5, DynamoDB
**Frontend**: Vanilla JS (no framework), native fetch/SSE
**AI**: Kiro CLI via session pool (port 8082) + Semantic API (port 8083)
**Deploy**: AWS EC2 + S3 static hosting
**Region**: us-east-1

## Non-Negotiables

- **Never hardcode IPs/ports** → use `config/environments.yaml`
- **Always async/await** → no callbacks
- **Always use DynamoDB SDK v3** → `@aws-sdk/lib-dynamodb`
- **Config is single source of truth** → `config/environments.yaml`
- **ES modules only** → `import/export`, not `require()`
- **Get user approval before making code changes** → explain the change, wait for confirmation
- **Never make critical changes without user approval** → explain first, wait for agreement
- **Always fix root cause, not symptoms** → proper solutions over workarounds; long-term fixes over temporary patches

## Critical Changes Requiring Approval
- Any code modifications
- Workflow/CI/CD modifications
- Deployment process changes
- Data deletion operations
- Security-related changes
- Architecture modifications
- Configuration changes

## Code Style

```javascript
// ✅ DO
const result = await fetchStories();
const apiUrl = config.api_url; // from environments.yaml

// ❌ DON'T
fetchStories().then(result => ...); // no callbacks
const apiUrl = "http://100.53.112.192:4000"; // no hardcoding
```
