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
- **Serverless Framework** installed globally (`npm install -g serverless`)

## Deployment Architecture

### Frontend
- **Service**: Amazon S3 Static Website Hosting
- **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Features**: Mindmap interface, user story management, real-time updates

### Backend
- **Service**: AWS Lambda + API Gateway
- **Runtime**: Node.js 18.x
- **Database**: In-memory with seed data (Lambda-compatible)
- **Features**: REST API, CORS enabled, auto-scaling

## Manual Deployment Steps

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
sudo npm install -g serverless  # If not already installed
```

### 2. Build Application
```bash
npm run build
```

### 3. Deploy Backend
```bash
serverless deploy
```

### 4. Deploy Frontend
```bash
# Create S3 bucket
aws s3 mb s3://aipm-static-hosting-demo --region us-east-1

# Configure for static website hosting
aws s3 website s3://aipm-static-hosting-demo --index-document index.html --error-document error.html

# Set bucket policy for public access
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::aipm-static-hosting-demo/*"
        }
    ]
}
EOF
aws s3api put-bucket-policy --bucket aipm-static-hosting-demo --policy file://bucket-policy.json

# Update frontend config with API endpoint
echo "window.__AIPM_API_BASE__ = 'YOUR_API_GATEWAY_URL';" > dist/public/config.js

# Sync files to S3
aws s3 sync dist/ s3://aipm-static-hosting-demo --delete

# Copy files from public/ to root for proper website hosting
aws s3 cp s3://aipm-static-hosting-demo/public/ s3://aipm-static-hosting-demo/ --recursive

# Create error page
echo '<!DOCTYPE html><html><head><title>AIPM - Page Not Found</title></head><body><h1>404 - Page Not Found</h1><p><a href="/">Return to AIPM</a></p></body></html>' > /tmp/error.html
aws s3 cp /tmp/error.html s3://aipm-static-hosting-demo/error.html
```

## Troubleshooting

### Common Issues

1. **ES Module Error in Lambda**
   - **Issue**: `require is not defined in ES module scope`
   - **Solution**: The handler.js has been updated to use ES modules (`import` instead of `require`)

2. **Dependency Conflicts**
   - **Issue**: `ERESOLVE could not resolve` errors
   - **Solution**: Use `npm install --legacy-peer-deps`

3. **Frontend Shows "Failed to fetch Stories"**
   - **Issue**: API endpoint not configured or wrong format
   - **Solution**: Update `dist/public/config.js` with correct API Gateway URL

4. **Stories Not Displaying**
   - **Issue**: API returns wrong response format
   - **Solution**: API now returns array directly instead of `{stories: [...]}`

5. **"Generate" Button Not Working**
   - **Issue**: Missing `/api/stories/draft` endpoint
   - **Solution**: Added draft endpoint to Lambda handler

### API Endpoints

The deployed Lambda function provides these endpoints:

- `GET /` - API information
- `GET /health` - Health check
- `GET /api/stories` - List all stories (returns array)
- `GET /api/stories/:id` - Get specific story
- `POST /api/stories` - Create new story
- `POST /api/stories/draft` - Generate story draft

### Environment Configuration

#### Production Environment Variables (Lambda)
- `NODE_ENV=production`
- `AIPM_DATA_DIR=/tmp/aipm/data`
- `AIPM_UPLOAD_DIR=/tmp/aipm/uploads`

#### Local Development
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
- In-memory database for fast response times

## Cleanup

Remove all AWS resources:
```bash
serverless remove
aws s3 rm s3://aipm-static-hosting-demo --recursive
aws s3 rb s3://aipm-static-hosting-demo
```

This will delete:
- Lambda function
- API Gateway
- CloudWatch logs
- IAM roles
- S3 bucket and contents
