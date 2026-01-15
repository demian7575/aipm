# AIPM MCP Server - End-to-End Workflow & Architecture

## System Architecture Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI ASSISTANT CLIENTS                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Claude     │  │  Kiro CLI    │  │   Cursor     │  │   Custom     │   │
│  │   Desktop    │  │              │  │              │  │   Client     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                    │                                        │
│                          MCP Protocol (stdio)                               │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AIPM MCP SERVER                                     │
│                      (mcp-server/aipm-server.js)                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ MCP Protocol Handler                                                  │ │
│  │  - tools/list: List available tools                                   │ │
│  │  - tools/call: Execute tool requests                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Tool Implementations                                                  │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│  │  │ Story Tools     │  │ Test Tools      │  │ Query Tools     │      │ │
│  │  │ - get_all       │  │ - get_tests     │  │ - by_component  │      │ │
│  │  │ - get_story     │  │ - create_test   │  │ - hierarchy     │      │ │
│  │  │ - create_story  │  │                 │  │                 │      │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ AWS SDK Integration                                                   │ │
│  │  - DynamoDBClient                                                     │ │
│  │  - DynamoDBDocumentClient                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ AWS SDK API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS DYNAMODB                                       │
│                          Region: us-east-1                                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ aipm-backend-prod-stories                                             │ │
│  │  - Primary Key: id (Number)                                           │ │
│  │  - Attributes: title, asA, iWant, soThat, parentId, status, etc.     │ │
│  │  - 68 stories (5 roots + 18 branches + 44 leaves + 1 feature)        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ aipm-backend-prod-acceptance-tests                                    │ │
│  │  - Primary Key: id (Number)                                           │ │
│  │  - GSI: storyId-index (storyId)                                       │ │
│  │  - Attributes: storyId, given, whenStep, thenStep, status            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                          END-TO-END WORKFLOWS
═══════════════════════════════════════════════════════════════════════════════

## Workflow 1: Get All Stories

┌─────────────┐
│ AI Client   │
│ (Claude)    │
└──────┬──────┘
       │ User: "Show me all user stories"
       │
       ▼
┌─────────────┐
│ AI Assistant│
│ (Claude)    │
└──────┬──────┘
       │ Decision: Use get_all_stories tool
       │
       ▼
┌─────────────┐
│ MCP Client  │
│ (Claude)    │
└──────┬──────┘
       │ MCP Request:
       │ {
       │   "method": "tools/call",
       │   "params": {
       │     "name": "get_all_stories",
       │     "arguments": {}
       │   }
       │ }
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Handle tools/call request
       │ Route to get_all_stories handler
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ ScanCommand({
       │   TableName: 'aipm-backend-prod-stories'
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Return all 68 stories
       │ [{id: 1000, title: "WorkModel & Data", ...}, ...]
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Format response:
       │ {
       │   "content": [{
       │     "type": "text",
       │     "text": JSON.stringify(stories)
       │   }]
       │ }
       ▼
┌─────────────┐
│ MCP Client  │
│ (Claude)    │
└──────┬──────┘
       │ Receive story data
       │ Parse JSON
       ▼
┌─────────────┐
│ AI Assistant│
│ (Claude)    │
└──────┬──────┘
       │ Process data
       │ Generate human-readable response
       ▼
┌─────────────┐
│ User        │
│ Interface   │
└─────────────┘
       Display: "Here are all 68 user stories:
                 1. WorkModel & Data (root)
                    - Data Model Management (branch)
                      - Define story schema (leaf)
                 ..."


## Workflow 2: Create User Story

┌─────────────┐
│ AI Client   │
│ (Kiro CLI)  │
└──────┬──────┘
       │ User: "Create a story for user authentication"
       │
       ▼
┌─────────────┐
│ AI Assistant│
│ (Kiro)      │
└──────┬──────┘
       │ Decision: Use create_story tool
       │ Extract parameters from user request
       ▼
┌─────────────┐
│ MCP Client  │
│ (Kiro CLI)  │
└──────┬──────┘
       │ MCP Request:
       │ {
       │   "method": "tools/call",
       │   "params": {
       │     "name": "create_story",
       │     "arguments": {
       │       "title": "User Authentication",
       │       "asA": "user",
       │       "iWant": "to log in securely",
       │       "soThat": "I can access my account",
       │       "parentId": 2000,
       │       "storyPoint": 5
       │     }
       │   }
       │ }
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Handle tools/call request
       │ Route to create_story handler
       │ Generate storyId: Date.now() = 1768467123456
       │ Build story object
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ PutCommand({
       │   TableName: 'aipm-backend-prod-stories',
       │   Item: {
       │     id: 1768467123456,
       │     title: "User Authentication",
       │     asA: "user",
       │     iWant: "to log in securely",
       │     soThat: "I can access my account",
       │     description: "As a user, I want to log in...",
       │     parentId: 2000,
       │     storyPoint: 5,
       │     status: "Draft",
       │     components: [],
       │     createdAt: "2026-01-15T14:05:23.456Z",
       │     updatedAt: "2026-01-15T14:05:23.456Z"
       │   }
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Story created successfully
       │ Return success
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Format response:
       │ {
       │   "content": [{
       │     "type": "text",
       │     "text": "Story created successfully with ID: 1768467123456\n\n{...}"
       │   }]
       │ }
       ▼
┌─────────────┐
│ MCP Client  │
│ (Kiro CLI)  │
└──────┬──────┘
       │ Receive confirmation
       ▼
┌─────────────┐
│ AI Assistant│
│ (Kiro)      │
└──────┬──────┘
       │ Generate response
       ▼
┌─────────────┐
│ User        │
│ Terminal    │
└─────────────┘
       Display: "✅ Created user story 'User Authentication' 
                 with ID 1768467123456 under parent 2000 
                 (UX & Collaboration)"


## Workflow 3: Get Story with Acceptance Tests

┌─────────────┐
│ AI Client   │
│ (Custom)    │
└──────┬──────┘
       │ API Call: getStoryDetails(101)
       │
       ▼
┌─────────────┐
│ MCP Client  │
│ (Custom)    │
└──────┬──────┘
       │ MCP Request:
       │ {
       │   "method": "tools/call",
       │   "params": {
       │     "name": "get_story",
       │     "arguments": {
       │       "storyId": 101
       │     }
       │   }
       │ }
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Handle tools/call request
       │ Route to get_story handler
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ Step 1: GetCommand({
       │   TableName: 'aipm-backend-prod-stories',
       │   Key: { id: 101 }
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Return story:
       │ {
       │   id: 101,
       │   title: "Create User Story",
       │   asA: "product manager",
       │   ...
       │ }
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ Step 2: QueryCommand({
       │   TableName: 'aipm-backend-prod-acceptance-tests',
       │   IndexName: 'storyId-index',
       │   KeyConditionExpression: 'storyId = :sid',
       │   ExpressionAttributeValues: { ':sid': 101 }
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Return tests:
       │ [
       │   {
       │     id: 1001,
       │     storyId: 101,
       │     given: ["I am in the AIPM workspace"],
       │     whenStep: ["I submit a new story"],
       │     thenStep: ["the story is persisted"],
       │     status: "Pass"
       │   }
       │ ]
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Merge story + tests:
       │ story.acceptanceTests = tests
       │ Format response
       ▼
┌─────────────┐
│ MCP Client  │
│ (Custom)    │
└──────┬──────┘
       │ Receive complete story data
       │ Parse JSON
       ▼
┌─────────────┐
│ Application │
│ Logic       │
└──────┬──────┘
       │ Process data
       │ Update UI
       ▼
┌─────────────┐
│ User        │
│ Interface   │
└─────────────┘
       Display: Story details with acceptance tests


## Workflow 4: Create Acceptance Test

┌─────────────┐
│ AI Client   │
│ (Claude)    │
└──────┬──────┘
       │ User: "Add a test for story 101: 
       │        Given user is logged in,
       │        When they create a story,
       │        Then it appears in the list"
       ▼
┌─────────────┐
│ AI Assistant│
│ (Claude)    │
└──────┬──────┘
       │ Decision: Use create_acceptance_test tool
       │ Parse GWT steps from user input
       ▼
┌─────────────┐
│ MCP Client  │
│ (Claude)    │
└──────┬──────┘
       │ MCP Request:
       │ {
       │   "method": "tools/call",
       │   "params": {
       │     "name": "create_acceptance_test",
       │     "arguments": {
       │       "storyId": 101,
       │       "given": ["User is logged in"],
       │       "when": ["User creates a story"],
       │       "then": ["Story appears in the list"]
       │     }
       │   }
       │ }
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Handle tools/call request
       │ Route to create_acceptance_test handler
       │ Generate testId: Date.now() = 1768467234567
       │ Build test object
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ PutCommand({
       │   TableName: 'aipm-backend-prod-acceptance-tests',
       │   Item: {
       │     id: 1768467234567,
       │     storyId: 101,
       │     given: ["User is logged in"],
       │     whenStep: ["User creates a story"],
       │     thenStep: ["Story appears in the list"],
       │     status: "Draft",
       │     createdAt: "2026-01-15T14:07:14.567Z",
       │     updatedAt: "2026-01-15T14:07:14.567Z"
       │   }
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Test created successfully
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Format response with test details
       ▼
┌─────────────┐
│ MCP Client  │
│ (Claude)    │
└──────┬──────┘
       │ Receive confirmation
       ▼
┌─────────────┐
│ AI Assistant│
│ (Claude)    │
└──────┬──────┘
       │ Generate response
       ▼
┌─────────────┐
│ User        │
│ Interface   │
└─────────────┘
       Display: "✅ Created acceptance test for story 101
                 Test ID: 1768467234567
                 Status: Draft"


## Workflow 5: Query Stories by Component

┌─────────────┐
│ AI Client   │
│ (Kiro CLI)  │
└──────┬──────┘
       │ User: "Show me all System component stories"
       │
       ▼
┌─────────────┐
│ AI Assistant│
│ (Kiro)      │
└──────┬──────┘
       │ Decision: Use query_stories_by_component tool
       ▼
┌─────────────┐
│ MCP Client  │
│ (Kiro CLI)  │
└──────┬──────┘
       │ MCP Request:
       │ {
       │   "method": "tools/call",
       │   "params": {
       │     "name": "query_stories_by_component",
       │     "arguments": {
       │       "component": "System"
       │     }
       │   }
       │ }
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Handle tools/call request
       │ Route to query_stories_by_component handler
       ▼
┌─────────────┐
│ AWS SDK     │
│ DynamoDB    │
└──────┬──────┘
       │ ScanCommand({
       │   TableName: 'aipm-backend-prod-stories',
       │   FilterExpression: 'contains(components, :comp)',
       │   ExpressionAttributeValues: {
       │     ':comp': 'System'
       │   }
       │ })
       ▼
┌─────────────┐
│ DynamoDB    │
│ Service     │
└──────┬──────┘
       │ Return matching stories:
       │ [
       │   {id: 101, title: "Create User Story", components: ["System"]},
       │   {id: 102, title: "Edit User Story", components: ["System"]},
       │   ...
       │ ]
       ▼
┌─────────────┐
│ AIPM MCP    │
│ Server      │
└──────┬──────┘
       │ Format response with filtered stories
       ▼
┌─────────────┐
│ MCP Client  │
│ (Kiro CLI)  │
└──────┬──────┘
       │ Receive story list
       ▼
┌─────────────┐
│ AI Assistant│
│ (Kiro)      │
└──────┬──────┘
       │ Generate formatted response
       ▼
┌─────────────┐
│ User        │
│ Terminal    │
└─────────────┘
       Display: "Found 15 stories with System component:
                 1. Create User Story (ID: 101)
                 2. Edit User Story (ID: 102)
                 ..."


═══════════════════════════════════════════════════════════════════════════════
                          DATA FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

Request Flow:
─────────────

User Input
    ↓
AI Assistant (Claude/Kiro/Custom)
    ↓ (interprets intent)
MCP Client
    ↓ (formats MCP request)
AIPM MCP Server
    ↓ (routes to tool handler)
AWS SDK
    ↓ (DynamoDB API call)
DynamoDB Tables
    ↓ (returns data)
AWS SDK
    ↓ (formats response)
AIPM MCP Server
    ↓ (wraps in MCP response)
MCP Client
    ↓ (parses response)
AI Assistant
    ↓ (generates human response)
User Interface


Response Flow:
──────────────

DynamoDB → AWS SDK → MCP Server → MCP Client → AI → User


═══════════════════════════════════════════════════════════════════════════════
                          CONFIGURATION EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

## Claude Desktop Configuration

File: ~/Library/Application Support/Claude/claude_desktop_config.json

{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/repo/ebaejun/tools/aws/aipm/mcp-server/aipm-server.js"],
      "env": {
        "AWS_REGION": "us-east-1"
      }
    }
  }
}

## Kiro CLI Configuration

File: ~/.kiro/config.json

{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/repo/ebaejun/tools/aws/aipm/mcp-server/aipm-server.js"]
    }
  }
}

## Custom Application

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

const serverProcess = spawn('node', [
  '/repo/ebaejun/tools/aws/aipm/mcp-server/aipm-server.js'
]);

const transport = new StdioClientTransport({
  command: serverProcess
});

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// Use tools
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'get_all_stories',
    arguments: {}
  }
});


═══════════════════════════════════════════════════════════════════════════════
                          SECURITY & PERMISSIONS
═══════════════════════════════════════════════════════════════════════════════

Required AWS Permissions:
─────────────────────────

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-prod-stories",
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-prod-acceptance-tests",
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-prod-acceptance-tests/index/storyId-index"
      ]
    }
  ]
}


═══════════════════════════════════════════════════════════════════════════════
                          PERFORMANCE CHARACTERISTICS
═══════════════════════════════════════════════════════════════════════════════

Operation Performance:
──────────────────────

get_all_stories:           ~200-500ms (Scan 68 items)
get_story:                 ~100-200ms (GetItem + Query)
create_story:              ~50-100ms (PutItem)
get_acceptance_tests:      ~50-150ms (Query with GSI)
create_acceptance_test:    ~50-100ms (PutItem)
query_stories_by_component: ~200-500ms (Scan with filter)
get_story_hierarchy:       ~200-500ms (Scan + build tree)

Bottlenecks:
────────────
- Scan operations (get_all_stories, query_by_component)
- Network latency to DynamoDB
- JSON serialization/deserialization

Optimizations:
──────────────
- Use Query instead of Scan where possible
- Add GSI for component queries
- Cache frequently accessed data
- Batch operations when possible
