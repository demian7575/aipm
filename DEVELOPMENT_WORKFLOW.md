# AIPM Development Workflow

## Branch Structure

### `origin/main` (Production)
- **Purpose**: Stable production code
- **Environment**: Production (aipm-static-hosting-demo)
- **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Deployment**: Only from tested, stable code

### `origin/develop` (Development)
- **Purpose**: Active development and testing
- **Environment**: Development (aipm-dev-frontend-hosting)  
- **URL**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Deployment**: Latest development features

## Development Flow

### 1. Local Development
```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch (optional)
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"
```

### 2. Submit to GitHub
```bash
# Push to origin/develop
git checkout develop
git merge feature/my-feature  # if using feature branch
git push origin develop
```

### 3. Deploy Environments
```bash
# Deploy development environment (from origin/develop)
./deploy-develop.sh

# Deploy production environment (from origin/main) - only when ready
./deploy-main.sh
```

## Deployment Commands

### Development Deployment
```bash
./deploy-develop.sh
```
- Pulls latest `origin/develop`
- Deploys to development environment
- Uses development configuration

### Production Deployment
```bash
./deploy-main.sh
```
- Pulls latest `origin/main`
- Deploys to production environment
- Uses production configuration

## Promoting Changes

### From Develop to Main
```bash
# When develop is stable and ready for production
git checkout main
git pull origin main
git merge develop
git push origin main

# Then deploy to production
./deploy-main.sh
```

## Environment URLs

- **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

## Benefits

✅ **Stable Production**: `origin/main` only gets tested code
✅ **Active Development**: `origin/develop` for ongoing work
✅ **Easy Testing**: Development environment reflects latest progress
✅ **Safe Deployments**: Production only updated when ready
✅ **Clear Separation**: Different configs for each environment

## Quick Commands

```bash
# Daily development
git checkout develop
git pull origin develop
# ... make changes ...
git push origin develop
./deploy-develop.sh

# Production release
git checkout main
git merge develop
git push origin main
./deploy-main.sh
```
