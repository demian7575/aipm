#!/bin/bash
# Setup GitHub SSH key for EC2

EC2_IP="44.220.45.57"

echo "🔑 GitHub SSH Key Setup for EC2"
echo "================================"
echo ""

# Get the public key
PUBLIC_KEY=$(ssh ec2-user@$EC2_IP "cat ~/.ssh/id_ed25519.pub")

echo "📋 Public Key:"
echo "$PUBLIC_KEY"
echo ""
echo "📝 Steps to add this key to GitHub:"
echo ""
echo "1. Go to: https://github.com/settings/keys"
echo "2. Click 'New SSH key'"
echo "3. Title: EC2 AIPM Kiro Server"
echo "4. Key type: Authentication key"
echo "5. Paste the key above"
echo "6. Click 'Add SSH key'"
echo ""
echo "Press Enter when done..."
read

# Test SSH connection
echo ""
echo "🧪 Testing GitHub SSH connection..."
ssh ec2-user@$EC2_IP "ssh -T git@github.com 2>&1" || true

echo ""
echo "✅ If you see 'successfully authenticated', SSH is working!"
echo ""
echo "🔄 Now updating git remote to use SSH..."
ssh ec2-user@$EC2_IP "
  cd /home/ec2-user/aipm
  git remote set-url origin git@github.com:demian7575/aipm.git
  echo '✅ Remote updated to SSH'
  git remote -v
"

echo ""
echo "🎉 Setup complete! EC2 can now push to GitHub."
