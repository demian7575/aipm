# Amazon Q Integration for PR Code Generation

## Overview
When users click "Create PR" in AIPM, Amazon Q (kiro-cli) now generates the actual code implementation before creating the PR.

## How It Works

### Before (Empty PR)
1. User clicks "Create PR"
2. Backend creates empty branch
3. Backend creates PR with just task description
4. ❌ No code implementation

### After (AI-Generated Code)
1. User clicks "Create PR"
2. Backend triggers GitHub Actions workflow
3. Workflow uses **Amazon Q (kiro-cli)** to generate code
4. Workflow commits generated code to feature branch
5. Workflow creates PR with implemented code
6. ✅ PR includes working implementation

## Technical Implementation

### Backend Change (`apps/backend/app.js`)

**Old approach:**
```javascript
// Created empty branch and PR
const pr = await githubRequest(`${repoPath}/pulls`, {
  method: 'POST',
  body: JSON.stringify({
    title: normalized.prTitle,
    body: taskBrief,
    head: branchName,
    base: 'main'
  })
});
```

**New approach:**
```javascript
// Trigger GitHub Actions workflow with Amazon Q
const workflowDispatch = await githubRequest(
  `${repoPath}/actions/workflows/run-in-staging.yml/dispatches`,
  {
    method: 'POST',
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        task_title: normalized.taskTitle,
        task_details: taskDetails
      }
    })
  }
);
```

### GitHub Actions Workflow (`.github/workflows/run-in-staging.yml`)

```yaml
- name: Implement with kiro-cli
  run: |
    # Download Amazon Q CLI
    curl -fsSL https://d3vv6lp55qjaqc.cloudfront.net/items/.../amazon-q-cli-linux-x64.tar.gz | tar -xz
    sudo mv q /usr/local/bin/q
    
    # Generate code with Amazon Q
    q chat "Implement: ${{ inputs.task_title }}. Details: ${{ inputs.task_details }}" --non-interactive
    
    # Commit generated code
    git add -A
    git commit -m "feat: ${{ inputs.task_title }}"
```

## API Response

**Before:**
```json
{
  "type": "pull_request",
  "number": 144,
  "html_url": "https://github.com/demian7575/aipm/pull/144"
}
```

**After:**
```json
{
  "type": "workflow_dispatch",
  "message": "Amazon Q workflow triggered",
  "taskTitle": "Add export button for stories",
  "workflowUrl": "https://github.com/demian7575/aipm/actions/workflows/run-in-staging.yml",
  "confirmationCode": "WF1764411239390"
}
```

## Testing

### Test Request
```bash
curl -X POST "https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "pr",
    "taskTitle": "Add export button for stories",
    "objective": "Add a button to export all stories as JSON file",
    "constraints": "Use vanilla JavaScript, no frameworks",
    "acceptanceCriteria": [
      "Button appears in header",
      "Clicking downloads JSON file",
      "File contains all stories"
    ]
  }'
```

### Test Result
- ✅ Workflow triggered: https://github.com/demian7575/aipm/actions/runs/19782498662
- ⏳ Workflow status: Completed (check for PR creation)
- 📝 Task: "Add export button for stories"

## Benefits

1. **Automated Implementation**: Amazon Q generates working code
2. **Faster Development**: No manual coding required for simple features
3. **Consistent Quality**: AI follows best practices
4. **Review Process**: Generated code still requires human review via PR
5. **Traceability**: Full workflow logs in GitHub Actions

## Workflow Steps

```
User Action → API Call → Workflow Trigger → Amazon Q Generation → PR Creation
     ↓            ↓              ↓                    ↓                ↓
  Click      /api/personal-  GitHub Actions    kiro-cli chat    Feature Branch
  Button      delegate         dispatch         generates code    + Pull Request
```

## Configuration

### Required Environment Variables

**Lambda (Backend):**
- `GITHUB_TOKEN` - GitHub PAT with `repo` and `workflow` scopes
- `GITHUB_OWNER` - Repository owner (default: `demian7575`)
- `GITHUB_REPO` - Repository name (default: `aipm`)

**GitHub Actions:**
- `GITHUB_TOKEN` - Automatically provided by GitHub
- Workflow file: `.github/workflows/run-in-staging.yml`

### GitHub Token Scopes
- ✅ `repo` - Full repository access
- ✅ `workflow` - Trigger workflows
- ✅ `write:packages` - (optional) For package publishing

## Limitations

1. **Workflow Execution Time**: ~2-5 minutes per PR
2. **Amazon Q Availability**: Requires kiro-cli download
3. **Code Quality**: Generated code requires human review
4. **Complex Features**: May need multiple iterations
5. **Token Limits**: Amazon Q has rate limits

## Monitoring

### Check Workflow Status
```bash
# Get recent workflow runs
curl "https://api.github.com/repos/demian7575/aipm/actions/runs?per_page=5" \
  -H "Authorization: token $GITHUB_TOKEN"

# Check specific run
curl "https://api.github.com/repos/demian7575/aipm/actions/runs/19782498662" \
  -H "Authorization: token $GITHUB_TOKEN"
```

### Check Created PRs
```bash
# Get recent PRs
curl "https://api.github.com/repos/demian7575/aipm/pulls?state=all&per_page=5"
```

## Next Steps

1. ✅ Workflow integration complete
2. ⏳ Update frontend to show workflow status
3. ⏳ Add polling for workflow completion
4. ⏳ Display PR link when workflow completes
5. ⏳ Add error handling for workflow failures
6. ⏳ Add retry mechanism for failed workflows

## Troubleshooting

### Workflow Not Triggered
- Check `GITHUB_TOKEN` has `workflow` scope
- Verify workflow file exists in `main` branch
- Check Lambda logs for API errors

### Workflow Fails
- Check GitHub Actions logs
- Verify kiro-cli download URL is accessible
- Check if Amazon Q CLI is working

### No PR Created
- Workflow may have failed during code generation
- Check if there were code changes to commit
- Verify branch push succeeded

---

**Implemented:** November 29, 2025
**Status:** ✅ Deployed to Production
**Workflow:** https://github.com/demian7575/aipm/actions/workflows/run-in-staging.yml
