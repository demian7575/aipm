# User Story: Implement Cascade Delete for User Stories

## Story Information
**Title**: Implement cascade delete for user stories to automatically remove all associated data

**As a**: System Administrator
**I want**: User story deletion to automatically cascade to all related entities (acceptance tests, PRs, and future gating tests)
**So that**: The system maintains data integrity and prevents orphaned records when stories are deleted

## Description
Currently, when a user story is deleted, associated acceptance tests remain in the database as orphaned records. This creates data inconsistency and potential issues with data integrity. The system should implement cascade delete behavior to automatically remove all related entities when a story is deleted.

## Acceptance Criteria

### Given-When-Then Scenarios

**Scenario 1: Delete story with acceptance tests**
- **Given**: A user story exists with 3 acceptance tests
- **When**: The story is deleted via DELETE /api/stories/{id}
- **Then**: 
  - The story is removed from the database
  - All 3 acceptance tests are automatically deleted
  - A 204 No Content response is returned
  - Deletion is logged with count of deleted items

**Scenario 2: Delete story with PRs**
- **Given**: A user story exists with 2 associated PRs
- **When**: The story is deleted
- **Then**:
  - The story is removed
  - All 2 PRs are automatically deleted
  - PR deletion is logged

**Scenario 3: Delete story with multiple related entities**
- **Given**: A user story exists with:
  - 2 acceptance tests
  - 1 PR
  - (Future: gating tests linked to acceptance tests)
- **When**: The story is deleted
- **Then**:
  - All acceptance tests are deleted first
  - All PRs are deleted
  - The story is deleted last
  - Total deletion count is logged

**Scenario 4: Verify cascade delete in DynamoDB**
- **Given**: A story exists in DynamoDB with acceptance tests
- **When**: The story is deleted
- **Then**:
  - Query acceptance tests by storyId-index
  - Delete each acceptance test individually
  - Delete the story
  - All operations succeed

**Scenario 5: Verify cascade delete in SQLite**
- **Given**: A story exists in SQLite with acceptance tests
- **When**: The story is deleted
- **Then**:
  - DELETE FROM acceptance_tests WHERE story_id = ? executes
  - DELETE FROM user_stories WHERE id = ? executes
  - Both operations succeed

## Technical Implementation

### Database Changes
**SQLite**:
```sql
-- Delete acceptance tests first (foreign key constraint)
DELETE FROM acceptance_tests WHERE story_id = ?;

-- Delete PRs
DELETE FROM story_prs WHERE storyId = ?;

-- Delete story
DELETE FROM user_stories WHERE id = ?;
```

**DynamoDB**:
```javascript
// 1. Query acceptance tests
QueryCommand({
  TableName: 'aipm-backend-prod-acceptance-tests',
  IndexName: 'storyId-index',
  KeyConditionExpression: 'storyId = :storyId'
})

// 2. Delete each test
for (const test of tests) {
  DeleteCommand({ TableName: testsTable, Key: { id: test.id } })
}

// 3. Delete story
DeleteCommand({ TableName: storiesTable, Key: { id: storyId } })
```

### API Endpoint
- **Endpoint**: `DELETE /api/stories/{id}`
- **Response**: 204 No Content (success) or 404 Not Found
- **Logging**: Console log with deletion counts

### Deletion Order
1. **Acceptance Tests** (must be deleted first due to foreign key)
2. **PRs** (can be deleted in any order)
3. **Story** (deleted last)

## Components
- Backend API
- Database Layer (SQLite + DynamoDB)

## Story Points
5

## Status
Ready

## Dependencies
- None (this is a system behavior improvement)

## Future Considerations
- **Gating Tests**: When gating tests are added and linked to acceptance tests, they should also be cascade deleted
- **Soft Delete**: Consider implementing soft delete (marking as deleted) instead of hard delete for audit trail
- **Bulk Delete**: Optimize for deleting multiple stories at once
- **Transaction Support**: Ensure all deletes succeed or roll back (especially important for SQLite)

## Testing Strategy
1. Unit tests for cascade delete logic
2. Integration tests for both SQLite and DynamoDB
3. E2E tests in Phase 2 gating tests (Step 7)
4. Verify no orphaned records remain after deletion

## INVEST Analysis
- ✅ **Independent**: Can be implemented without dependencies
- ✅ **Negotiable**: Implementation details can be adjusted
- ✅ **Valuable**: Prevents data inconsistency and orphaned records
- ✅ **Estimable**: Clear scope and implementation path
- ✅ **Small**: Focused on single behavior (cascade delete)
- ✅ **Testable**: Clear acceptance criteria with verifiable outcomes
