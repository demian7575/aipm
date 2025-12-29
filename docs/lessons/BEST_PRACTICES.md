# Best Practices & Development Rules

## 🎯 Core Development Principles

### 1. User Experience First
```
PRINCIPLE: Every feature must improve user workflow efficiency.
Measure success by reduced clicks and time-to-completion.
```

**Implementation Rules**:
- One-click operations for frequent tasks
- Smart defaults over configuration
- Progressive disclosure of complexity
- Immediate feedback for all actions

### 2. Fail Fast, Fail Clearly
```
PRINCIPLE: Failures should be detected early and communicated clearly.
Users should never wonder what went wrong or what to do next.
```

**Implementation Rules**:
- Validate inputs at the earliest possible point
- Provide specific error messages with suggested actions
- Implement circuit breakers for external service calls
- Log errors with sufficient context for debugging

### 3. Data Consistency Over Performance
```
PRINCIPLE: Consistent data is more valuable than fast inconsistent data.
Users trust systems that behave predictably.
```

**Implementation Rules**:
- Use transactions for multi-step operations
- Implement eventual consistency with clear user feedback
- Validate data integrity at service boundaries
- Prefer direct database operations over emulation layers

## 🏗️ Architecture Best Practices

### API Design Rules

#### RESTful Conventions
```javascript
// ✅ Good: Clear, predictable endpoints
GET    /api/stories           // List stories
POST   /api/stories           // Create story
GET    /api/stories/{id}      // Get specific story
PATCH  /api/stories/{id}      // Update story
DELETE /api/stories/{id}      // Delete story

// ❌ Avoid: Inconsistent or unclear endpoints
GET    /api/getStories
POST   /api/story/create
PUT    /api/updateStory/{id}
```

#### Error Response Format
```javascript
// ✅ Consistent error format
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND",
  "details": {
    "storyId": 123,
    "suggestion": "Check if the story ID is correct"
  }
}
```

#### Request Validation
```javascript
// ✅ Validate early and completely
function validateStoryRequest(payload) {
  const errors = [];
  
  if (!payload.title?.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  
  if (payload.storyPoint < 0) {
    errors.push({ field: 'storyPoint', message: 'Story points must be non-negative' });
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Invalid story data', errors);
  }
}
```

### Database Best Practices

#### DynamoDB Operations
```javascript
// ✅ Use native DynamoDB operations for critical updates
async function updateStoryStatus(storyId, status) {
  await dynamoClient.send(new UpdateItemCommand({
    TableName: process.env.STORIES_TABLE,
    Key: { id: { N: String(storyId) } },
    UpdateExpression: 'SET #status = :status, updated_at = :timestamp',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': { S: status },
      ':timestamp': { S: new Date().toISOString() }
    }
  }));
}

// ❌ Avoid: Relying on emulation layers for critical operations
const update = db.prepare('UPDATE user_stories SET status = ? WHERE id = ?');
update.run(status, storyId);
```

#### Data Consistency
```javascript
// ✅ Implement optimistic locking
async function updateStoryWithVersion(storyId, updates, expectedVersion) {
  try {
    await dynamoClient.send(new UpdateItemCommand({
      TableName: process.env.STORIES_TABLE,
      Key: { id: { N: String(storyId) } },
      UpdateExpression: 'SET #data = :data, version = version + :inc',
      ConditionExpression: 'version = :expectedVersion',
      ExpressionAttributeNames: { '#data': 'data' },
      ExpressionAttributeValues: {
        ':data': { S: JSON.stringify(updates) },
        ':expectedVersion': { N: String(expectedVersion) },
        ':inc': { N: '1' }
      }
    }));
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      throw new ConflictError('Story was modified by another user');
    }
    throw error;
  }
}
```

### Frontend Best Practices

#### State Management
```javascript
// ✅ Centralized state with clear update patterns
const state = {
  stories: new Map(),
  selectedStoryId: null,
  panelVisibility: { outline: true, mindmap: true, details: true }
};

function updateStory(storyId, updates) {
  const story = state.stories.get(storyId);
  if (story) {
    Object.assign(story, updates);
    renderAffectedComponents(storyId);
  }
}

// ❌ Avoid: Scattered state updates
document.getElementById('story-title').value = newTitle;
someGlobalVariable.currentStory.title = newTitle;
localStorage.setItem('story-' + id, JSON.stringify(story));
```

#### Error Handling
```javascript
// ✅ Consistent error handling with user feedback
async function createPR(storyId) {
  try {
    showLoadingState('Creating PR...');
    const result = await api.createPR(storyId);
    showSuccessToast('PR created successfully');
    updateUI(result);
  } catch (error) {
    console.error('PR creation failed:', error);
    showErrorToast(`Failed to create PR: ${error.message}`);
  } finally {
    hideLoadingState();
  }
}
```

#### DOM Manipulation
```javascript
// ✅ Efficient DOM updates
function updateStoryList(stories) {
  const container = document.getElementById('story-list');
  const fragment = document.createDocumentFragment();
  
  stories.forEach(story => {
    const element = createStoryElement(story);
    fragment.appendChild(element);
  });
  
  container.replaceChildren(fragment);
}

// ❌ Avoid: Inefficient DOM manipulation
stories.forEach(story => {
  document.getElementById('story-list').innerHTML += createStoryHTML(story);
});
```

## 🔧 Code Quality Rules

### Naming Conventions
```javascript
// ✅ Clear, descriptive names
async function createPullRequestForStory(storyId, branchName) { }
const isStoryReadyForDevelopment = story => story.status === 'Ready';
const GITHUB_API_TIMEOUT_MS = 30000;

// ❌ Avoid: Unclear or abbreviated names
async function createPR(id, bn) { }
const isReady = s => s.status === 'Ready';
const TIMEOUT = 30000;
```

### Function Design
```javascript
// ✅ Single responsibility, clear parameters
async function createGitHubBranch(repositoryInfo, branchName, baseSha) {
  validateRepositoryInfo(repositoryInfo);
  validateBranchName(branchName);
  validateSha(baseSha);
  
  return await githubApi.createBranch({
    owner: repositoryInfo.owner,
    repo: repositoryInfo.name,
    ref: `refs/heads/${branchName}`,
    sha: baseSha
  });
}

// ❌ Avoid: Multiple responsibilities, unclear parameters
async function createBranch(data) {
  // Validates, creates branch, handles errors, updates UI...
}
```

### Error Handling Patterns
```javascript
// ✅ Specific error types with context
class StoryNotFoundError extends Error {
  constructor(storyId) {
    super(`Story with ID ${storyId} not found`);
    this.name = 'StoryNotFoundError';
    this.storyId = storyId;
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message, validationErrors) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    this.statusCode = 400;
  }
}
```

## 🚀 Performance Optimization Rules

### Frontend Performance
```javascript
// ✅ Debounce expensive operations
const debouncedSearch = debounce(async (query) => {
  const results = await searchStories(query);
  updateSearchResults(results);
}, 300);

// ✅ Batch DOM updates
function updateMultipleStories(storyUpdates) {
  const fragment = document.createDocumentFragment();
  storyUpdates.forEach(update => {
    const element = updateStoryElement(update);
    fragment.appendChild(element);
  });
  document.getElementById('story-container').appendChild(fragment);
}
```

### Backend Performance
```javascript
// ✅ Batch database operations
async function updateMultipleStories(updates) {
  const batchRequests = updates.map(update => ({
    PutRequest: {
      Item: marshallStory(update)
    }
  }));
  
  await dynamoClient.send(new BatchWriteItemCommand({
    RequestItems: {
      [process.env.STORIES_TABLE]: batchRequests
    }
  }));
}

// ✅ Implement caching for frequently accessed data
const storyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getStory(storyId) {
  const cached = storyCache.get(storyId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  
  const story = await fetchStoryFromDatabase(storyId);
  storyCache.set(storyId, { data: story, timestamp: Date.now() });
  return story;
}
```

## 🔒 Security Best Practices

### Input Validation
```javascript
// ✅ Validate and sanitize all inputs
function sanitizeStoryTitle(title) {
  if (typeof title !== 'string') {
    throw new ValidationError('Title must be a string');
  }
  
  const sanitized = title.trim().substring(0, 200);
  if (!sanitized) {
    throw new ValidationError('Title cannot be empty');
  }
  
  return sanitized;
}
```

### Authentication & Authorization
```javascript
// ✅ Verify permissions for each operation
async function updateStory(storyId, updates, userToken) {
  const user = await validateToken(userToken);
  const story = await getStory(storyId);
  
  if (!canUserModifyStory(user, story)) {
    throw new ForbiddenError('User cannot modify this story');
  }
  
  return await performStoryUpdate(storyId, updates);
}
```

## 📝 Documentation Rules

### Code Documentation
```javascript
/**
 * Creates a fresh branch for code generation from the latest main branch
 * @param {string} originalBranch - The original PR branch name
 * @param {number} storyId - The story ID for naming
 * @param {string} timestamp - Timestamp for uniqueness
 * @returns {Promise<string>} The created generation branch name
 * @throws {BranchConflictError} When unable to create unique branch after retries
 */
async function createGenerationBranch(originalBranch, storyId, timestamp) {
  // Implementation...
}
```

### API Documentation
```javascript
/**
 * POST /api/generate-code-branch
 * 
 * Creates a fresh branch from main and generates code using AI
 * 
 * Request Body:
 * {
 *   "storyId": number,
 *   "prNumber": number,
 *   "prompt": string,
 *   "originalBranch": string
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "generationBranch": string,
 *   "commitSha": string,
 *   "prUrl": string
 * }
 */
```

---

**Last Updated**: December 29, 2025  
**Version**: 4.0.6  
**Next Review**: January 5, 2026
