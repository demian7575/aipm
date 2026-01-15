#!/usr/bin/env python3
"""
Test MCP-enhanced story generation
"""

import json
import subprocess
import sys

def test_mcp():
    print("🧪 Testing MCP-enhanced story generation...\n")
    
    # Test 1: Generate story
    print("🎯 Generating story: 'implement password reset' under parent 2000")
    
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "generate_story_with_context",
            "arguments": {
                "feature_description": "implement password reset",
                "parentId": 2000
            }
        }
    }
    
    # Run MCP server
    proc = subprocess.Popen(
        ['node', 'mcp-server/aipm-server.js'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Send request
    stdout, stderr = proc.communicate(input=json.dumps(request) + '\n', timeout=10)
    
    # Parse response
    try:
        # Find JSON response in output
        for line in stdout.split('\n'):
            if line.strip().startswith('{'):
                response = json.loads(line)
                if 'result' in response:
                    data = json.loads(response['result']['content'][0]['text'])
                    
                    print("\n📊 Results:")
                    print(f"   Story ID: {data['story']['id']}")
                    print(f"   Title: {data['story']['title']}")
                    print(f"   Story Points: {data['story']['storyPoint']}")
                    print(f"   Components: {', '.join(data['story']['components'])}")
                    print(f"   Status: {data['story']['status']}")
                    print(f"\n   Context:")
                    print(f"   - Parent: {data['context']['parent']['title']}")
                    print(f"   - Similar stories: {len(data['context']['similarStories'])}")
                    print(f"   - Reasoning: {data['context']['reasoning']}")
                    print(f"\n   Acceptance Test Created:")
                    print(f"   - Given: {', '.join(data['acceptanceTest']['given'])}")
                    print(f"   - When: {', '.join(data['acceptanceTest']['whenStep'])}")
                    print(f"   - Then: {', '.join(data['acceptanceTest']['thenStep'])}")
                    
                    print("\n✅ Test passed!")
                    return 0
                    
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print(f"stdout: {stdout}")
        print(f"stderr: {stderr}")
        return 1
    
    print("\n❌ No valid response received")
    return 1

if __name__ == '__main__':
    sys.exit(test_mcp())
