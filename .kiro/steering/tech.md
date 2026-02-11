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
- **Never push directly to origin/main** → create PR for review, gating tests, and proper CI/CD flow

## Git Workflow

- **All changes via Pull Requests** → no direct pushes to main
- **PR triggers**: review, pre-gating tests, post-gating tests
- **Deploy after merge** → GitHub Actions handles deployment
- **Emergency fixes** → still require PR (can be fast-tracked)

## Git Workflow

- **All changes via Pull Requests** → no direct pushes to main
- **PR triggers**: review, pre-gating tests, post-gating tests
- **Deploy after merge** → GitHub Actions handles deployment
- **Emergency fixes** → still require PR (can be fast-tracked)

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
const apiUrl = "http://100.53.112.192:4000"; // no hardcoding
```

```javascript
// ✅ DO
const result = await fetchStories();
const apiUrl = config.api_url; // from environments.yaml

// ❌ DON'T
fetchStories().then(result => ...); // no callbacks
const apiUrl = "http://100.53.112.192:4000"; // no hardcoding
```
