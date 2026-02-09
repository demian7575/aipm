# Setup API Gateway for Semantic API

## Goal
Create a permanent API Gateway URL that proxies to EC2 semantic API, allowing EC2 stop/start without IP changes.

## Current Setup
- EC2 Instance: i-08c78da25af47b3cb (aipm-dev-server)
- Private IP: 172.31.65.37
- VPC: vpc-039550794d80e685e
- Subnet: subnet-07b0e3f8154039744
- Security Group: sg-02f23dc345006410d
- Semantic API Port: 9000
- Current Access: http://44.221.87.105:9000

## Target Architecture
```
Client
  ↓
API Gateway (https://xxx.execute-api.us-east-1.amazonaws.com/prod)
  ↓
VPC Link
  ↓
Network Load Balancer (internal)
  ↓
EC2 Private IP (172.31.65.37:9000)
```

## Steps

### 1. Create Network Load Balancer (NLB)
```bash
# Create NLB in same VPC/subnet as EC2
aws elbv2 create-load-balancer \
  --name semantic-api-nlb \
  --type network \
  --scheme internal \
  --subnets subnet-07b0e3f8154039744 \
  --region us-east-1

# Note the LoadBalancerArn from output
```

### 2. Create Target Group
```bash
# Create target group pointing to port 9000
aws elbv2 create-target-group \
  --name semantic-api-targets \
  --protocol TCP \
  --port 9000 \
  --vpc-id vpc-039550794d80e685e \
  --target-type ip \
  --region us-east-1

# Note the TargetGroupArn from output

# Register EC2 private IP as target
aws elbv2 register-targets \
  --target-group-arn <TargetGroupArn> \
  --targets Id=172.31.65.37 \
  --region us-east-1
```

### 3. Create Listener
```bash
# Create listener on NLB
aws elbv2 create-listener \
  --load-balancer-arn <LoadBalancerArn> \
  --protocol TCP \
  --port 9000 \
  --default-actions Type=forward,TargetGroupArn=<TargetGroupArn> \
  --region us-east-1
```

### 4. Create VPC Link
```bash
# Create VPC Link to NLB
aws apigatewayv2 create-vpc-link \
  --name semantic-api-vpc-link \
  --subnet-ids subnet-07b0e3f8154039744 \
  --security-group-ids sg-02f23dc345006410d \
  --region us-east-1

# Note the VpcLinkId from output
# Wait for status to become AVAILABLE (takes 5-10 minutes)
aws apigatewayv2 get-vpc-link --vpc-link-id <VpcLinkId> --region us-east-1
```

### 5. Create API Gateway HTTP API
```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name semantic-api-gateway \
  --protocol-type HTTP \
  --region us-east-1

# Note the ApiId from output
```

### 6. Create Integration
```bash
# Create VPC Link integration
aws apigatewayv2 create-integration \
  --api-id <ApiId> \
  --integration-type HTTP_PROXY \
  --integration-uri <NLB-DNS-Name>:9000 \
  --integration-method ANY \
  --connection-type VPC_LINK \
  --connection-id <VpcLinkId> \
  --payload-format-version 1.0 \
  --region us-east-1

# Note the IntegrationId from output
```

### 7. Create Routes
```bash
# Create catch-all route
aws apigatewayv2 create-route \
  --api-id <ApiId> \
  --route-key 'ANY /{proxy+}' \
  --target integrations/<IntegrationId> \
  --region us-east-1

# Create root route
aws apigatewayv2 create-route \
  --api-id <ApiId> \
  --route-key 'ANY /' \
  --target integrations/<IntegrationId> \
  --region us-east-1
```

### 8. Create Stage and Deploy
```bash
# Create production stage
aws apigatewayv2 create-stage \
  --api-id <ApiId> \
  --stage-name prod \
  --auto-deploy \
  --region us-east-1
```

### 9. Test
```bash
# Get API endpoint
aws apigatewayv2 get-api --api-id <ApiId> --query 'ApiEndpoint' --output text

# Test health endpoint
curl https://<ApiId>.execute-api.us-east-1.amazonaws.com/prod/health

# Test weather endpoint
curl "https://<ApiId>.execute-api.us-east-1.amazonaws.com/prod/weather?city=Seoul"
```

## Security Group Update
```bash
# Allow NLB to access EC2 on port 9000
aws ec2 authorize-security-group-ingress \
  --group-id sg-02f23dc345006410d \
  --protocol tcp \
  --port 9000 \
  --source-group <NLB-SecurityGroupId> \
  --region us-east-1
```

## Cost Estimate
- Network Load Balancer: $0.0225/hour = $16.20/month
- VPC Link: FREE (no additional charge)
- API Gateway HTTP API: $1.00/million requests (first 1M free)
- **Total: ~$16/month**

## Alternative: Simpler HTTP Integration (No VPC Link)
If cost is a concern, use public IP with HTTP integration:

```bash
# Create integration with public IP
aws apigatewayv2 create-integration \
  --api-id <ApiId> \
  --integration-type HTTP_PROXY \
  --integration-uri http://44.221.87.105:9000/{proxy} \
  --integration-method ANY \
  --payload-format-version 1.0 \
  --region us-east-1
```

**Problem**: Public IP changes on stop/start, so this won't work with automation.

## Recommendation
Given the NLB cost ($16/month), **Elastic IP is cheaper** ($1.80/month when stopped).

**Better solution**: Use Elastic IP + stop/start automation
- Cost: $9 (EC2 running 50h/week) + $1.80 (EIP when stopped) = $10.80/month
- Savings vs 24/7: $30 - $10.80 = **$19.20/month**

## Next Steps
1. Decide: API Gateway ($16/month) vs Elastic IP ($1.80/month)
2. If Elastic IP: Allocate and associate EIP
3. If API Gateway: Follow steps above
4. Set up stop/start automation (EventBridge + Lambda)
