# Migration: snake_case → camelCase

## Overview

Remove snake_case (`story_id`) field and GSI, keep only camelCase (`storyId`).

## Current State

**Acceptance Tests Table:**
- Has both `storyId` (camelCase) and `story_id` (snake_case) fields
- Has two GSIs:
  - `storyId-index` - **ACTIVE**, 3 items (used)
  - `story_id-index` - **ACTIVE**, 0 items (unused)

**Backend Code:**
- `dynamodb.js` uses `story_id-index` GSI
- Converts `storyId` → `story_id` on write
- Accepts both fields for compatibility

## Migration Plan

### Phase 1: Backup (Automatic)
- Exports all acceptance tests to `/tmp/acceptance-tests-backup-{timestamp}.json`
- Backs up `dynamodb.js` to `dynamodb.js.bak`

### Phase 2: Data Migration (If Needed)
- Checks if data uses `story_id` instead of `storyId`
- If yes, copies `story_id` → `storyId` for all items
- Prompts for confirmation before migrating

### Phase 3: Code Update (Automatic)
- Changes `story_id-index` → `storyId-index` in queries
- Changes `story_id` → `storyId` in field names
- Removes snake_case conversion logic
- Validates syntax before proceeding

### Phase 4: GSI Deletion (Manual Confirmation)
- Deletes unused `story_id-index` GSI
- Takes ~5-10 minutes
- Prompts for confirmation

### Phase 5: Verification
- Deploy updated backend
- Test acceptance test queries
- Verify everything works

## Running the Migration

```bash
cd /repo/ebaejun/tools/aws/aipm
./scripts/utilities/migrate-to-camelcase.sh
```

**Interactive prompts:**
1. Press ENTER to start
2. Confirm data migration (if needed)
3. Confirm GSI deletion

**Duration:** ~10-15 minutes (mostly GSI deletion)

## Rollback

If something goes wrong:

```bash
./scripts/utilities/rollback-camelcase-migration.sh
```

**Rollback options:**
1. Restore code from `.bak` file
2. Restore data from backup (optional)
3. Recreate `story_id-index` GSI (optional)

## Safety Features

✅ **Automatic backups** before any changes
✅ **Syntax validation** before deploying code
✅ **Manual confirmations** for destructive operations
✅ **Rollback script** to undo changes
✅ **No data loss** - all data preserved

## What Changes

### Before Migration:
```javascript
// dynamodb.js
IndexName: 'story_id-index',
KeyConditionExpression: 'story_id = :story_id',
ExpressionAttributeValues: { ':story_id': parseInt(storyId) }

// Data
{ id: 123, storyId: 456, story_id: null }
```

### After Migration:
```javascript
// dynamodb.js
IndexName: 'storyId-index',
KeyConditionExpression: 'storyId = :storyId',
ExpressionAttributeValues: { ':storyId': parseInt(storyId) }

// Data
{ id: 123, storyId: 456 }  // story_id field removed
```

## Testing After Migration

```bash
# Test acceptance test queries
curl http://44.197.204.18:4000/api/stories/1234/acceptance-tests

# Should return tests for story 1234
```

## Troubleshooting

### "No items returned after migration"
- Check if storyId field is populated
- Run rollback script
- Verify data migration step completed

### "GSI deletion failed"
- GSI might be in use
- Wait a few minutes and retry
- Can be deleted manually via AWS Console

### "Backend errors after deployment"
- Check logs: `ssh ec2-user@44.197.204.18 'sudo journalctl -u aipm-backend -n 50'`
- Run rollback script
- Restore from backup

## Files Modified

- `apps/backend/dynamodb.js` - Query and field name changes
- `scripts/utilities/story-qa-automation.sh` - Already uses `storyId`

## Files NOT Modified

- `apps/backend/app.js` - SQLite compatibility layer (not affected)
- Frontend code - Uses API, not direct DB access

## Post-Migration Cleanup

After verifying everything works:

```bash
# Remove backup files
rm /tmp/acceptance-tests-backup-*.json
rm apps/backend/dynamodb.js.bak
```

## Estimated Impact

- **Downtime:** None (code changes only)
- **Data loss risk:** Very low (backups + rollback)
- **Breaking changes:** None (API unchanged)
- **Performance:** Slightly better (one less GSI)
