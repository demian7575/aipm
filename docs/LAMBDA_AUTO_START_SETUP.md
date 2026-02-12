# EC2 Auto-Start Lambda Setup

## Overview

This Lambda function automatically starts the EC2 instance when requests come from the frontend, then proxies the request to the appropriate service.

## Prerequisites

1. AWS CLI configured
2. IAM role with permissions:
   - `ec2:DescribeInstances`
   - `ec2:StartInstances`
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

## Deployment Steps

### 1. Create IAM Role

```bash
aws iam create-role \
  --role-name aipm-ec2-auto-start-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name aipm-ec2-auto-start-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy \
  --role-name aipm-ec2-auto-start-lambda-role \
  --policy-name EC2StartPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:StartInstances"
      ],
      "Resource": "*"
    }]
  }'
```

### 2. Package and Deploy Lambda

```bash
cd lambda
npm init -y
npm install @aws-sdk/client-ec2

zip -r function.zip ec2-auto-start-proxy.js node_modules/

aws lambda create-function \
  --function-name aipm-ec2-auto-start-proxy \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/aipm-ec2-auto-start-lambda-role \
  --handler ec2-auto-start-proxy.handler \
  --zip-file fileb://function.zip \
  --timeout 180 \
  --memory-size 256 \
  --region us-east-1
```

### 3. Create API Gateway

```bash
# Create REST API
aws apigatewayv2 create-api \
  --name aipm-proxy \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:aipm-ec2-auto-start-proxy \
  --region us-east-1

# Get API endpoint
aws apigatewayv2 get-apis --region us-east-1 --query 'Items[?Name==`aipm-proxy`].ApiEndpoint' --output text
```

### 4. Grant API Gateway Permission

```bash
aws lambda add-permission \
  --function-name aipm-ec2-auto-start-proxy \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:API_ID/*" \
  --region us-east-1
```

### 5. Update Frontend

Update `config/environments.yaml`:

```yaml
prod:
  api_url: "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com"
  semantic_api_url: "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com"
```

Then redeploy frontend:

```bash
./bin/deploy-prod prod
```

## How It Works

1. User opens frontend
2. Frontend makes API request to API Gateway
3. API Gateway triggers Lambda
4. Lambda checks EC2 state:
   - If stopped: starts it, waits for services, then proxies request
   - If running: immediately proxies request
5. Lambda returns response to frontend

## Testing

```bash
# Test Lambda directly
aws lambda invoke \
  --function-name aipm-ec2-auto-start-proxy \
  --payload '{"path":"/health","httpMethod":"GET"}' \
  --region us-east-1 \
  response.json

cat response.json
```

## Cost Estimate

- Lambda: ~$0.20 per 1M requests
- API Gateway: ~$1.00 per 1M requests
- EC2 auto-stop saves: ~$15/month (if idle 50% of time)

Net savings: ~$13-14/month

## Monitoring

```bash
# View Lambda logs
aws logs tail /aws/lambda/aipm-ec2-auto-start-proxy --follow --region us-east-1
```
