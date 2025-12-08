# Show Version of AIPM to know which version of AIPM is working

As a User, I want to show version of aipm to know which version of aipm is working. In development environment, the version should show the pr number also. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Show Version of AIPM to know which version of AIPM is working. In Development environment, The version should show the PR number also
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made

### 1. Frontend (`apps/frontend/public/index.html`)
- Added version badge span to header title

### 2. Frontend CSS (`apps/frontend/public/styles.css`)
- Added `.version-badge` styling with grey background and rounded corners

### 3. Frontend JS (`apps/frontend/public/app.js`)
- Added version display initialization
- Detects development environment (localhost or EC2)
- Fetches PR number from backend API in dev mode
- Displays "v0.1.0 (PR #XXX)" in development, "v0.1.0" in production

### 4. Backend API (`apps/backend/app.js`)
- Added `/api/version` GET endpoint
- Extracts PR number from git branch name
- Returns version object with optional prNumber field

## Implementation Details

The version badge appears in the header next to the title. In development environments, it automatically fetches and displays the PR number from the current git branch, making it easy to identify which version is running during testing and development.
