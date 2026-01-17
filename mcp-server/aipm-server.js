#!/usr/bin/env node

/**
 * AIPM MCP Server
 * Exposes AIPM functionality as MCP tools for use by AI assistants
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

const server = new Server({
  name: 'aipm-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// List available tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'get_all_stories',
      description: 'Get all user stories from AIPM with hierarchy',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_story',
      description: 'Get a specific user story by ID',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: {
            type: 'number',
            description: 'Story ID'
          }
        },
        required: ['storyId']
      }
    },
    {
      name: 'create_story',
      description: 'Create a new user story',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Story title' },
          asA: { type: 'string', description: 'As a (role)' },
          iWant: { type: 'string', description: 'I want (goal)' },
          soThat: { type: 'string', description: 'So that (benefit)' },
          parentId: { type: 'number', description: 'Parent story ID (optional)' },
          storyPoint: { type: 'number', description: 'Story points (optional)' }
        },
        required: ['title', 'asA', 'iWant', 'soThat']
      }
    },
    {
      name: 'get_acceptance_tests',
      description: 'Get acceptance tests for a story',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: {
            type: 'number',
            description: 'Story ID'
          }
        },
        required: ['storyId']
      }
    },
    {
      name: 'create_acceptance_test',
      description: 'Create an acceptance test for a story',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'number', description: 'Story ID' },
          given: { type: 'array', items: { type: 'string' }, description: 'Given steps' },
          when: { type: 'array', items: { type: 'string' }, description: 'When steps' },
          then: { type: 'array', items: { type: 'string' }, description: 'Then steps' }
        },
        required: ['storyId', 'given', 'when', 'then']
      }
    },
    {
      name: 'query_stories_by_component',
      description: 'Query stories by component',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'Component name (e.g., System, WorkModel, DocumentIntelligence)'
          }
        },
        required: ['component']
      }
    },
    {
      name: 'get_story_hierarchy',
      description: 'Get the full story hierarchy tree',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'generate_story_with_context',
      description: 'Generate a user story with AI context analysis',
      inputSchema: {
        type: 'object',
        properties: {
          feature_description: {
            type: 'string',
            description: 'Description of the feature to implement'
          },
          parentId: {
            type: 'number',
            description: 'Parent story ID'
          }
        },
        required: ['feature_description', 'parentId']
      }
    },
    {
      name: 'git_prepare_branch',
      description: 'Prepare git branch for code generation: fetch, checkout, and rebase. Returns branch status.',
      inputSchema: {
        type: 'object',
        properties: {
          branchName: {
            type: 'string',
            description: 'Branch name to prepare (e.g., feature/story-123)'
          }
        },
        required: ['branchName']
      }
    },
    {
      name: 'git_commit_and_push',
      description: 'Commit all changes and push to remote branch',
      inputSchema: {
        type: 'object',
        properties: {
          branchName: {
            type: 'string',
            description: 'Branch name to push to'
          },
          commitMessage: {
            type: 'string',
            description: 'Commit message'
          }
        },
        required: ['branchName', 'commitMessage']
      }
    }
  ]
}));

// Handle tool execution
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_all_stories': {
        const { Items } = await dynamodb.send(new ScanCommand({
          TableName: STORIES_TABLE
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(Items, null, 2)
          }]
        };
      }

      case 'get_story': {
        const { Item } = await dynamodb.send(new GetCommand({
          TableName: STORIES_TABLE,
          Key: { id: args.storyId }
        }));
        
        if (!Item) {
          return {
            content: [{
              type: 'text',
              text: `Story ${args.storyId} not found`
            }],
            isError: true
          };
        }

        // Get acceptance tests
        const { Items: tests } = await dynamodb.send(new QueryCommand({
          TableName: TESTS_TABLE,
          IndexName: 'storyId-index',
          KeyConditionExpression: 'storyId = :sid',
          ExpressionAttributeValues: { ':sid': args.storyId }
        }));

        Item.acceptanceTests = tests || [];

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(Item, null, 2)
          }]
        };
      }

      case 'create_story': {
        const storyId = Date.now();
        const story = {
          id: storyId,
          title: args.title,
          asA: args.asA,
          iWant: args.iWant,
          soThat: args.soThat,
          description: `As a ${args.asA}, I want ${args.iWant} so that ${args.soThat}`,
          parentId: args.parentId || null,
          storyPoint: args.storyPoint || 0,
          status: 'Draft',
          components: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamodb.send(new PutCommand({
          TableName: STORIES_TABLE,
          Item: story
        }));

        return {
          content: [{
            type: 'text',
            text: `Story created successfully with ID: ${storyId}\n\n${JSON.stringify(story, null, 2)}`
          }]
        };
      }

      case 'get_acceptance_tests': {
        const { Items: tests } = await dynamodb.send(new QueryCommand({
          TableName: TESTS_TABLE,
          IndexName: 'storyId-index',
          KeyConditionExpression: 'storyId = :sid',
          ExpressionAttributeValues: { ':sid': args.storyId }
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(tests || [], null, 2)
          }]
        };
      }

      case 'create_acceptance_test': {
        const testId = Date.now();
        const test = {
          id: testId,
          storyId: args.storyId,
          given: args.given,
          whenStep: args.when,
          thenStep: args.then,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamodb.send(new PutCommand({
          TableName: TESTS_TABLE,
          Item: test
        }));

        return {
          content: [{
            type: 'text',
            text: `Acceptance test created successfully with ID: ${testId}\n\n${JSON.stringify(test, null, 2)}`
          }]
        };
      }

      case 'query_stories_by_component': {
        const { Items } = await dynamodb.send(new ScanCommand({
          TableName: STORIES_TABLE,
          FilterExpression: 'contains(components, :comp)',
          ExpressionAttributeValues: {
            ':comp': args.component
          }
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(Items || [], null, 2)
          }]
        };
      }

      case 'get_story_hierarchy': {
        const { Items: stories } = await dynamodb.send(new ScanCommand({
          TableName: STORIES_TABLE
        }));

        // Build hierarchy
        const buildHierarchy = (items) => {
          const map = {};
          const roots = [];

          items.forEach(item => {
            map[item.id] = { ...item, children: [] };
          });

          items.forEach(item => {
            if (item.parentId && map[item.parentId]) {
              map[item.parentId].children.push(map[item.id]);
            } else {
              roots.push(map[item.id]);
            }
          });

          return roots;
        };

        const hierarchy = buildHierarchy(stories);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(hierarchy, null, 2)
          }]
        };
      }

      case 'generate_story_with_context': {
        const { feature_description, parentId } = args;
        
        // Step 1: Gather context
        const { Item: parent } = await dynamodb.send(new GetCommand({
          TableName: STORIES_TABLE,
          Key: { id: parentId }
        }));
        
        if (!parent) {
          return {
            content: [{
              type: 'text',
              text: `Parent story ${parentId} not found`
            }],
            isError: true
          };
        }
        
        // Get all stories to find similar ones
        const { Items: allStories } = await dynamodb.send(new ScanCommand({
          TableName: STORIES_TABLE
        }));
        
        // Find similar stories (simple keyword matching)
        const keywords = feature_description.toLowerCase().split(' ');
        const similarStories = allStories.filter(s => {
          const text = `${s.title} ${s.description}`.toLowerCase();
          return keywords.some(kw => text.includes(kw)) && s.id !== parentId;
        }).slice(0, 5);
        
        // Calculate average story points from similar stories
        const avgPoints = similarStories.length > 0
          ? Math.round(similarStories.reduce((sum, s) => sum + (s.storyPoint || 0), 0) / similarStories.length)
          : 3;
        
        // Extract common components
        const componentCounts = {};
        similarStories.forEach(s => {
          (s.components || []).forEach(c => {
            componentCounts[c] = (componentCounts[c] || 0) + 1;
          });
        });
        const suggestedComponents = Object.entries(componentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c]) => c);
        
        // Generate story with AI context
        const storyId = Date.now();
        const story = {
          id: storyId,
          title: feature_description.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          asA: parent.asA || 'user',
          iWant: `to ${feature_description}`,
          soThat: 'I can accomplish my goals',
          description: `As a ${parent.asA || 'user'}, I want to ${feature_description} so that I can accomplish my goals`,
          parentId: parentId,
          storyPoint: avgPoints,
          components: suggestedComponents,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Create story in DynamoDB
        await dynamodb.send(new PutCommand({
          TableName: STORIES_TABLE,
          Item: story
        }));
        
        // Generate basic acceptance test
        const testId = Date.now() + 1;
        const test = {
          id: testId,
          storyId: storyId,
          given: [`User has access to ${parent.title}`],
          whenStep: [`User initiates ${feature_description}`],
          thenStep: [`The ${feature_description} is completed successfully`],
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await dynamodb.send(new PutCommand({
          TableName: TESTS_TABLE,
          Item: test
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              story: story,
              acceptanceTest: test,
              context: {
                parent: { id: parent.id, title: parent.title },
                similarStories: similarStories.map(s => ({ id: s.id, title: s.title })),
                suggestedComponents: suggestedComponents,
                estimatedPoints: avgPoints,
                reasoning: `Based on ${similarStories.length} similar stories with average ${avgPoints} points`
              }
            }, null, 2)
          }]
        };
      }

      case 'git_prepare_branch': {
        const { branchName } = args;
        const { spawn } = await import('child_process');
        
        const execCommand = (cmd) => {
          return new Promise((resolve, reject) => {
            const [command, ...cmdArgs] = cmd.split(' ');
            const proc = spawn(command, cmdArgs, { cwd: process.cwd() });
            
            let output = '';
            proc.stdout.on('data', (data) => output += data.toString());
            proc.stderr.on('data', (data) => output += data.toString());
            
            proc.on('close', (code) => {
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(`Command failed: ${cmd}\n${output}`));
              }
            });
          });
        };
        
        try {
          // Clean up repository
          await execCommand('git reset --hard HEAD');
          await execCommand('git clean -fd');
          
          // Fetch latest changes
          await execCommand('git fetch origin');
          
          // Checkout branch
          await execCommand(`git checkout ${branchName}`);
          
          // Attempt rebase
          try {
            await execCommand('git rebase origin/main');
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  branch: branchName,
                  status: 'ready',
                  message: 'Branch prepared successfully and rebased to latest main'
                }, null, 2)
              }]
            };
          } catch (rebaseError) {
            // Abort failed rebase
            await execCommand('git rebase --abort');
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  branch: branchName,
                  status: 'conflict',
                  message: 'Rebase conflicts detected. New PR required.',
                  error: rebaseError.message
                }, null, 2)
              }]
            };
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                branch: branchName,
                status: 'error',
                message: 'Git operation failed',
                error: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }

      case 'git_commit_and_push': {
        const { branchName, commitMessage } = args;
        const { spawn } = await import('child_process');
        
        const execCommand = (cmd) => {
          return new Promise((resolve, reject) => {
            const [command, ...cmdArgs] = cmd.split(' ');
            const proc = spawn(command, cmdArgs, { cwd: process.cwd() });
            
            let output = '';
            proc.stdout.on('data', (data) => output += data.toString());
            proc.stderr.on('data', (data) => output += data.toString());
            
            proc.on('close', (code) => {
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(`Command failed: ${cmd}\n${output}`));
              }
            });
          });
        };
        
        try {
          // Add all changes
          await execCommand('git add .');
          
          // Commit with message
          await execCommand(`git commit -m "${commitMessage}"`);
          
          // Get commit hash
          const commitHash = (await execCommand('git rev-parse HEAD')).trim();
          
          // Push to remote
          await execCommand(`git push origin ${branchName}`);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                commitHash: commitHash,
                branch: branchName,
                message: 'Changes committed and pushed successfully'
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
                message: 'Git commit/push failed'
              }, null, 2)
            }],
            isError: true
          };
        }
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}\n\n${error.stack}`
      }],
      isError: true
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('AIPM MCP Server running on stdio');
