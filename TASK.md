# Show Version of AIPM to know which version of AIPM is working

As a User, I want to show version of aipm to know which version of aipm is working.  in development environment, the version should show the pr number also. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Show Version of AIPM to know which version of AIPM is working.  In Development environment, The version should show the PR number also
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made

### 1. Frontend HTML (`apps/frontend/public/index.html`)
- Added `<span id="version-display" class="version-badge"></span>` to header

### 2. Frontend CSS (`apps/frontend/public/styles.css`)
- Added `.version-badge` styling with grey background and rounded corners

### 3. Frontend JS (`apps/frontend/public/app.js`)
- Added version display initialization
- Detects development environment (localhost or EC2)
- Fetches PR number from `/api/version` endpoint in dev mode
- Displays "v0.1.0 (PR #XXX)" in development, "v0.1.0" in production

### 4. Backend API (`apps/backend/app.js`)
- Added `/api/version` GET endpoint
- Extracts PR number from git branch name using regex
- Returns JSON with version and optional prNumber

## Implementation Details

The version badge appears in the header. In development, it automatically displays the PR number extracted from the git branch name, making it easy to identify which version is running.