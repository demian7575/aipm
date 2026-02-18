#!/bin/bash
set -e

ENV=${1:-prod}

if [[ "$ENV" != "prod" && "$ENV" != "dev" ]]; then
    echo "Usage: $0 <prod|dev>"
    exit 1
fi

echo "🚀 Deploying Lambda functions to $ENV..."

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utilities/load-env-config.sh" "$ENV"

LAMBDA_DIR="$SCRIPT_DIR/../lambda"
TEMP_DIR=$(mktemp -d)

# Deploy ec2-controller (Python)
echo "📦 Packaging ec2-controller..."
cd "$LAMBDA_DIR"
zip -q "$TEMP_DIR/ec2-controller.zip" ec2-controller.py

FUNCTION_NAME="aipm-${ENV}-ec2-controller"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region us-east-1 >/dev/null 2>&1; then
    echo "🔄 Updating $FUNCTION_NAME..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://$TEMP_DIR/ec2-controller.zip" \
        --region us-east-1 >/dev/null
else
    echo "⚠️  $FUNCTION_NAME not found, skipping"
fi

# Deploy ec2-auto-start-proxy (Node.js)
echo "📦 Packaging ec2-auto-start-proxy..."
cd "$TEMP_DIR"
cp "$LAMBDA_DIR/ec2-auto-start-proxy.js" .
npm init -y >/dev/null 2>&1
npm install --silent @aws-sdk/client-ec2 >/dev/null 2>&1
zip -qr ec2-auto-start-proxy.zip ec2-auto-start-proxy.js node_modules/

FUNCTION_NAME="aipm-${ENV}-ec2-auto-start-proxy"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region us-east-1 >/dev/null 2>&1; then
    echo "🔄 Updating $FUNCTION_NAME..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://ec2-auto-start-proxy.zip" \
        --region us-east-1 >/dev/null
else
    echo "⚠️  $FUNCTION_NAME not found, skipping"
fi

rm -rf "$TEMP_DIR"
echo "✅ Lambda deployment complete"
