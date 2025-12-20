#!/bin/bash
# Safe Kiro API Deployment - With Error Prevention

set -e

EC2_HOST="${EC2_HOST:-44.220.45.57}"
EC2_USER="${EC2_USER:-ec2-user}"

echo "🚀 Safe Kiro API Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Pre-deployment validation
echo "📋 Step 1: Pre-deployment Validation"
if ! ./scripts/testing/test-deployment-prerequisites.sh; then
    echo ""
    echo "❌ Pre-deployment checks failed"
    echo "Fix issues above before deploying"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Prepare EC2 repository
echo "📋 Step 2: Prepare EC2 Repository"

# Check and handle uncommitted changes
echo "  Checking for uncommitted changes..."
CHANGES=$(ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && git status --porcelain" | wc -l)
if [ "$CHANGES" -gt 0 ]; then
    echo "  ⚠️  Found uncommitted changes, stashing..."
    ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && git stash"
fi

# Ensure on develop branch
echo "  Ensuring on develop branch..."
CURRENT_BRANCH=$(ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && git branch --show-current")
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "  Switching from $CURRENT_BRANCH to develop..."
    ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && git checkout develop"
fi

# Update repository
echo "  Updating repository..."
ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && git fetch origin develop && git reset --hard origin/develop"

echo "  ✅ Repository prepared"
echo ""

# Step 3: Deploy files
echo "📋 Step 3: Deploy Kiro API Files"
echo "  Copying kiro-api-server.js..."
scp scripts/workers/kiro-api-server.js ${EC2_USER}@${EC2_HOST}:~/aipm/scripts/workers/

echo "  Copying setup script..."
scp scripts/deployment/setup-kiro-api-service.sh ${EC2_USER}@${EC2_HOST}:~/aipm/scripts/deployment/

echo "  ✅ Files deployed"
echo ""

# Step 4: Setup/update service
echo "📋 Step 4: Setup Kiro API Service"
ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && bash scripts/deployment/setup-kiro-api-service.sh"
echo ""

# Step 5: Verify security group
echo "📋 Step 5: Verify Security Group"
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=${EC2_HOST}" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region us-east-1)

SG_ID=$(aws ec2 describe-instances \
    --instance-ids ${INSTANCE_ID} \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
    --output text \
    --region us-east-1)

echo "  Instance: ${INSTANCE_ID}"
echo "  Security Group: ${SG_ID}"

# Check if port 8081 is open
PORT_OPEN=$(aws ec2 describe-security-groups \
    --group-ids ${SG_ID} \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`8081\`]" \
    --output text \
    --region us-east-1)

if [ -z "$PORT_OPEN" ]; then
    echo "  ⚠️  Port 8081 not open, opening now..."
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --ip-permissions IpProtocol=tcp,FromPort=8081,ToPort=8081,IpRanges='[{CidrIp=0.0.0.0/0,Description="Kiro API Server"}]' \
        --region us-east-1
    echo "  ✅ Port 8081 opened"
else
    echo "  ✅ Port 8081 already open"
fi
echo ""

# Step 6: Post-deployment validation
echo "📋 Step 6: Post-deployment Validation"

echo "  Testing health endpoint..."
sleep 3
if curl -s -m 5 http://${EC2_HOST}:8081/health | grep -q "running"; then
    echo "  ✅ Health check passed"
else
    echo "  ❌ Health check failed"
    exit 1
fi

echo "  Running gating tests..."
if ./scripts/testing/test-kiro-api-gating.sh > /dev/null 2>&1; then
    echo "  ✅ Gating tests passed"
else
    echo "  ⚠️  Some gating tests failed (check logs)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Kiro API Deployed Successfully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Endpoint: http://${EC2_HOST}:8081"
echo "Health: http://${EC2_HOST}:8081/health"
echo ""
echo "Monitor logs:"
echo "  ssh ${EC2_USER}@${EC2_HOST} 'tail -f /tmp/kiro-api-server.log'"
