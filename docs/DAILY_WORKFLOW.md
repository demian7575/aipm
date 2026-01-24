# Daily Development Workflow

Quick guide for continuing your work from where you left off.

## 🌅 Starting Your Day

### 1. Pull Latest Changes (30 seconds)

```bash
cd aipm
git checkout main
git pull origin main
```

### 2. Check What Changed

```bash
# See recent commits
git log --oneline -10

# See what files changed
git diff HEAD~5 HEAD --stat

# Check if dependencies updated
git diff HEAD~1 HEAD package.json
```

If `package.json` changed:
```bash
npm install
```

### 3. Resume Your Branch

```bash
# List your branches
git branch

# Switch to your working branch
git checkout feature/your-feature

# Merge latest main
git merge main

# Or rebase (cleaner history)
git rebase main
```

### 4. Start Development Server

```bash
npm run dev
```

Access: http://localhost:4000

## 🔍 Finding Your Context

### Check Your Last Commits

```bash
# Your recent work
git log --author="$(git config user.name)" --oneline -10

# See what you changed
git show HEAD
git diff HEAD~1
```

### Check Open PRs

```bash
# Using GitHub CLI
gh pr list --author @me

# View PR details
gh pr view <number>
```

### Check User Stories in AIPM

1. Open http://localhost:4000
2. Look for stories with your email in "Assignee"
3. Check stories with status "In Progress"

### Check Your Notes

```bash
# If you left TODO comments
git grep -n "TODO.*$(git config user.name)"

# Or generic TODOs
git grep -n "TODO\|FIXME\|HACK"
```

## 🎯 Common Scenarios

### Scenario 1: Continuing a Feature

```bash
# 1. Switch to your branch
git checkout feature/my-feature

# 2. Check what you were doing
git log --oneline -5
git diff main...HEAD

# 3. Check if tests pass
npm test

# 4. Start coding
npm run dev
```

### Scenario 2: Starting New Work

```bash
# 1. Update main
git checkout main
git pull

# 2. Check AIPM for assigned stories
# Open http://localhost:4000

# 3. Create new branch
git checkout -b feature/story-<id>-<description>

# 4. Start coding
npm run dev
```

### Scenario 3: Fixing a Bug

```bash
# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/bug-description

# 2. Reproduce the bug
npm run dev

# 3. Fix and test
npm test

# 4. Commit and push
git add .
git commit -m "fix: description"
git push origin hotfix/bug-description
```

### Scenario 4: Reviewing a PR

```bash
# 1. Fetch PR branch
gh pr checkout <number>

# Or manually
git fetch origin pull/<number>/head:pr-<number>
git checkout pr-<number>

# 2. Test locally
npm install
npm run dev
npm test

# 3. Leave review
gh pr review <number> --comment -b "Your feedback"
```

## 🔄 Quick Commands

### Status Check

```bash
# What branch am I on?
git branch --show-current

# What changed?
git status

# What's uncommitted?
git diff

# What's staged?
git diff --staged
```

### Quick Sync

```bash
# Save work in progress
git stash

# Update main
git checkout main
git pull

# Back to work
git checkout feature/my-feature
git merge main
git stash pop
```

### Quick Test

```bash
# Test your changes
npm test

# Test specific file
npm test -- tests/specific.test.js

# Run gating tests (if deployed)
source scripts/utilities/load-env-config.sh production
./scripts/testing/phase1-security-data-safety.sh
```

## 📝 Best Practices

### Before Starting Work

- ✅ Pull latest main
- ✅ Check for conflicts
- ✅ Run tests to ensure clean state
- ✅ Check AIPM for assigned stories

### During Work

- ✅ Commit frequently with clear messages
- ✅ Run tests before committing
- ✅ Keep branch up to date with main
- ✅ Update story status in AIPM

### Before Ending Day

- ✅ Commit all work (even WIP)
- ✅ Push to remote (backup)
- ✅ Update story status
- ✅ Leave TODO comments for tomorrow

```bash
# End of day checklist
git add .
git commit -m "wip: description of current state"
git push origin feature/my-feature

# Leave notes for tomorrow
echo "# TODO Tomorrow
- Finish implementing X
- Test Y scenario
- Update documentation
" >> TODO.md
```

## 🚨 Troubleshooting

### Merge Conflicts

```bash
# See conflicted files
git status

# Edit files to resolve conflicts
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit
```

### Lost Work

```bash
# Find lost commits
git reflog

# Recover lost commit
git checkout <commit-hash>
git checkout -b recovered-work
```

### Broken State

```bash
# Discard all changes
git reset --hard HEAD

# Clean untracked files
git clean -fd

# Start fresh
npm install
npm run dev
```

## 🎓 Pro Tips

### Use Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
  st = status
  co = checkout
  br = branch
  ci = commit
  lg = log --oneline --graph --decorate
  today = log --since=midnight --author="$(git config user.name)" --oneline
```

### Use VS Code Tasks

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Server",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": []
    }
  ]
}
```

### Keep Context Document

Create `CONTEXT.md` in your branch:
```markdown
# Feature: My Feature

## Goal
What I'm trying to achieve

## Progress
- [x] Step 1
- [ ] Step 2
- [ ] Step 3

## Next Steps
1. Implement X
2. Test Y
3. Update docs

## Notes
- API endpoint: /api/my-endpoint
- Related story: #123
- Blocked by: Nothing
```

## 📊 Productivity Workflow

### Morning Routine (5 minutes)

```bash
# 1. Update
git checkout main && git pull

# 2. Check changes
git log --since="yesterday" --oneline

# 3. Resume work
git checkout feature/my-feature
git merge main

# 4. Start server
npm run dev
```

### During Development

- Code in 25-minute focused blocks (Pomodoro)
- Commit after each completed subtask
- Test frequently
- Update AIPM story status

### End of Day (5 minutes)

```bash
# 1. Commit everything
git add .
git commit -m "wip: current state"

# 2. Push backup
git push origin feature/my-feature

# 3. Update story
# Mark progress in AIPM UI

# 4. Leave notes
echo "Tomorrow: Continue with X" >> NOTES.md
```

## 🔗 Related Documentation

- [Getting Started](GETTING_STARTED.md) - Initial setup
- [Development](DEVELOPMENT.md) - Detailed development guide
- [Testing](TESTING.md) - Testing procedures
- [Deployment](DEPLOYMENT.md) - Deployment guide

---

**Quick Start**: `git pull && git checkout <your-branch> && npm run dev` 🚀
