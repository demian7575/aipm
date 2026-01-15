#!/usr/bin/env node

/**
 * Test MCP-enhanced story generation
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  console.log('🧪 Testing MCP-enhanced story generation...\n');

  // Start MCP server
  const serverProcess = spawn('node', ['./mcp-server/aipm-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const transport = new StdioClientTransport({
    reader: serverProcess.stdout,
    writer: serverProcess.stdin
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List tools
    console.log('📋 Test 1: List available tools');
    const tools = await client.request({
      method: 'tools/list',
      params: {}
    });
    
    const storyGenTool = tools.tools.find(t => t.name === 'generate_story_with_context');
    if (storyGenTool) {
      console.log(`✅ Found tool: ${storyGenTool.name}`);
      console.log(`   Description: ${storyGenTool.description}\n`);
    } else {
      console.log('❌ Tool not found\n');
      process.exit(1);
    }

    // Test 2: Generate story
    console.log('🎯 Test 2: Generate story with context');
    console.log('   Feature: "implement password reset"');
    console.log('   Parent: 2000 (UX & Collaboration)\n');
    
    const result = await client.request({
      method: 'tools/call',
      params: {
        name: 'generate_story_with_context',
        arguments: {
          feature_description: 'implement password reset',
          parentId: 2000
        }
      }
    });

    const data = JSON.parse(result.content[0].text);
    
    console.log('📊 Results:');
    console.log(`   Story ID: ${data.story.id}`);
    console.log(`   Title: ${data.story.title}`);
    console.log(`   Story Points: ${data.story.storyPoint}`);
    console.log(`   Components: ${data.story.components.join(', ')}`);
    console.log(`   Status: ${data.story.status}`);
    console.log(`\n   Context:`);
    console.log(`   - Parent: ${data.context.parent.title}`);
    console.log(`   - Similar stories: ${data.context.similarStories.length}`);
    console.log(`   - Reasoning: ${data.context.reasoning}`);
    console.log(`\n   Acceptance Test:`);
    console.log(`   - Given: ${data.acceptanceTest.given.join(', ')}`);
    console.log(`   - When: ${data.acceptanceTest.whenStep.join(', ')}`);
    console.log(`   - Then: ${data.acceptanceTest.thenStep.join(', ')}`);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    serverProcess.kill();
  }
}

test();
