# Amazon Q Code Generation Workflow

## Simple 3-Step Process

### 1. Run the script
```bash
cd /repo/ebaejun/tools/aws/aipm
./q-generate-and-pr.sh "Add PDF export feature"
```

### 2. Use Amazon Q in your IDE
When prompted:
- Open Amazon Q chat (Kiro CLI or IDE extension)
- Describe the task
- Let Q generate the code
- Review and save files
- Press Enter in terminal

### 3. Done!
Script automatically:
- Commits the code
- Pushes to GitHub
- Creates PR to develop branch

## Example

```bash
./q-generate-and-pr.sh "Create a function to export stories as JSON"
```

**What happens:**
1. Creates branch `amazonq/1732780800`
2. You use Q to generate code
3. Script commits: "feat: Create a function to export stories as JSON (Amazon Q generated)"
4. Pushes to GitHub
5. Creates PR with title: "🤖 Amazon Q: Create a function to export stories as JSON"

## View PRs
https://github.com/demian7575/aipm/pulls

## Requirements
- Git installed
- GitHub CLI (`gh`) installed
- Amazon Q (Kiro CLI or IDE extension)
- Access to the repo

## Install GitHub CLI (if needed)
```bash
# Ubuntu/Debian
sudo apt install gh

# Or download from
https://cli.github.com/
```

## That's it!
No Bedrock setup needed. Just use Amazon Q locally and the script handles the rest.
