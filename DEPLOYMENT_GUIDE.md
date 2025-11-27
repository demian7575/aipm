# AIPM Deployment Guide

This guide covers deploying the AIPM application with network-based persistent storage using DynamoDB.

## Architecture

- **Frontend**: React SPA deployed to S3 static hosting
- **Backend**: Node.js Lambda functions with API Gateway
- **Storage**: DynamoDB tables for stories and acceptance tests
- **Stages**: Development and Production environments

## Quick Start

### Deploy Single Stage

```bash
# Deploy to development
./deploy-multi-stage.sh dev

# Deploy to production  
./deploy-multi-stage.sh prod
```

### Deploy All Stages

```bash
# Deploy to both dev and prod
./deploy-multi-stage.sh all
```

## Environment URLs

After deployment, your applications will be available at:

- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Production**: http://aipm-prod-frontend-hosting.s3-website-us-east-1.amazonaws.com/

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js 18+** installed
3. **Serverless Framework** (installed automatically by script)

## Configuration

### AWS Credentials

Configure AWS credentials using one of these methods:

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_DEFAULT_REGION=us-east-1
```

### GitHub Token (Optional)

For GitHub integration features:

```bash
export GITHUB_TOKEN=your-github-token
```

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Build Application

```bash
npm run build
```

### 3. Deploy Backend

```bash
# Development
serverless deploy --stage dev

# Production
serverless deploy --stage prod
```

### 4. Deploy Frontend

```bash
# Development
aws s3 sync dist/ s3://aipm-dev-frontend-hosting --delete

# Production
aws s3 sync dist/ s3://aipm-prod-frontend-hosting --delete
```

## Data Storage

The application now uses **DynamoDB** for persistent storage instead of localStorage:

- **Stories Table**: `aipm-backend-{stage}-stories`
- **Acceptance Tests Table**: `aipm-backend-{stage}-acceptance-tests`

### Key Changes

1. **No localStorage fallback** - All data is stored in DynamoDB
2. **Network-based persistence** - Data survives browser refreshes and is shared across devices
3. **Stage isolation** - Dev and prod environments have separate databases

## Troubleshooting

### Connection Errors

If you see "Failed to load stories. Check your connection.":

1. Verify API Gateway endpoint is accessible
2. Check CORS configuration
3. Ensure DynamoDB tables exist and have proper permissions

### Deployment Failures

1. **AWS Credentials**: Ensure AWS CLI is configured correctly
2. **Permissions**: Verify IAM permissions for DynamoDB, S3, Lambda, and API Gateway
3. **Dependencies**: Run `npm install --legacy-peer-deps` if you encounter dependency conflicts

### DynamoDB Issues

1. **Table Creation**: Tables are created automatically during deployment
2. **Permissions**: Lambda functions have IAM roles with DynamoDB access
3. **Regions**: Ensure all resources are in the same region (us-east-1)

## Monitoring

### CloudWatch Logs

View Lambda function logs:

```bash
# Development
serverless logs -f api --stage dev

# Production  
serverless logs -f api --stage prod
```

### DynamoDB Metrics

Monitor table usage in AWS Console:
- Go to DynamoDB → Tables
- Select your table
- View Metrics tab

## Cleanup

To remove deployed resources:

```bash
# Remove development stage
serverless remove --stage dev

# Remove production stage
serverless remove --stage prod
```

**Note**: This will delete all data in DynamoDB tables. Export data first if needed.

## CI/CD

The repository includes GitHub Actions workflows for automated deployment:

- **Development**: Deploys on push to `development` branch
- **Production**: Deploys on push to `main` branch

Configure these secrets in your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GITHUB_TOKEN` (optional)
