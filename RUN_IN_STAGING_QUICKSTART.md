# Run in Staging - Quick Start Guide

## What is "Run in Staging"?

The "Run in Staging" button allows you to deploy a PR to the development environment for testing before merging to production. It automates the entire workflow from code implementation to deployment.

## Where to Find It

```
AIPM Workspace
└── User Story (selected)
    └── Details Panel
        └── Development Tasks Section
            └── PR Card
                └── [Run in Staging] Button
```

## Quick Usage

### Step 1: Create a PR Card
1. Select a user story
2. Click "Create PR" in Development Tasks section
3. Fill in PR details and submit

### Step 2: Run in Staging
1. Click **"Run in Staging"** button on the PR card
2. Modal opens showing PR information and workflow steps

### Step 3: Provide Details
1. Review pre-filled task title
2. Add detailed requirements in the textarea
3. Click **"Start Workflow"**

### Step 4: Monitor Progress
The modal displays real-time output:
```
🚀 Starting Run in Staging workflow...
📝 Task: Your task title

⚙️  Triggering GitHub Action workflow...
✅ Workflow triggered successfully!

📊 GitHub Actions: [link]
🌐 Development URL: [link]

⏳ Workflow steps:
   1. ✓ Create feature branch from main
   2. ⏳ Install kiro-cli (Amazon Q)
   3. ⏳ Implement code changes
   4. ⏳ Create PR to main
   5. ⏳ Deploy to development

✨ Check GitHub Actions link above for live progress
📋 PR will be created for review before merging to main
```

## What Happens Behind the Scenes

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Run in Staging"                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend sends request to /api/run-staging               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend copies production data to development            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend triggers GitHub Action workflow                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. GitHub Action runs:                                      │
│    - Creates feature branch                                 │
│    - Installs kiro-cli (Amazon Q)                          │
│    - Implements code changes                                │
│    - Commits and pushes                                     │
│    - Creates PR to main                                     │
│    - Deploys to development                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Development environment updated                          │
│    URL: http://aipm-dev-frontend-hosting.s3-website...     │
└─────────────────────────────────────────────────────────────┘
```

## Button Actions on PR Card

Each PR card has these buttons:

| Button | Action |
|--------|--------|
| **Open PR** | Opens the PR in GitHub |
| **View conversation** | Opens the PR discussion thread |
| **Check status** | Refreshes PR status from GitHub |
| **Rebase** | Rebases the PR branch |
| **Run in Staging** | Deploys PR to development environment |
| **Stop tracking** | Removes the PR card from tracking |

## Environment URLs

- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
- **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
- **GitHub Actions**: https://github.com/demian7575/aipm/actions

## Prerequisites

### For Backend
- `GITHUB_TOKEN` environment variable must be set
- Token needs `repo` and `workflow` permissions

### For GitHub Workflow
- AWS credentials configured in GitHub Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

## Configuration

Set the GitHub token before starting the server:

```bash
export GITHUB_TOKEN=ghp_your_token_here
npm run dev
```

## Troubleshooting

### Button doesn't appear
- Ensure PR card has tracking enabled
- Check browser console for errors

### Workflow doesn't trigger
- Verify `GITHUB_TOKEN` is set
- Check token has correct permissions
- Verify workflow file exists

### Deployment fails
- Check AWS credentials in GitHub Secrets
- Review GitHub Actions logs
- Verify `deploy-dev-full.sh` exists

## Testing Locally

Run the verification script:

```bash
./test-run-in-staging.sh
```

This checks:
- ✅ GitHub workflow file exists
- ✅ Frontend modal function exists
- ✅ Backend API endpoint exists
- ✅ CSS styles are present

## Example Workflow

### Scenario: Add a new feature

1. **Create User Story**
   - Title: "Add export to PDF feature"
   - Description: "Users need to export reports as PDF"

2. **Create PR Card**
   - Click "Create PR" in Development Tasks
   - Fill in PR details

3. **Run in Staging**
   - Click "Run in Staging" button
   - Enter detailed requirements:
     ```
     Implement PDF export functionality:
     - Add "Export to PDF" button in report view
     - Use jsPDF library for PDF generation
     - Include all report data and charts
     - Add download prompt with filename
     ```

4. **Monitor Progress**
   - Watch GitHub Actions workflow
   - Check development environment
   - Test the implementation

5. **Review PR**
   - Review the auto-generated PR
   - Request changes if needed
   - Approve and merge to main

6. **Deploy to Production**
   - After merge, deploy to production
   - Verify in production environment

## API Reference

### POST /api/run-staging

**Request:**
```json
{
  "taskTitle": "Add export to PDF feature",
  "taskDetails": "Detailed requirements and acceptance criteria..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staging workflow triggered",
  "deploymentUrl": "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com",
  "workflowUrl": "https://github.com/demian7575/aipm/actions/workflows/run-in-staging.yml",
  "dataSyncCompleted": true
}
```

## Next Steps

After running in staging:

1. **Test in Development**
   - Visit the development URL
   - Test the implemented feature
   - Verify acceptance criteria

2. **Review PR**
   - Check the auto-generated PR
   - Review code changes
   - Add comments if needed

3. **Merge to Main**
   - Approve the PR
   - Squash and merge
   - Delete feature branch

4. **Deploy to Production**
   - Run production deployment
   - Verify in production
   - Monitor for issues

## Support

For detailed implementation information, see:
- **Full Documentation**: `RUN_IN_STAGING_IMPLEMENTATION.md`
- **Main README**: `README.md`
- **Development Guide**: `DevelopmentBackground.md`

## Feature Status

✅ **Fully Implemented**
- Frontend button and modal
- Backend API endpoint
- GitHub workflow
- Data synchronization
- Error handling
- CSS styling

🚀 **Ready to Use**
- All components verified
- Test script passes
- Documentation complete
