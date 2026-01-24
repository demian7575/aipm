# PR Architecture Migration Plan

## Problem
- PRs embedded in story records (data duplication)
- Separate `aipm-backend-{env}-prs` DynamoDB tables (redundant storage)
- Manual sync required between environments
- Data inconsistency between prod and dev

## Solution: GitHub as Single Source of Truth

### Architecture

```
┌─────────────┐
│   GitHub    │ ◄─── Single Source of Truth
│  (PR Data)  │
└──────┬──────┘
       │
       │ API Calls (on-demand)
       │
       ├──────────────┬──────────────┐
       │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│  Prod API   │ │ Dev API  │ │  Local Dev │
└─────────────┘ └──────────┘ └────────────┘
```

### Benefits

✅ **No data duplication** - PRs only in GitHub
✅ **No sync needed** - All environments read from same source
✅ **Always up-to-date** - Real-time data from GitHub
✅ **Simpler architecture** - Remove DynamoDB PR tables
✅ **Single source of truth** - GitHub is authoritative

## Implementation Steps

### Phase 1: Create GitHub PR Service (DONE)
- [x] Create `apps/backend/github-pr-service.js`
- [x] Implement GitHub API integration using Octokit

### Phase 2: Add API Endpoints
- [ ] Add `GET /api/prs` - List all PRs
- [ ] Add `GET /api/prs/:number` - Get specific PR
- [ ] Add `GET /api/stories/:id/prs` - Get PRs for story
- [ ] Add caching layer (optional, for performance)

### Phase 3: Update Frontend
- [ ] Update frontend to use new PR endpoints
- [ ] Remove references to embedded `prs` field in stories
- [ ] Test PR display in UI

### Phase 4: Database Cleanup
- [ ] Remove `prs` field from story schema
- [ ] Drop `aipm-backend-prod-prs` table
- [ ] Drop `aipm-backend-dev-prs` table
- [ ] Remove sync script for PRs

### Phase 5: Configuration
- [ ] Add `GITHUB_TOKEN` to environment configs
- [ ] Add `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`
- [ ] Update deployment scripts

## Environment Variables

Add to `config/prod.env` and `config/dev.env`:

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_REPO_OWNER=demian7575
GITHUB_REPO_NAME=aipm
```

## API Examples

### Get all PRs
```bash
GET /api/prs
GET /api/prs?state=open
GET /api/prs?state=closed
```

### Get specific PR
```bash
GET /api/prs/123
```

### Get PRs for a story
```bash
GET /api/stories/456/prs
```

## Caching Strategy (Optional)

To reduce GitHub API calls:

```javascript
// Simple in-memory cache with TTL
const prCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedPRs() {
  const cached = prCache.get('all_prs');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const prs = await githubPRService.getAllPRs();
  prCache.set('all_prs', { data: prs, timestamp: Date.now() });
  return prs;
}
```

## Migration Timeline

- **Week 1**: Implement GitHub PR service and API endpoints
- **Week 2**: Update frontend to use new endpoints
- **Week 3**: Test in dev environment
- **Week 4**: Deploy to prod and cleanup old tables

## Rollback Plan

If issues occur:
1. Keep old DynamoDB tables temporarily
2. Add feature flag to switch between GitHub and DynamoDB
3. Revert to old system if needed

## Dependencies

```bash
npm install @octokit/rest
```

## Testing

```bash
# Test GitHub PR service
node -e "import('./apps/backend/github-pr-service.js').then(s => s.default.getAllPRs().then(console.log))"

# Test API endpoints
curl http://localhost:4000/api/prs
curl http://localhost:4000/api/prs/123
curl http://localhost:4000/api/stories/456/prs
```

## Success Criteria

✅ All PRs fetched from GitHub in real-time
✅ No manual sync required
✅ Both prod and dev show same PR data
✅ DynamoDB PR tables removed
✅ Frontend displays PRs correctly
