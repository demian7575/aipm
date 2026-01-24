# Data Sync Between Environments

## Current Solution (Temporary)

PRs, stories, and acceptance tests are synced manually from production to development using a sync script.

## How to Sync

**Run the sync script:**
```bash
./scripts/utilities/sync-data.sh
```

Or directly:
```bash
node scripts/utilities/sync-prod-to-dev.cjs
```

## What Gets Synced

- **Stories**: `aipm-backend-prod-stories` → `aipm-backend-dev-stories`
- **Acceptance Tests**: `aipm-backend-prod-acceptance-tests` → `aipm-backend-dev-acceptance-tests`
- **PRs**: `aipm-backend-prod-prs` → `aipm-backend-dev-prs`

## When to Sync

Run the sync when:
- New PRs created in production
- Stories updated in production
- Testing new features in dev that require prod data
- After major changes to production data

## Verification

After syncing, verify in dev:
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: `curl http://44.222.168.46:4000/api/stories`

## Future Solution

See `docs/PR_MIGRATION_PLAN.md` for the long-term solution using GitHub as single source of truth.

**Benefits of future solution:**
- No manual sync needed
- Real-time data from GitHub
- No data duplication
- Single source of truth

## Current Status

✅ Sync script working  
✅ PRs synced (51 PRs in both environments)  
✅ Stories synced (89 stories)  
✅ Tests synced (366 tests)  

**Last sync:** 2026-01-20
