#!/bin/bash
# Setup nginx as SSL reverse proxy for terminal server

set -e

echo "🔧 Setting up SSL proxy for terminal server..."

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    sudo yum install -y nginx
fi

# Generate self-signed certificate (valid for 365 days)
echo "🔐 Generating SSL certificate..."
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/terminal.key \
    -out /etc/nginx/ssl/terminal.crt \
    -subj "/C=US/ST=State/L=City/O=AIPM/CN=terminal.aipm.local"

# Create nginx config
echo "📝 Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/terminal-proxy.conf > /dev/null <<'EOF'
upstream terminal_backend {
    server 127.0.0.1:8080;
}

server {
    listen 8443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/ssl/terminal.crt;
    ssl_certificate_key /etc/nginx/ssl/terminal.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket support
    location /terminal {
        proxy_pass http://terminal_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # HTTP API endpoints
    location / {
        proxy_pass http://terminal_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Start nginx
echo "🚀 Starting nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Open port 8443 in security group (if needed)
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)
SECURITY_GROUP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text --region us-east-1)

echo "🔓 Opening port 8443 in security group $SECURITY_GROUP..."
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP \
    --protocol tcp \
    --port 8443 \
    --cidr 0.0.0.0/0 \
    --region us-east-1 2>/dev/null || echo "Port 8443 already open"

echo "✅ SSL proxy setup complete!"
echo "🔗 WSS endpoint: wss://$(ec2-metadata --public-ipv4 | cut -d " " -f 2):8443/terminal"
echo ""
echo "⚠️  Note: Browsers will show a security warning for self-signed certificate."
echo "   Users need to accept the certificate to connect."
