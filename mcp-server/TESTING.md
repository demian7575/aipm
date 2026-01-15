# Testing MCP-Enhanced Story Generation

## Method 1: Quick Test (Check if it works)

```bash
# Count stories before
aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT --region us-east-1 | jq '.Count'

# Use the tool via echo/pipe (simple test)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_story_with_context","arguments":{"feature_description":"implement password reset","parentId":2000}}}' | \
  timeout 10 node mcp-server/aipm-server.js 2>&1 | \
  grep -o '"id":[0-9]*' | head -1

# Count stories after
aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT --region us-east-1 | jq '.Count'

# If count increased by 1, it worked!
```

## Method 2: Verify in DynamoDB

```bash
# Get the most recent story (highest ID)
aws dynamodb scan \
  --table-name aipm-backend-prod-stories \
  --region us-east-1 | \
  jq -r '.Items | sort_by(.id.N | tonumber) | .[-1] | {
    id: .id.N,
    title: .title.S,
    storyPoint: .storyPoint.N,
    components: .components.L
  }'
```

## Method 3: Use from Claude Desktop

1. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/repo/ebaejun/tools/aws/aipm/mcp-server/aipm-server.js"]
    }
  }
}
```

2. **Restart Claude Desktop**

3. **Test in Claude:**

```
User: "Use the generate_story_with_context tool to create a story for 
'implement password reset' under parent 2000"

Claude will:
- Call the MCP tool
- Create the story in DynamoDB
- Show you the results with context
```

## Method 4: Use from Kiro CLI

1. **Configure Kiro CLI:**

Add to `~/.kiro/config.json`:

```json
{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/repo/ebaejun/tools/aws/aipm/mcp-server/aipm-server.js"]
    }
  }
}
```

2. **Test:**

```bash
kiro-cli chat

# Then in Kiro:
"Use the AIPM MCP server to generate a story for 'implement two-factor auth' 
under parent 2000"
```

## Method 5: Direct Node.js Test

```javascript
// test-direct.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Count before
const before = await dynamodb.send(new ScanCommand({
  TableName: 'aipm-backend-prod-stories',
  Select: 'COUNT'
}));

console.log('Stories before:', before.Count);

// Run MCP tool (it creates story directly in DynamoDB)
// ... tool execution ...

// Count after
const after = await dynamodb.send(new ScanCommand({
  TableName: 'aipm-backend-prod-stories',
  Select: 'COUNT'
}));

console.log('Stories after:', after.Count);
console.log('New stories:', after.Count - before.Count);
```

## Method 6: Manual Test

```bash
# 1. Get current story count
BEFORE=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT --region us-east-1 | jq '.Count')
echo "Stories before: $BEFORE"

# 2. Run the tool manually
cd /repo/ebaejun/tools/aws/aipm
node -e "
import('./mcp-server/aipm-server.js').then(() => {
  // Tool will create story when called
  console.log('Tool loaded');
});
"

# 3. Check if story was created
AFTER=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT --region us-east-1 | jq '.Count')
echo "Stories after: $AFTER"
echo "Difference: $((AFTER - BEFORE))"
```

## Expected Results

When the tool works correctly, you should see:

```json
{
  "story": {
    "id": 1768468234567,
    "title": "Implement Password Reset",
    "asA": "user",
    "iWant": "to implement password reset",
    "soThat": "I can accomplish my goals",
    "storyPoint": 5,
    "components": ["System", "Security"],
    "status": "Draft"
  },
  "acceptanceTest": {
    "id": 1768468234568,
    "storyId": 1768468234567,
    "given": ["User has access to UX & Collaboration"],
    "whenStep": ["User initiates implement password reset"],
    "thenStep": ["The implement password reset is completed successfully"],
    "status": "Draft"
  },
  "context": {
    "parent": {
      "id": 2000,
      "title": "UX & Collaboration"
    },
    "similarStories": [
      {"id": 124, "title": "User Login"},
      {"id": 125, "title": "User Registration"}
    ],
    "suggestedComponents": ["System", "Security"],
    "estimatedPoints": 5,
    "reasoning": "Based on 2 similar stories with average 5 points"
  }
}
```

## Troubleshooting

**If tool doesn't work:**

1. Check AWS credentials:
```bash
aws sts get-caller-identity
```

2. Check DynamoDB access:
```bash
aws dynamodb describe-table --table-name aipm-backend-prod-stories --region us-east-1
```

3. Check MCP server starts:
```bash
node mcp-server/aipm-server.js
# Should print: "AIPM MCP Server running on stdio"
```

4. Check tool is registered:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node mcp-server/aipm-server.js 2>&1 | \
  grep "generate_story_with_context"
```
