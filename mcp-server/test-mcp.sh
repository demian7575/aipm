#!/bin/bash
# Test MCP story generation

echo "Testing MCP-enhanced story generation..."
echo ""

# Test 1: List tools
echo "1. Listing available tools..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node mcp-server/aipm-server.js 2>/dev/null | \
  jq -r '.result.tools[] | select(.name == "generate_story_with_context") | .name'

echo ""

# Test 2: Generate story
echo "2. Generating story: 'implement password reset' under parent 2000..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"generate_story_with_context","arguments":{"feature_description":"implement password reset","parentId":2000}}}' | \
  node mcp-server/aipm-server.js 2>/dev/null | \
  jq -r '.result.content[0].text | fromjson | "Story ID: \(.story.id)\nTitle: \(.story.title)\nPoints: \(.story.storyPoint)\nComponents: \(.story.components | join(", "))\nReasoning: \(.context.reasoning)"'

echo ""
echo "✅ Test complete!"
