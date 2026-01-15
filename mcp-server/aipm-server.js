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
