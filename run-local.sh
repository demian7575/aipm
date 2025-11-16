#!/bin/bash
set -e

echo "🚀 AIPM Local Development"
echo "========================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build and start
echo "🏗️  Building application..."
npm run build

echo "🌐 Starting development server..."
echo ""
echo "Frontend: http://localhost:4000"
echo "API: http://localhost:4000/api"
echo ""
echo "Press Ctrl+C to stop"

npm run dev
