# Run in Staging Feature Implementation

## Overview

The "Run in Staging" button is now fully implemented on each PR card in the Development Tasks board. This feature enables deploying PRs to the development environment for testing before merging to production.

## Feature Location

- **UI Location**: Development Tasks section in the Details panel
- **Button**: "Run in Staging" button appears on each PR card
- **Access**: Available for all tracked PR cards

## Implementation Details

### Frontend Components

**File**: `apps/frontend/public/app.js`

1. **PR Card Rendering** (Line ~1920):
   - "Run in Staging" button added to each PR card
   - Button opens a modal for collecting task details

2. **Modal Content** (Line ~3223):
   - `buildRunInStagingModalContent()` function creates the modal UI
   - Displays PR information
   - Shows workflow steps
   - Provides "Run in Staging" and "Check Status" buttons

3. **Workflow Execution** (Line ~3363):
   - `bedrockImplementation()` function triggers the backend API
   - Sends task details to `/api/run-staging` endpoint
   - Displays real-time workflow output

### Backend API

**File**: `apps/backend/app.js`

**Endpoint**: `POST /api/run-staging` (Line ~5761)

**Functionality**:
1. Copies production data to development environment
2. Triggers GitHub Action workflow
3. Returns deployment URLs and workflow status

**Request Payload**:
```json
{
  "taskTitle": "Feature implementation title",
  "taskDetails": "Detailed requirements and acceptance criteria"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Staging workflow triggered",
  "deploymentUrl": "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com",
  "workflowUrl": "https://github.com/demian7575/aipm/actions/workflows/run-in-staging.yml",
  "dataSyncCompleted": true
}
```

### GitHub Workflow

**File**: `.github/workflows/run-in-staging.yml`

**Workflow Steps**:
1. Checkout develop branch
2. Install Node.js and kiro-cli (Amazon Q)
3. Create feature branch
4. Implement changes using Amazon Q
5. Commit and push changes
6. Create PR to main branch
7. Deploy to development environment

**Workflow Inputs**:
- `task_title`: Task title (required)
- `task_details`: Detailed requirements (optional)

### Styling

**File**: `apps/frontend/public/styles.css`

**CSS Classes**:
- `.run-in-staging-btn`: Button styling
- `.workflow-steps`: Workflow step display
- `.staging-output`: Output console styling
- `.staging-actions`: Action button container

## User Workflow

1. **Navigate to Story**: Select a user story in the AIPM workspace
2. **View PR Cards**: Scroll to the Development Tasks section
3. **Click "Run in Staging"**: Opens the staging modal
4. **Review PR Info**: Modal displays PR details and workflow steps
5. **Enter Details**: Provide task title and detailed requirements
6. **Start Workflow**: Click "Start Workflow" to trigger deployment
7. **Monitor Progress**: View real-time output in the modal
8. **Check Status**: Use "Check Status" button to verify deployment

## Workflow Output

The modal displays:
- ✅ Workflow trigger confirmation
- 📊 GitHub Actions link
- 🌐 Development environment URL
- ⏳ Step-by-step progress
- 📋 PR creation notification

## Environment URLs

- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
- **GitHub Actions**: https://github.com/demian7575/aipm/actions/workflows/run-in-staging.yml

## Configuration Requirements

### Environment Variables

**Backend** (`apps/backend/app.js`):
- `GITHUB_TOKEN`: Required for triggering GitHub workflows

**GitHub Secrets**:
- `AWS_ACCESS_KEY_ID`: AWS credentials for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS credentials for deployment
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Testing

To test the feature:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Create a PR card in the Development Tasks section

3. Click "Run in Staging" button

4. Verify modal opens with correct PR information

5. Enter task details and submit

6. Check backend logs for workflow trigger

7. Verify GitHub Actions workflow starts

8. Confirm deployment to development environment

## Integration with Amazon Q (kiro-cli)

The workflow is designed to integrate with Amazon Q CLI (kiro-cli) for automated code implementation:

1. **Installation**: Workflow installs kiro-cli globally
2. **Implementation**: Amazon Q generates code based on task details
3. **Automation**: Changes are automatically committed and pushed
4. **PR Creation**: Pull request is created with implementation details

## Error Handling

The implementation includes comprehensive error handling:

- **Missing GitHub Token**: Returns error if GITHUB_TOKEN not configured
- **Workflow Trigger Failure**: Displays GitHub API error messages
- **Data Sync Errors**: Continues workflow even if data sync fails
- **Network Errors**: Shows user-friendly error messages in modal

## Future Enhancements

Potential improvements:
- Real-time workflow status updates via WebSocket
- Automatic PR status polling
- Integration with CI/CD test results
- Rollback functionality
- Multi-environment support (staging, QA, etc.)

## Troubleshooting

### Button Not Appearing
- Verify PR card has `createTrackingCard !== false`
- Check browser console for JavaScript errors

### Workflow Not Triggering
- Verify `GITHUB_TOKEN` environment variable is set
- Check GitHub Actions permissions
- Verify workflow file exists in `.github/workflows/`

### Deployment Fails
- Check AWS credentials in GitHub Secrets
- Verify `deploy-dev-full.sh` script exists
- Review GitHub Actions logs

## Related Files

- Frontend: `apps/frontend/public/app.js`
- Backend: `apps/backend/app.js`
- Styles: `apps/frontend/public/styles.css`
- Workflow: `.github/workflows/run-in-staging.yml`
- Deploy Script: `deploy-dev-full.sh`

## Compliance

This implementation follows the existing code patterns in the repository:
- Minimal code changes
- Reuses existing modal infrastructure
- Follows established naming conventions
- Maintains consistent error handling
- Uses existing API patterns
