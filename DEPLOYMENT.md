# AIPM Deployment Guide

Deploy the AI Project Manager web service to AWS with a single command.

## Quick Start

```bash
# One-command deployment
./deploy.sh
```

This will deploy both frontend and backend to AWS automatically.

## Prerequisites

- **AWS CLI** configured with credentials (`aws configure`)
- **Node.js 18+** installed
- **Git** for version control

## Deployment Architecture

### Frontend
- **Service**: Amazon S3 Static Website Hosting
- **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Features**: Mindmap interface, user story management, real-time updates

### Backend
- **Service**: AWS Lambda + API Gateway
- **Runtime**: Node.js 18.x
- **Database**: JSON-based (Lambda-compatible)
- **Features**: REST API, CORS enabled, auto-scaling

## Manual Deployment Steps

### 1. Install Dependencies
```bash
npm install
npm install -g serverless  # If not already installed
```

### 2. Build Application
```bash
npm run build
```

### 3. Deploy Backend
```bash
npm run deploy:backend
# or
serverless deploy
```

### 4. Deploy Frontend
```bash
npm run deploy:frontend
# or
aws s3 sync dist/ s3://aipm-static-hosting-demo --delete
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run deploy` | Full deployment (frontend + backend) |
| `npm run deploy:backend` | Deploy only backend services |
| `npm run deploy:frontend` | Deploy only frontend to S3 |
| `npm run deploy:local` | Run backend locally for testing |
| `npm run logs` | View Lambda function logs |
| `npm run remove` | Remove all AWS resources |

## Environment Configuration

### Production Environment Variables
- `NODE_ENV=production`
- `AIPM_DATA_DIR=/tmp/aipm/data`
- `AIPM_UPLOAD_DIR=/tmp/aipm/uploads`
- `AI_PM_FORCE_JSON_DB=1`

### Local Development
```bash
npm run dev  # Start local development server
```

## Monitoring & Logs

### View Lambda Logs
```bash
serverless logs -f api --tail
```

### CloudWatch Logs
- Navigate to AWS CloudWatch Console
- Find log group: `/aws/lambda/aipm-backend-prod-api`

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Configured**
   ```bash
   aws configure
   ```

2. **S3 Bucket Already Exists**
   - The script handles this automatically
   - Bucket name: `aipm-static-hosting-demo`

3. **Lambda Deployment Fails**
   ```bash
   # Check serverless configuration
   serverless info
   
   # Redeploy with verbose output
   serverless deploy --verbose
   ```

4. **CORS Issues**
   - Backend includes comprehensive CORS headers
   - Frontend configured for cross-origin requests

### Health Check

Test the deployed API:
```bash
curl https://your-api-gateway-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-16T09:00:00.000Z"
}
```

## Cost Optimization

### AWS Free Tier Eligible
- **Lambda**: 1M requests/month free
- **API Gateway**: 1M requests/month free
- **S3**: 5GB storage free

### Estimated Monthly Cost
- **Lambda**: ~$0.20 per 1M requests
- **API Gateway**: ~$3.50 per 1M requests
- **S3**: ~$0.023 per GB storage

## Security

### CORS Configuration
- Origins: `*` (configure for production)
- Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Headers: Standard AWS headers included

### IAM Permissions
- Lambda execution role with CloudWatch logs access
- S3 bucket with public read access for static hosting

## Scaling

### Automatic Scaling
- **Lambda**: Scales automatically based on requests
- **API Gateway**: Handles up to 10,000 requests/second
- **S3**: Unlimited storage and bandwidth

### Performance Optimization
- Lambda memory: 512MB (configurable)
- Lambda timeout: 30 seconds
- Cold start optimization included

## Cleanup

Remove all AWS resources:
```bash
npm run remove
# or
serverless remove
```

This will delete:
- Lambda function
- API Gateway
- CloudWatch logs
- IAM roles

Note: S3 bucket must be manually deleted if desired.
