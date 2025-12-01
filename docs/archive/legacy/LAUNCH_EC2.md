# Launch EC2 for Docker Image Rebuild

## Quick Launch (Copy-Paste)

```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name YOUR_KEY_NAME \
  --security-group-ids $(aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text) \
  --subnet-id $(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query "Subnets[0].SubnetId" --output text) \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=aipm-docker-builder}]' \
  --user-data '#!/bin/bash
yum update -y
yum install -y docker git
systemctl start docker
usermod -a -G docker ec2-user
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
' \
  --query 'Instances[0].[InstanceId,PublicIpAddress]' \
  --output text
```

## After Launch

1. **Wait 2 minutes** for instance to boot

2. **SSH to instance:**
```bash
ssh -i ~/.ssh/YOUR_KEY.pem ec2-user@INSTANCE_IP
```

3. **Run these commands:**
```bash
# Clone repo
git clone https://github.com/demian7575/aipm.git
cd aipm

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  728378229251.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f Dockerfile.q-worker -t aipm-q-worker .
docker tag aipm-q-worker:latest \
  728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
docker push \
  728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
```

4. **Terminate instance:**
```bash
aws ec2 terminate-instances --instance-ids INSTANCE_ID
```

## Alternative: Use Existing EC2

If you already have an EC2 instance:

```bash
# SSH to your instance
ssh ec2-user@your-instance

# Install Docker if needed
sudo yum install -y docker git
sudo systemctl start docker
sudo usermod -a -G docker ec2-user
newgrp docker

# Clone and build
git clone https://github.com/demian7575/aipm.git
cd aipm
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  728378229251.dkr.ecr.us-east-1.amazonaws.com
docker build -f Dockerfile.q-worker -t aipm-q-worker .
docker tag aipm-q-worker:latest \
  728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
docker push \
  728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
```

## Cost

- **t3.medium**: $0.0416/hour
- **30GB EBS**: $0.10/month (prorated)
- **Total for 1 hour**: ~$0.05

## After Push

Test the new image:
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "taskTitle": "Test IAM auth",
    "objective": "Test Amazon Q with IAM",
    "constraints": "Simple change",
    "acceptanceCriteria": "Works",
    "target": "pr",
    "owner": "demian7575",
    "repo": "aipm"
  }'
```

Monitor logs:
```bash
aws logs tail /ecs/aipm-amazon-q-worker --follow --region us-east-1
```

Look for: "✅ Amazon Q generated code successfully"
