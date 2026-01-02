#!/bin/bash
# Simple deployment script

source .env.simple

# Generate simple config
cat > apps/frontend/public/config.js << EOF
window.CONFIG = {
  API_BASE_URL: 'http://${EC2_HOST}:${API_PORT}'
};
EOF

# Deploy
aws s3 cp apps/frontend/public/config.js s3://aipm-static-hosting-demo/config.js
aws s3 cp apps/frontend/public/app-simple.js s3://aipm-static-hosting-demo/app.js
scp scripts/kiro-api-simple.js ec2-user@${EC2_HOST}:/home/ec2-user/aipm/scripts/kiro-api-server-v4.js

# Restart
ssh ec2-user@${EC2_HOST} 'sudo systemctl restart kiro-api-v4'

echo "✅ Simple deployment complete"
