#!/bin/bash

# Test script for auto-generate acceptance tests feature
echo "🧪 Testing Auto-Generate Acceptance Tests Feature"
echo "================================================="

# Start the development server in background
echo "🚀 Starting development server..."
cd /home/ec2-user/aipm
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:4000/api/stories > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎯 Test Instructions:"
echo "1. Open http://localhost:4000 in your browser"
echo "2. Select any story or create a new one"
echo "3. Click 'Create Child Story' button"
echo "4. Fill in story details:"
echo "   - Title: 'User Login Feature'"
echo "   - As a: 'registered user'"
echo "   - I want: 'to log into the system'"
echo "   - So that: 'I can access my account'"
echo "   - Components: 'WorkModel'"
echo "5. Ensure 'Auto-Generate Tests' checkbox is checked"
echo "6. Click 'Create Story'"
echo "7. Verify that intelligent acceptance tests are created"
echo ""
echo "Expected Results:"
echo "✅ Story should be created with AI-generated acceptance tests"
echo "✅ Tests should have relevant Given/When/Then steps"
echo "✅ Tests should be based on the story details provided"
echo "✅ If AI fails, fallback template tests should be created"
echo ""
echo "Press Ctrl+C to stop the server when testing is complete"

# Keep script running
wait $SERVER_PID
