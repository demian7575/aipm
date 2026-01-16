# PR Merge Policy

## Merge Strategy: Squash and Merge

This repository uses **Squash and Merge** as the default merge strategy to maintain a clean, linear commit history.

## Why Squash Merge?

### Benefits
✅ **Clean History**: One commit per feature/fix
✅ **Easy Revert**: Revert entire feature with one command
✅ **Better Bisect**: `git bisect` works on feature level
✅ **Readable Log**: `git log` shows features, not implementation details
✅ **Professional**: Industry standard for open source projects

### Example

**Before Merge (PR with 3 commits)**:
```
* feat: Add filter UI
* fix: Fix typo in filter
* feat: Add filter backend logic
```

**After Squash Merge**:
```
* feat: Filter User Stories in Mindmap View (#1027)
```

## How to Merge

### Via GitHub UI

1. Click the dropdown next to **"Merge pull request"**
2. Select **"Squash and merge"**
3. Edit the commit message:
   - Title: `feat: Feature Name (#PR_NUMBER)`
   - Body: Summary of changes
4. Click **"Confirm squash and merge"**

### Via Command Line

```bash
# Fetch PR branch
git fetch origin pull/1027/head:pr-1027

# Checkout main
git checkout main

# Squash merge
git merge --squash pr-1027

# Commit with proper message
git commit -m "feat: Filter User Stories in Mindmap View (#1027)

- Add status filter
- Add component filter
- Add assignee filter
- Update UI with filter controls"

# Push
git push origin main
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description> (#PR_NUMBER)

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat: Add user authentication (#1025)

- Implement login/logout
- Add JWT token handling
- Create auth middleware
```

```
fix: Resolve syntax error in app.js (#1027)

Fixed missing closing braces that caused deployment failure.
```

## Automated Enforcement

The repository has a GitHub Action that:
- Detects PRs with multiple commits
- Posts a reminder comment
- Provides merge instructions

## Repository Settings

To enforce squash merge in GitHub settings:

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests**
3. Check **"Allow squash merging"**
4. Uncheck **"Allow merge commits"**
5. Uncheck **"Allow rebase merging"**
6. Check **"Automatically delete head branches"**

## Exceptions

Single-commit PRs can use any merge method, but squash is still recommended for consistency.

## References

- [GitHub: About merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)
- [Conventional Commits](https://www.conventionalcommits.org/)
