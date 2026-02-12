#!/bin/bash
# Update S3 config with current EC2 IP address
# Runs on EC2 boot to ensure frontend always has correct IP
# Usage: update-ec2-ip-to-s3.sh [prod|dev]

set -e

# Region
REGION="us-east-1"

# Get environment from parameter or detect from instance tags
ENV_PARAM="$1"

if [[ -n "$ENV_PARAM" ]]; then
  # Use provided parameter
  ENV="$ENV_PARAM"
else
  # Try to detect from instance tags
  INSTANCE_ID=$(ec2-metadata --instance-id 2>/dev/null | cut -d' ' -f2 || echo "")
  
  if [[ -n "$INSTANCE_ID" ]]; then
    INSTANCE_NAME=$(aws ec2 describe-tags \
      --region $REGION \
      --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Name" \
      --query 'Tags[0].Value' \
      --output text 2>/dev/null || echo "unknown")
    
    ENV_TAG=$(aws ec2 describe-tags \
      --region $REGION \
      --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Environment" \
      --query 'Tags[0].Value' \
      --output text 2>/dev/null || echo "")
    
    if [[ "$ENV_TAG" == "development" ]] || [[ "$INSTANCE_NAME" == *"dev"* ]]; then
      ENV="dev"
    elif [[ "$ENV_TAG" == "production" ]] || [[ "$INSTANCE_NAME" == *"prod"* ]]; then
      ENV="prod"
    fi
  fi
fi

# Validate environment
if [[ "$ENV" != "prod" && "$ENV" != "dev" ]]; then
  echo "❌ Could not determine environment. Usage: $0 [prod|dev]"
  exit 1
fi

S3_CONFIG="s3://aipm-ec2-config/${ENV}-config.json"
INSTANCE_ID=$(ec2-metadata --instance-id 2>/dev/null | cut -d' ' -f2 || echo "unknown")

# Get current public IP
PUBLIC_IP=$(ec2-metadata --public-ipv4 | cut -d' ' -f2)

if [[ -z "$PUBLIC_IP" || "$PUBLIC_IP" == "null" ]]; then
  echo "❌ Could not get public IP"
  exit 1
fi

echo "🔄 Updating $ENV EC2 IP to $PUBLIC_IP"

# Create config JSON
cat > /tmp/ec2-config.json << EOF
{
  "apiBaseUrl": "http://${PUBLIC_IP}:4000",
  "semanticApiUrl": "http://${PUBLIC_IP}:8083",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "instanceId": "$INSTANCE_ID",
  "status": "running"
}
EOF

# Upload to S3
aws s3 cp /tmp/ec2-config.json $S3_CONFIG \
  --region $REGION \
  --content-type "application/json" \
  --cache-control "no-cache, no-store, must-revalidate"

echo "✅ Updated S3 config: $S3_CONFIG"
echo "   IP: $PUBLIC_IP"
echo "   Time: $(date)"

# Clean up
rm -f /tmp/ec2-config.json
