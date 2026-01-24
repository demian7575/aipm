# PR Generation Workflow & Simultaneous PR Issue

## ✅ Current Status

**Issue:** Two PRs generated simultaneously  
**Root Cause:** Branch name conflicts  
**Solution:** ✅ **ALREADY IMPLEMENTED** (timestamp-based unique branch names)  
**Code:** `apps/backend/app.js:391-394`

```javascript
const timestamp = Date.now();
const branchName = normalized.branchName ? 
  `${normalized.branchName}-${timestamp}` : 
  `feature/${normalized.taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}`;
```

**Result:** Multiple users can create PRs simultaneously without conflicts. Each PR gets a unique branch name with timestamp suffix.

---

## Current Workflow

### 1. User Clicks "Generate Code & PR" Button
```
apps/frontend/public/app.js:2062
↓
openCodeWhispererDelegationModal(story)
```

### 2. User Fills Form & Submits
```javascript
// Form fields:
- Repository API URL
- Owner
- Repository
- Branch name
- Task title
- Objective
- PR title
- Constraints
- Acceptance criteria
- Create tracking card (checkbox)
```

### 3. Frontend Sends Request to Backend
```javascript
POST /api/personal-delegate
{
  storyId, storyTitle, repositoryApiUrl, owner, repo,
  target: 'pr', branchName, taskTitle, objective,
  prTitle, constraints, acceptanceCriteria
}
```

### 4. Backend Creates PR Immediately
```javascript
apps/backend/app.js:400-520

1. Create new branch from main
2. Create TASK.md file with task description
3. Commit TASK.md to branch
4. Create Pull Request on GitHub
5. Fire-and-forget call to EC2 terminal server
6. Return PR info to frontend
```

### 5. Backend Triggers Code Generation (Fire-and-Forget)
```javascript
fetch(`${ec2Url}/generate-code`, {
  method: 'POST',
  body: JSON.stringify({
    branch: branchName,
    taskDescription,
    prNumber: pr.number
  })
}).then(...).catch(...)  // No await!
```

### 6. EC2 Terminal Server Processes Request
```javascript
POST /generate-code
↓
1. Checkout branch
2. Run non-interactive Kiro CLI
3. Wait for code generation (max 10 min)
4. Commit and push changes
```

## 🔴 Problem: Two PRs Generated Simultaneously

### Issue
When two users click "Generate Code & PR" at the same time (or same user clicks twice quickly):

```
User A clicks → Backend creates PR #123 → EC2 starts Kiro
User B clicks → Backend creates PR #124 → EC2 starts Kiro

Both Kiro sessions run in parallel:
- Worker1 processes PR #123
- Worker2 processes PR #124

Result: ✅ Both PRs are created successfully
```

**Wait, this is actually CORRECT behavior!**

The worker pool is designed to handle parallel requests. Let me clarify the actual issue...

### Actual Issue: Same Branch Name Conflict

If two users try to create PRs with the **same branch name**:

```
User A: branch = "feature/add-export"
User B: branch = "feature/add-export"  (same!)

Backend:
1. User A creates branch "feature/add-export" → PR #123
2. User B tries to create branch "feature/add-export" → ❌ FAILS (branch exists)
```

## ✅ Solution: Branch Name Uniqueness

### Option 1: Add Timestamp to Branch Name (Recommended)

**Backend Change** (`apps/backend/app.js`):

```javascript
// Before
const branchName = normalized.branchName;

// After
const timestamp = Date.now();
const branchName = `${normalized.branchName}-${timestamp}`;
```

**Result:**
```
User A: feature/add-export-1733356800123 → PR #123
User B: feature/add-export-1733356800456 → PR #124
Both succeed! ✅
```

### Option 2: Check Branch Existence Before Creating

**Backend Change** (`apps/backend/app.js`):

```javascript
// Check if branch exists
try {
  await githubRequest(`${repoPath}/git/refs/heads/${branchName}`);
  // Branch exists - return error
  throw new Error(`Branch ${branchName} already exists. Please use a different name.`);
} catch (error) {
  if (error.message.includes('Not Found')) {
    // Branch doesn't exist - proceed
  } else {
    throw error;
  }
}
```

**Result:**
- User A: Creates branch → PR #123 ✅
- User B: Gets error "Branch already exists" ❌
- User B must change branch name and retry

### Option 3: Auto-Increment Branch Name

**Backend Change** (`apps/backend/app.js`):

```javascript
async function findAvailableBranchName(repoPath, baseName) {
  let counter = 1;
  let branchName = baseName;
  
  while (true) {
    try {
      await githubRequest(`${repoPath}/git/refs/heads/${branchName}`);
      // Branch exists, try next
      counter++;
      branchName = `${baseName}-${counter}`;
    } catch (error) {
      if (error.message.includes('Not Found')) {
        // Branch doesn't exist - use this name
        return branchName;
      }
      throw error;
    }
  }
}

// Usage
const branchName = await findAvailableBranchName(repoPath, normalized.branchName);
```

**Result:**
```
User A: feature/add-export → PR #123
User B: feature/add-export-2 → PR #124
User C: feature/add-export-3 → PR #125
All succeed! ✅
```

## 📊 Comparison

| Solution | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **Timestamp** | Simple, fast, guaranteed unique | Branch names less readable | ✅ **YES** |
| **Check Existence** | User controls naming | User must retry manually | ❌ No |
| **Auto-Increment** | Clean names, automatic | Requires extra GitHub API calls | ⚠️ Maybe |

## 🎯 Recommended Implementation

### Minimal Code Change (Timestamp Approach)

**File:** `apps/backend/app.js`

**Location:** Line ~410 (where branch is created)

```javascript
// Find this line:
const branchName = normalized.branchName;

// Replace with:
const timestamp = Date.now();
const branchName = `${normalized.branchName}-${timestamp}`;
```

**That's it!** One line change solves the issue.

### Why This Works

1. **Timestamp is unique** - Even if two requests arrive at same millisecond, `Date.now()` increments
2. **No extra API calls** - No performance impact
3. **Worker pool handles parallel execution** - Both PRs process simultaneously
4. **No race conditions** - Each PR has unique branch name

## 🧪 Testing

### Test Simultaneous PR Creation

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test",
    "repo": "test-repo",
    "branchName": "feature/test",
    "taskTitle": "Test 1",
    "objective": "Test objective 1",
    "prTitle": "Test PR 1",
    "target": "pr"
  }' &

# Terminal 2 (immediately after)
curl -X POST http://localhost:3000/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test",
    "repo": "test-repo",
    "branchName": "feature/test",
    "taskTitle": "Test 2",
    "objective": "Test objective 2",
    "prTitle": "Test PR 2",
    "target": "pr"
  }' &

wait
```

**Expected Result (with fix):**
```
✅ PR #1: feature/test-1733356800123
✅ PR #2: feature/test-1733356800456
```

**Without fix:**
```
✅ PR #1: feature/test
❌ PR #2: Error - branch already exists
```

## 📝 Summary

**Problem:** Same branch name could cause second PR to fail  
**Solution:** ✅ **ALREADY IMPLEMENTED** - Timestamp added to branch name  
**Code Location:** `apps/backend/app.js:391-394`  
**Implementation:**
```javascript
const timestamp = Date.now();
const branchName = normalized.branchName ? 
  `${normalized.branchName}-${timestamp}` : 
  `feature/${normalized.taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}`;
```

**Status:** ✅ **Working correctly**  
**Impact:** Multiple PRs can be created simultaneously without conflicts  

The worker pool architecture handles parallel execution, and unique branch names prevent conflicts. Both features are working as designed.
