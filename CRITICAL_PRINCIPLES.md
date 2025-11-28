# CRITICAL DEVELOPMENT PRINCIPLES - AIPM

**MANDATORY READING BEFORE ANY CODE CHANGES**

## 🚨 STOP AND READ FIRST

Before making ANY changes to AIPM code:

### 1. DO NOT USE "SIMPLE LOGIC" WITHOUT FULL UNDERSTANDING

❌ **NEVER:**
- Replace existing code with "simpler" versions without understanding why the original was complex
- Assume existing code is "too complicated" - it may handle edge cases you don't see
- Remove functionality that seems unused - it may be critical for specific scenarios

✅ **ALWAYS:**
- Read and understand the ENTIRE existing implementation before modifying
- Ask "Why was this done this way?" before simplifying
- Keep existing logic unless you can prove it's wrong or unnecessary
- If existing code works, DO NOT TOUCH IT

**Example of What Went Wrong:**
- Original backend had complex `loadStories()` with hierarchy building
- We replaced it with "simple" DynamoDB scan
- Result: Broke parent-child relationships, lost data structure

### 2. COMPREHENSIVE GATING TESTS - NOT JUST HTTP 200

❌ **INSUFFICIENT:**
```javascript
// BAD - Only checks status
const response = await fetch('/api/stories');
assert(response.status === 200);
```

✅ **REQUIRED:**
```javascript
// GOOD - Validates functionality
const response = await fetch('/api/stories');
assert(response.status === 200);

const stories = await response.json();
assert(Array.isArray(stories), 'Stories must be array');
assert(stories.length > 0, 'Should have stories');

// Validate structure
const rootStories = stories.filter(s => !s.parentId);
const childStories = stories.filter(s => s.parentId);
assert(rootStories.length > 0, 'Should have root stories');

// Validate parent-child relationships
rootStories.forEach(root => {
  if (root.children) {
    assert(Array.isArray(root.children), 'Children must be array');
    root.children.forEach(child => {
      assert(child.parentId === root.id, 'Child must reference parent');
    });
  }
});
```

### 3. MANDATORY INVESTIGATION CHECKLIST

Before modifying ANY file, complete this checklist:

- [ ] Read the ENTIRE file you're about to modify
- [ ] Understand what each function does
- [ ] Identify all callers of functions you'll change
- [ ] Check if there are tests for this functionality
- [ ] Search for similar patterns in the codebase
- [ ] Understand the data flow (input → processing → output)
- [ ] Check if there are comments explaining why code exists
- [ ] Look for related configuration or environment variables
- [ ] Verify dependencies and imports
- [ ] Check git history to see why code was added

### 4. REQUIRED GATING TESTS FOR ALL CRITICAL FUNCTIONALITY

#### User Story Relationships
```javascript
✅ Parent-child hierarchy exists
✅ Children array populated correctly
✅ ParentId references valid parent
✅ No circular references
✅ Orphaned children handled
```

#### API Endpoints
```javascript
✅ Returns correct HTTP status
✅ Returns correct data structure
✅ Handles missing data gracefully
✅ Validates required fields
✅ Returns proper error messages
```

#### Data Persistence
```javascript
✅ Data survives page refresh
✅ Data persists in DynamoDB
✅ Updates reflect immediately
✅ Deletes cascade properly
✅ No data loss on errors
```

#### UI Functionality
```javascript
✅ Mindmap renders correctly
✅ Parent-child links visible
✅ Click interactions work
✅ Modals open/close properly
✅ Forms validate input
✅ Error messages display
```

#### Integration Points
```javascript
✅ Frontend ↔ API communication
✅ API ↔ DynamoDB queries
✅ Config loaded before app
✅ CORS headers present
✅ Authentication works (if applicable)
```

## 📋 MANDATORY WORKFLOW

### Before ANY Code Change:

1. **Understand Current State**
   ```bash
   # Read the file
   cat <file-to-modify>
   
   # Check git history
   git log -p <file-to-modify>
   
   # Search for usage
   grep -r "functionName" .
   ```

2. **Document Current Behavior**
   - What does it do now?
   - What data structures does it use?
   - What are the inputs and outputs?
   - What edge cases does it handle?

3. **Plan the Change**
   - What EXACTLY needs to change?
   - Why is the current code insufficient?
   - What could break?
   - How will you test it?

4. **Implement Minimally**
   - Change ONLY what's necessary
   - Keep existing patterns
   - Preserve edge case handling
   - Add comments explaining changes

5. **Test Comprehensively**
   - Run ALL gating tests
   - Test in browser manually
   - Verify data structure
   - Check parent-child relationships
   - Test error cases

6. **Verify No Regressions**
   - All previous functionality still works
   - No new console errors
   - Data loads correctly
   - UI renders properly

## 🎯 SPECIFIC AIPM RULES

### Story Management
- **NEVER** return flat story lists - always build hierarchy
- **ALWAYS** include `children` array in parent stories
- **ALWAYS** validate `parentId` references exist
- **NEVER** break parent-child relationships

### API Responses
- **ALWAYS** return hierarchical story structure
- **NEVER** return raw DynamoDB format
- **ALWAYS** transform data to app format
- **ALWAYS** filter out non-story items

### Configuration
- **ALWAYS** load config.js before app.js
- **NEVER** assume config is available immediately
- **ALWAYS** check `window.CONFIG` exists before using
- **ALWAYS** include both `API_BASE_URL` and `apiEndpoint`

### Deployment
- **ALWAYS** test in development first
- **NEVER** deploy to production without verification
- **ALWAYS** run gating tests before deployment
- **ALWAYS** verify in browser after deployment

## 🔍 INVESTIGATION TEMPLATE

When investigating an issue, document:

```markdown
## Issue
[What's broken]

## Current Behavior
[What happens now]

## Expected Behavior
[What should happen]

## Root Cause Analysis
1. What code is responsible?
2. Why was it written this way?
3. What changed to break it?
4. What assumptions were wrong?

## Solution
[Minimal change needed]

## Testing Plan
1. Unit test: [specific test]
2. Integration test: [specific test]
3. Manual test: [specific steps]
4. Regression test: [what to verify still works]
```

## 📝 LESSONS LEARNED

### What Went Wrong (Nov 28, 2024)

1. **Replaced working backend with "simple" handler**
   - Lost hierarchy building logic
   - Broke parent-child relationships
   - Caused data structure issues

2. **Gating tests only checked HTTP 200**
   - Didn't validate data structure
   - Didn't check parent-child links
   - Didn't verify functionality

3. **Made changes without understanding**
   - Didn't read original backend code
   - Didn't understand why it was complex
   - Assumed simpler was better

4. **Multiple iterations to fix**
   - 8 iterations to get it right
   - Each iteration broke something else
   - Could have been avoided with proper investigation

### What We Should Have Done

1. **Read `apps/backend/app.js` completely**
2. **Understood `loadStories()` function**
3. **Kept the hierarchy building logic**
4. **Added comprehensive gating tests first**
5. **Tested data structure, not just HTTP status**

## ✅ CHECKLIST FOR EVERY CHANGE

- [ ] Read all related code
- [ ] Understand why it exists
- [ ] Document current behavior
- [ ] Plan minimal change
- [ ] Keep existing patterns
- [ ] Add comprehensive tests
- [ ] Test in browser
- [ ] Verify no regressions
- [ ] Update documentation

## 🚫 ANTI-PATTERNS TO AVOID

1. "This code is too complex, let me simplify it"
2. "I'll just return the data as-is from the database"
3. "HTTP 200 means it works"
4. "I don't need to test parent-child relationships"
5. "The old code was wrong, my way is better"
6. "I'll fix it quickly without understanding it"
7. "Tests are passing, ship it"

## 📚 REQUIRED READING BEFORE CHANGES

1. This file (CRITICAL_PRINCIPLES.md)
2. START_HERE.md
3. DEVELOPMENT_PRINCIPLES.md
4. LESSONS_LEARNED.md
5. The actual code you're about to modify
6. Git history of that code
7. Related test files

---

**REMEMBER: If you don't understand it, DON'T CHANGE IT.**

**REMEMBER: Working code is better than "simple" broken code.**

**REMEMBER: Comprehensive tests prevent regressions.**

---

Last Updated: 2025-11-28 12:40 JST
