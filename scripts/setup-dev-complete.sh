#!/bin/bash
# Complete development environment setup

DEV_HOST="44.222.168.46"

echo "🔧 Setting up complete development environment..."

# 1. Install Kiro CLI
ssh ec2-user@$DEV_HOST << 'EOF'
echo "📦 Installing Kiro CLI..."
curl -fsSL https://amazon-q-developer-cli-docs.s3.us-west-2.amazonaws.com/install.sh | bash
source ~/.bashrc
EOF

# 2. Update security group for ports 8080, 8081
echo "🔒 Opening required ports..."
aws ec2 authorize-security-group-ingress \
  --group-id sg-02f23dc345006410d \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8080 already open"

aws ec2 authorize-security-group-ingress \
  --group-id sg-02f23dc345006410d \
  --protocol tcp \
  --port 8081 \
  --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8081 already open"

# 3. Copy missing directories from production
echo "📁 Copying missing files from production..."
ssh ec2-user@44.220.45.57 "cd aipm && tar czf /tmp/workers.tar.gz scripts/workers/ 2>/dev/null || echo 'No workers dir'"
scp ec2-user@44.220.45.57:/tmp/workers.tar.gz /tmp/ 2>/dev/null || echo "No workers to copy"
scp /tmp/workers.tar.gz ec2-user@$DEV_HOST:/tmp/ 2>/dev/null || echo "No workers to deploy"
ssh ec2-user@$DEV_HOST "cd aipm && tar xzf /tmp/workers.tar.gz 2>/dev/null || echo 'No workers to extract'"

# 4. Set up AWS credentials (copy from production)
echo "🔑 Setting up AWS credentials..."
ssh ec2-user@44.220.45.57 "cat ~/.aws/credentials" | ssh ec2-user@$DEV_HOST "mkdir -p ~/.aws && cat > ~/.aws/credentials"
ssh ec2-user@44.220.45.57 "cat ~/.aws/config" | ssh ec2-user@$DEV_HOST "cat > ~/.aws/config"

echo "✅ Development environment setup complete!"
echo "🧪 Run deployment: ./bin/deploy-dev"
