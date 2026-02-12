#!/bin/bash
# Update S3 config with current EC2 IP address
# Runs on EC2 boot to ensure frontend always has correct IP

set -e

# Determine environment (prod or dev) from instance tags
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d' ' -f2)
REGION="us-east-1"

# Get instance name tag to determine environment
INSTANCE_NAME=$(aws ec2 describe-tags \
  --region $REGION \
  --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Name" \
  --query 'Tags[0].Value' \
  --output text 2>/dev/null || echo "unknown")

# Determine environment from instance name
if [[ "$INSTANCE_NAME" == *"dev"* ]]; then
  ENV="dev"
  S3_CONFIG="s3://aipm-ec2-config/dev-config.json"
elif [[ "$INSTANCE_NAME" == *"prod"* ]]; then
  ENV="prod"
  S3_CONFIG="s3://aipm-ec2-config/prod-config.json"
else
  echo "❌ Could not determine environment from instance name: $INSTANCE_NAME"
  exit 1
fi

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
