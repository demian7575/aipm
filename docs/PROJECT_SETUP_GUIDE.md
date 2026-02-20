# Project Setup Guide

**For AIPM Users**

This guide explains how to add a new project to AIPM for management.

## Prerequisites

- AIPM framework installed and running
- AWS CLI configured with appropriate permissions
- GitHub repository for your project
- Node.js 18+ installed

## Quick Start

### Option 1: Using the UI (Recommended)

1. **Open AIPM** in your browser
2. **Click the ⚙️ icon** next to the project dropdown
3. **Click "+ New Project"**
4. **Fill in the form**:
   - Project ID: `my-app` (lowercase, alphanumeric, hyphens only)
   - Project Name: `My Application`
   - Description: Brief description of your project
   - GitHub Owner: Your GitHub username or organization
   - GitHub Repo: Repository name
5. **Click "Create Project"**
6. **Run initialization script** (see terminal output):
   ```bash
   ./scripts/project-init.sh my-app "My Application" myuser my-app
   ```

### Option 2: Using the CLI

```bash
# Initialize project (creates AWS resources and registers)
./scripts/project-init.sh my-app "My Application" myuser my-app-repo

# Or with custom AWS region
./scripts/project-init.sh my-app "My Application" myuser my-app-repo us-west-2
```

## Detailed Setup

### Step 1: Plan Your Project

Decide on:
- **Project ID**: Short identifier (e.g., `my-app`, `customer-portal`)
  - Must be lowercase
  - Only letters, numbers, and hyphens
  - Will be used in AWS resource names
- **Project Name**: Human-readable name (e.g., "My Application")
- **GitHub Repository**: Where your code lives
- **AWS Region**: Where to create resources (default: us-east-1)

### Step 2: Initialize AWS Resources

The initialization script creates:
- **4 DynamoDB tables**:
  - `{project-id}-stories` - User stories
  - `{project-id}-tests` - Acceptance tests
  - `{project-id}-prs` - Pull requests
  - `{project-id}-test-results` - Test execution results
- **1 S3 bucket**:
  - `{project-id}-documents` - Project documentation

Run:
```bash
./scripts/project-init.sh my-app "My Application" myuser my-app-repo
```

Expected output:
```
🚀 Initializing project: My Application (my-app)
📦 Creating DynamoDB tables...
🪣 Creating S3 bucket...
📝 Registering project...
✅ Project initialized successfully!
```

### Step 3: Configure Your Project Repository

1. **Clone your project** (if not already):
   ```bash
   git clone https://github.com/myuser/my-app-repo
   cd my-app-repo
   ```

2. **Create AIPM configuration**:
   ```bash
   mkdir -p .aipm
   ```

3. **Create `.aipm/config.yaml`**:
   ```yaml
   project:
     id: my-app
     name: "My Application"
     description: "Customer management web application"
     version: "1.0.0"
   
   aipm:
     framework_version: "1.0.0"
     framework_url: "http://aipm-frontend.s3-website.amazonaws.com"
     api_url: "http://your-ec2-ip:4000"
   
   github:
     owner: myuser
     repo: my-app-repo
     default_branch: main
   
   aws:
     region: us-east-1
   
   settings:
     auto_generate_tests: true
     require_acceptance_criteria: true
     default_story_status: "Backlog"
     enable_invest_validation: true
   ```

4. **Commit and push**:
   ```bash
   git add .aipm/
   git commit -m "Add AIPM configuration"
   git push
   ```

### Step 4: Access Your Project in AIPM

1. **Open AIPM** in your browser
2. **Select your project** from the dropdown in the header
3. **Start creating stories!**

## Project Configuration Reference

### `.aipm/config.yaml` Options

```yaml
project:
  id: string              # Project identifier (required)
  name: string            # Display name (required)
  description: string     # Project description
  version: string         # Project version

aipm:
  framework_version: string    # AIPM version compatibility
  framework_url: string        # AIPM frontend URL
  api_url: string             # AIPM backend API URL

github:
  owner: string           # GitHub username or org (required)
  repo: string            # Repository name (required)
  default_branch: string  # Default branch (default: main)
  pr_template: string     # Path to PR template

aws:
  region: string          # AWS region (default: us-east-1)
  profile: string         # AWS CLI profile (optional)

settings:
  auto_generate_tests: boolean           # Auto-generate acceptance tests
  require_acceptance_criteria: boolean   # Require AC before Done
  default_story_status: string          # Initial story status
  story_id_prefix: string               # Prefix for story IDs
  enable_invest_validation: boolean     # Validate INVEST criteria
```

### Custom Templates

You can override default templates by creating files in `.aipm/templates/`:

```
.aipm/
  templates/
    story-draft.md           # Story creation template
    acceptance-test.md       # Acceptance test template
    pr-template.md          # Pull request template
```

## Managing Projects

### Switch Between Projects

Use the dropdown in the AIPM header to switch between projects. Your selection is saved locally.

### View All Projects

Click the ⚙️ icon next to the project dropdown to open the Project Manager.

### Delete a Project

**Warning**: This permanently deletes all AWS resources and data!

**Via UI**:
1. Open Project Manager (⚙️ icon)
2. Click "Delete" next to the project
3. Confirm deletion

**Via CLI**:
```bash
./scripts/project-delete.sh my-app --confirm
```

This will:
- Delete all DynamoDB tables
- Delete S3 bucket and contents
- Remove project from registry

## Troubleshooting

### Project not appearing in dropdown

1. Check if project is registered:
   ```bash
   curl http://localhost:4000/api/projects
   ```

2. Verify `config/projects.yaml` contains your project

3. Restart backend:
   ```bash
   sudo systemctl restart aipm-backend
   ```

### Cannot create stories

1. Verify project ID in request:
   ```bash
   curl -H "X-Project-Id: my-app" http://localhost:4000/api/stories
   ```

2. Check DynamoDB tables exist:
   ```bash
   aws dynamodb list-tables | grep my-app
   ```

3. Verify IAM permissions for DynamoDB and S3

### AWS resources not created

1. Check AWS CLI configuration:
   ```bash
   aws sts get-caller-identity
   ```

2. Verify permissions:
   - `dynamodb:CreateTable`
   - `s3:CreateBucket`
   - `s3:PutObject`

3. Check for naming conflicts:
   ```bash
   aws dynamodb describe-table --table-name my-app-stories
   ```

### Project initialization fails

1. Check script output for specific errors
2. Verify project ID format (lowercase, alphanumeric, hyphens)
3. Ensure S3 bucket name is globally unique
4. Check AWS service quotas

## Best Practices

### Project Naming

- **Use descriptive IDs**: `customer-portal` not `cp`
- **Keep it short**: Avoid long IDs (AWS resource name limits)
- **Use hyphens**: Not underscores or spaces
- **Be consistent**: Use same naming convention across projects

### AWS Resources

- **Use separate regions** for production vs development projects
- **Tag resources** with project metadata
- **Set up billing alerts** per project
- **Regular backups** of DynamoDB tables

### GitHub Integration

- **Use branch protection** on default branch
- **Require PR reviews** before merging
- **Enable CI/CD** with GitHub Actions
- **Link commits to stories** using story IDs in commit messages

### Data Management

- **Regular exports** of project data
- **Archive inactive projects** to reduce costs
- **Document project structure** in repository README
- **Keep `.aipm/config.yaml` in version control**

## Advanced Topics

### Multi-Region Setup

To use different AWS regions for different projects:

```yaml
# Project A - US East
aws:
  region: us-east-1

# Project B - EU West
aws:
  region: eu-west-1
```

### Custom Table Names

Override default table names in project registration:

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-app",
    "name": "My Application",
    "aws": {
      "dynamodb": {
        "stories": "custom-stories-table",
        "tests": "custom-tests-table"
      }
    }
  }'
```

### Project Import/Export

Export project data:
```bash
# Coming soon
./scripts/project-export.sh my-app > my-app-backup.json
```

Import project data:
```bash
# Coming soon
./scripts/project-import.sh my-app < my-app-backup.json
```

## Getting Help

- **Documentation**: See `docs/` directory
- **Issues**: GitHub Issues on AIPM repository
- **Logs**: `sudo journalctl -u aipm-backend -f`
- **API Docs**: `docs/API.md`

## Next Steps

After setting up your project:

1. **Create your first story** in the Mindmap view
2. **Add acceptance tests** to define success criteria
3. **Generate code** using the AI assistant
4. **Track progress** in the Kanban view
5. **Monitor quality** in the RTM view
6. **Review CI/CD** results in the CI/CD view
