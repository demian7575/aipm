#!/bin/bash
# AIPM CloudShell Setup Script
# Run this in AWS CloudShell to set up everything automatically

set -e

echo "🚀 Setting up AIPM in AWS CloudShell..."
echo "================================================"

# Step 1: Install Node.js 18
echo "📦 Step 1/5: Installing Node.js 18..."
if ! command -v node &> /dev/null || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    echo "Installing Node.js 18..."
    nvm install 18
    nvm use 18
    nvm alias default 18
    
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Step 2: Clone AIPM Repository
echo ""
echo "📥 Step 2/5: Cloning AIPM repository..."
cd ~
if [ -d "aipm" ]; then
    echo "⚠️  AIPM directory exists. Updating..."
    cd aipm
    git pull origin main
else
    echo "Cloning from GitHub..."
    git clone https://github.com/demian7575/aipm.git
    cd aipm
    echo "✅ Repository cloned"
fi

# Step 3: Install Dependencies
echo ""
echo "📦 Step 3/5: Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Step 4: Install Global Tools
echo ""
echo "🔧 Step 4/5: Installing global tools..."
npm install -g serverless @aws/kiro-cli
echo "✅ Global tools installed"

# Step 5: Configure Git
echo ""
echo "⚙️  Step 5/5: Configuring Git..."
if [ -z "$(git config --global user.name)" ]; then
    echo "Enter your name for Git commits:"
    read -p "Name: " git_name
    git config --global user.name "$git_name"
fi

if [ -z "$(git config --global user.email)" ]; then
    echo "Enter your email for Git commits:"
    read -p "Email: " git_email
    git config --global user.email "$git_email"
fi
echo "✅ Git configured"

# Verify Setup
echo ""
echo "================================================"
echo "🎉 AIPM Setup Complete!"
echo "================================================"
echo ""
echo "📊 Installed Versions:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Serverless: $(serverless --version | head -1)"
echo ""
echo "📁 AIPM Location: ~/aipm"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start Kiro CLI:"
echo "     cd ~/aipm"
echo "     kiro-cli chat"
echo ""
echo "  2. Deploy to development:"
echo "     ./deploy-dev-full.sh"
echo ""
echo "  3. Run tests:"
echo "     node run-comprehensive-gating-tests.cjs"
echo ""
echo "📚 Documentation:"
echo "  - Quick Start: cat QUICKSTART.md"
echo "  - Full Guide: cat DevelopmentBackground.md"
echo "  - CloudShell Guide: cat CLOUDSHELL_SETUP.md"
echo ""
echo "✅ Ready to code!"
