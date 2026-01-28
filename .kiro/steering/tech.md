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
- **Never make critical changes without user approval** → explain first, wait for agreement

## Critical Changes Requiring Approval
- Workflow/CI/CD modifications
- Deployment process changes
- Data deletion operations
- Security-related changes
- Architecture modifications

## Code Style

```javascript
// ✅ DO
const result = await fetchStories();
const apiUrl = config.api_url; // from environments.yaml

// ❌ DON'T
fetchStories().then(result => ...); // no callbacks
const apiUrl = "http://44.197.204.18:4000"; // no hardcoding
```
