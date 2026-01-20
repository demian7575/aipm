# PR Persistence Fix - Summary

**Date**: December 2, 2025  
**Issue**: Development Tasks (PRs) disappear after browser refresh  
**Status**: ✅ **FIXED**

## Problem

When users created a PR via "Generate Code & PR", the PR appeared in the Development Tasks section. However, after refreshing the browser, the PR disappeared.

## Root Cause

The PR data was being stored in DynamoDB correctly, but the backend wasn't loading it when fetching stories. Three issues were identified:

1. **Wrong table name in SQLite queries**: `story-prs.js` was querying `stories` table instead of `user_stories`
2. **Wrong DynamoDB detection**: Checking `db.type === 'dynamodb'` instead of `db.constructor.name === 'DynamoDBDataLayer'`
3. **Missing prs column**: SQLite database didn't have a `prs` column in the `user_stories` table

## Solution

### 1. Fixed Table Names (story-prs.js)
Changed all SQLite queries from `stories` to `user_stories`:
```javascript
// Before
const story = db.prepare('SELECT prs FROM stories WHERE id = ?').get(storyId);

// After
const story = db.prepare('SELECT prs FROM user_stories WHERE id = ?').get(storyId);
```

### 2. Fixed DynamoDB Detection (story-prs.js)
Changed detection method to match the actual implementation:
```javascript
// Before
if (db.type === 'dynamodb') {

// After
if (db.constructor.name === 'DynamoDBDataLayer') {
```

### 3. Added DynamoDB Client Initialization (story-prs.js)
Since `DynamoDBDataLayer` doesn't expose `docClient`, we create it directly:
```javascript
const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
```

### 4. Added prs Column to SQLite (app.js)
Added migration to ensure the column exists:
```javascript
ensureColumn(db, 'user_stories', 'prs', "prs TEXT DEFAULT '[]'");
```

## Files Modified

1. **apps/backend/story-prs.js** - Fixed table names and DynamoDB detection
2. **apps/backend/app.js** - Added `prs` column migration

## Testing

### Test Script
Created `test-pr-persistence.sh` to verify the fix:
```bash
./test-pr-persistence.sh
```

### Test Results
```
✅ PR persisted successfully!
🎉 Fix verified: PRs now persist after page refresh
```

### Manual Testing
1. Open AIPM: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
2. Select a story
3. Click "Generate Code & PR"
4. Fill form and submit
5. PR appears in Development Tasks
6. **Refresh browser** (Ctrl+R or F5)
7. ✅ PR still visible in Development Tasks

## Deployment

```bash
# Deploy backend
cd /repo/ebaejun/tools/aws/aipm
npx serverless deploy --stage prod
```

**Deployed**: December 2, 2025 08:46 UTC

## Verification

### Before Fix
- PR created: ✅
- PR visible immediately: ✅
- PR visible after refresh: ❌

### After Fix
- PR created: ✅
- PR visible immediately: ✅
- PR visible after refresh: ✅

## Technical Details

### Data Flow

```
User creates PR
    ↓
Frontend calls POST /api/stories/:id/prs
    ↓
Backend calls addStoryPR(db, storyId, prData)
    ↓
DynamoDB UpdateCommand sets prs attribute
    ↓
User refreshes browser
    ↓
Frontend calls GET /api/stories
    ↓
Backend calls loadStories(db)
    ↓
For each story: getStoryPRs(db, story.id)
    ↓
DynamoDB GetCommand retrieves prs attribute
    ↓
PRs included in story object
    ↓
Frontend displays PRs in Development Tasks
```

### DynamoDB Storage

PRs are stored as an array attribute on the story item:
```json
{
  "id": 1,
  "title": "Story Title",
  "prs": [
    {
      "localId": "pr-123",
      "number": 456,
      "prUrl": "https://github.com/owner/repo/pull/456",
      "taskTitle": "Task Title",
      "branchName": "feature/branch",
      "repo": "owner/repo",
      "createdAt": "2025-12-02T08:46:48.998Z"
    }
  ]
}
```

### SQLite Storage

PRs are stored as JSON text in the `prs` column:
```sql
CREATE TABLE user_stories (
  id INTEGER PRIMARY KEY,
  title TEXT,
  prs TEXT DEFAULT '[]',
  ...
);
```

## Related Issues

- Initial implementation: PR storage via API endpoints
- Context summary: Mentioned PR-story associations migrated to DynamoDB
- Previous fix: Frontend PR functions updated to use API

## Future Improvements

1. **Add PR status tracking**: Track code generation progress
2. **Add PR metadata**: Store commit count, review status, etc.
3. **Add PR filtering**: Filter by status, branch, assignee
4. **Add PR sorting**: Sort by date, status, priority

## Support

If PRs still disappear after refresh:

1. **Check backend logs**:
   ```bash
   npx serverless logs -f api --stage prod --tail
   ```

2. **Verify DynamoDB**:
   ```bash
   aws dynamodb get-item \
     --table-name aipm-backend-prod-stories \
     --key '{"id":{"N":"1"}}' \
     --region us-east-1
   ```

3. **Test API directly**:
   ```bash
   curl https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories/1/prs
   ```

4. **Clear browser cache**:
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E

## Conclusion

✅ **The issue is resolved. PRs now persist correctly after browser refresh.**

Users can now:
- Create PRs via "Generate Code & PR"
- See PRs in Development Tasks immediately
- Refresh the browser without losing PR data
- Close and reopen the browser without losing PR data

---

**Fixed by**: Kiro CLI  
**Verified**: December 2, 2025  
**Status**: Production Ready
