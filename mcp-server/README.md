# AIPM MCP Server

MCP (Model Context Protocol) server that exposes AIPM functionality to AI assistants.

## Features

The AIPM MCP server provides these tools:

### Story Management
- `get_all_stories` - Get all user stories
- `get_story` - Get a specific story by ID (includes acceptance tests)
- `create_story` - Create a new user story
- `query_stories_by_component` - Query stories by component
- `get_story_hierarchy` - Get the full story hierarchy tree

### Acceptance Tests
- `get_acceptance_tests` - Get acceptance tests for a story
- `create_acceptance_test` - Create a new acceptance test

## Installation

```bash
cd mcp-server
npm install
chmod +x aipm-server.js
```

## Configuration

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/path/to/aipm/mcp-server/aipm-server.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "your-key",
        "AWS_SECRET_ACCESS_KEY": "your-secret"
      }
    }
  }
}
```

### For Kiro CLI

Add to your Kiro CLI config:

```json
{
  "mcpServers": {
    "aipm": {
      "command": "node",
      "args": ["/path/to/aipm/mcp-server/aipm-server.js"]
    }
  }
}
```

## Usage Examples

Once configured, you can use these tools from any MCP client:

### Get All Stories
```
AI: Use get_all_stories to show me all user stories
```

### Get Specific Story
```
AI: Use get_story with storyId 101 to show me that story's details
```

### Create Story
```
AI: Use create_story to create a new story:
- title: "User Login"
- asA: "user"
- iWant: "to log in securely"
- soThat: "I can access my account"
- parentId: 1000
```

### Create Acceptance Test
```
AI: Use create_acceptance_test for story 101:
- given: ["User is on login page"]
- when: ["User enters valid credentials", "User clicks login"]
- then: ["User sees dashboard"]
```

### Query by Component
```
AI: Use query_stories_by_component with component "System" to find all system stories
```

### Get Hierarchy
```
AI: Use get_story_hierarchy to show me the full story tree
```

## Architecture

```
AI Assistant (Claude, Kiro, etc.)
       ↓
   MCP Protocol
       ↓
AIPM MCP Server (aipm-server.js)
       ↓
   AWS DynamoDB
       ↓
AIPM Tables (stories, acceptance-tests)
```

## Tools Reference

### get_all_stories
Returns all stories from DynamoDB.

**Input:** None

**Output:** Array of story objects

### get_story
Returns a specific story with its acceptance tests.

**Input:**
- `storyId` (number): Story ID

**Output:** Story object with acceptanceTests array

### create_story
Creates a new user story.

**Input:**
- `title` (string): Story title
- `asA` (string): User role
- `iWant` (string): User goal
- `soThat` (string): User benefit
- `parentId` (number, optional): Parent story ID
- `storyPoint` (number, optional): Story points

**Output:** Created story object with ID

### get_acceptance_tests
Returns all acceptance tests for a story.

**Input:**
- `storyId` (number): Story ID

**Output:** Array of test objects

### create_acceptance_test
Creates a new acceptance test.

**Input:**
- `storyId` (number): Story ID
- `given` (array): Given steps
- `when` (array): When steps
- `then` (array): Then steps

**Output:** Created test object with ID

### query_stories_by_component
Queries stories by component.

**Input:**
- `component` (string): Component name

**Output:** Array of matching stories

### generate_story_with_context
Generates a user story with AI context analysis.

**Input:**
- `feature_description` (string): Description of the feature
- `parentId` (number): Parent story ID

**Output:** Story object with context analysis

**Context Analysis:**
- Finds similar stories by keyword matching
- Calculates average story points from similar stories
- Suggests components based on similar stories
- Generates basic acceptance test
- Provides reasoning for estimates

**Example:**
```
AI: Use generate_story_with_context:
- feature_description: "implement password reset"
- parentId: 2000
```

Returns story with:
- Estimated story points (from similar stories)
- Suggested components (from similar stories)
- Basic acceptance test
- Context explanation

## Environment Variables

- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

## Testing

Test the server directly:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node aipm-server.js
```

## Troubleshooting

**Server not starting:**
- Check AWS credentials are set
- Verify DynamoDB tables exist
- Check Node.js version (18+)

**Tools not appearing:**
- Restart your MCP client
- Check config file syntax
- Verify file paths are absolute

**Permission errors:**
- Ensure AWS credentials have DynamoDB access
- Check IAM permissions for tables

## Security

- Never commit AWS credentials
- Use IAM roles when possible
- Restrict DynamoDB permissions to minimum required
- Run server with least privilege

## License

Same as AIPM project
