# Kiro Protocol Improvement Proposal

## Current Architecture Issues

### Problem 1: Unstructured Request Signal
```javascript
// Current: Plain text prompt
stdin ─▶ "Enhance this user story:\n\nOriginal Idea: User login\n\nCurrent Draft:\n- Title: Implement login\n..."
```

**Issues**:
- Hard to parse and validate
- Difficult to extend with new fields
- No clear separation between data and instructions
- Prompts are embedded in code (hard to review/modify)

### Problem 2: Parsing Responsibility Confusion

**Current Flow**:
```
Kiro API → Kiro CLI → Kiro API (parse) → DynamoDB
          (prompt)    (text response)  (JSON.parse)
```

**Who parses?**
- Kiro CLI returns text (sometimes JSON in markdown)
- Kiro API must parse/extract JSON
- Fragile: depends on Kiro's output format

### Problem 3: Tight Coupling

Each endpoint has:
1. Custom prompt generator function
2. Custom response parser function
3. Hardcoded prompt templates in code

**Result**: Hard to extend, test, and maintain

---

## Proposed Architecture

### Improvement 1: Structured Request Signal

**Use JSON for data + separate prompt template**

```javascript
// Request structure
{
  "endpoint": "enhance-story",
  "data": {
    "idea": "User login feature",
    "draft": {
      "title": "Implement login",
      "description": "Add login page",
      "asA": "user",
      "iWant": "to login",
      "soThat": "I can access the system",
      "storyPoint": 5
    },
    "parent": {
      "title": "Authentication System"
    }
  },
  "promptTemplate": "enhance-story-v1"
}
```

**Send to Kiro CLI**:
```javascript
const request = {
  endpoint: 'enhance-story',
  data: payload,
  promptTemplate: 'enhance-story-v1'
};

// Kiro CLI receives structured JSON
stdin ─▶ JSON.stringify(request) + '\n'
```

### Improvement 2: Kiro CLI Returns Structured JSON

**Instruct Kiro to always return JSON**:

```javascript
// Prompt includes strict JSON instruction
const prompt = `
You are a structured API. You must ALWAYS respond with valid JSON only.

Task: ${request.endpoint}
Data: ${JSON.stringify(request.data, null, 2)}

${getPromptTemplate(request.promptTemplate)}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no code blocks.
Start your response with { and end with }
`;
```

**Kiro CLI Response**:
```javascript
stdout ◀─ '{"title":"Enhanced title","description":"Enhanced description",...}\x1b[38;5;141m> \x1b[0m'
```

**Benefits**:
- Kiro API can directly `JSON.parse()` the response
- No need for markdown extraction
- No need for custom parsers per endpoint
- Validation is straightforward

### Improvement 3: Externalized Prompt Templates

**Create prompt template registry**:

```javascript
// prompts/templates.json
{
  "enhance-story-v1": {
    "version": "1.0",
    "description": "Enhance user story with INVEST principles",
    "instruction": "Enhance this user story:\n\nOriginal Idea: {{data.idea}}\n\nCurrent Draft:\n- Title: {{data.draft.title}}\n- Description: {{data.draft.description}}\n- As a: {{data.draft.asA}}\n- I want: {{data.draft.iWant}}\n- So that: {{data.draft.soThat}}\n- Story Points: {{data.draft.storyPoint}}\n\nParent Context: {{data.parent.title || 'None'}}\n\nProvide enhanced version with:\n1. Better, more specific title\n2. Clearer description\n3. More precise 'I want' statement\n4. Better 'So that' with business value\n5. Improved acceptance criteria",
    "outputSchema": {
      "type": "object",
      "required": ["title", "description", "asA", "iWant", "soThat", "acceptanceCriteria"],
      "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "asA": {"type": "string"},
        "iWant": {"type": "string"},
        "soThat": {"type": "string"},
        "acceptanceCriteria": {"type": "array", "items": {"type": "string"}}
      }
    }
  },
  
  "generate-acceptance-test-v1": {
    "version": "1.0",
    "description": "Generate acceptance test for user story",
    "instruction": "Generate acceptance test:\n\nStory: {{data.story.title}}\nDescription: {{data.story.description}}\nAs a: {{data.story.asA}}\nI want: {{data.story.iWant}}\nSo that: {{data.story.soThat}}\n\nTest Number: {{data.ordinal}}\nReason: {{data.reason}}\nContext: {{data.idea || 'None'}}\n\nCreate comprehensive test with:\n1. Clear Given conditions\n2. Specific When actions\n3. Measurable Then outcomes",
    "outputSchema": {
      "type": "object",
      "required": ["title", "given", "when", "then"],
      "properties": {
        "title": {"type": "string"},
        "given": {"type": "array", "items": {"type": "string"}},
        "when": {"type": "array", "items": {"type": "string"}},
        "then": {"type": "array", "items": {"type": "string"}}
      }
    }
  },
  
  "analyze-invest-v1": {
    "version": "1.0",
    "description": "Analyze story against INVEST criteria",
    "instruction": "Analyze against INVEST:\n\nTitle: {{data.title}}\nAs a: {{data.asA}}\nI want: {{data.iWant}}\nSo that: {{data.soThat}}\nDescription: {{data.description}}\nStory Points: {{data.storyPoint}}\nComponents: {{data.components.join(', ') || 'None'}}\n\nEvaluate:\n- Independent: Can be developed independently?\n- Negotiable: Scope flexible?\n- Valuable: Clear business value?\n- Estimable: Effort estimable?\n- Small: Appropriately sized?\n- Testable: Can define acceptance criteria?",
    "outputSchema": {
      "type": "object",
      "required": ["score", "summary", "criteria"],
      "properties": {
        "score": {"type": "number", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "warnings": {"type": "array", "items": {"type": "string"}},
        "suggestions": {"type": "array", "items": {"type": "string"}},
        "criteria": {
          "type": "object",
          "required": ["independent", "negotiable", "valuable", "estimable", "small", "testable"],
          "properties": {
            "independent": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}},
            "negotiable": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}},
            "valuable": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}},
            "estimable": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}},
            "small": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}},
            "testable": {"type": "object", "properties": {"pass": {"type": "boolean"}, "feedback": {"type": "string"}}}
          }
        }
      }
    }
  }
}
```

---

## Improved Implementation

### New Kiro API Server Structure

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load prompt templates
const PROMPT_TEMPLATES = JSON.parse(
  readFileSync(join(__dirname, 'prompts/templates.json'), 'utf-8')
);

// Generic handler for all endpoints
if (req.url.startsWith('/kiro/') && req.method === 'POST') {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const endpoint = req.url.split('/')[2];
      
      // Build structured request
      const request = {
        endpoint: endpoint,
        data: payload,
        promptTemplate: `${endpoint}-v1`
      };
      
      // Get template
      const template = PROMPT_TEMPLATES[request.promptTemplate];
      if (!template) {
        throw new Error(`Unknown template: ${request.promptTemplate}`);
      }
      
      // Render prompt with data
      const prompt = renderPrompt(template, request.data);
      
      // Add strict JSON instruction
      const fullPrompt = `
You are a structured API. Respond with ONLY valid JSON.

${prompt}

Output Schema:
${JSON.stringify(template.outputSchema, null, 2)}

CRITICAL: Return ONLY valid JSON matching the schema above.
No markdown, no code blocks, no explanations.
Start with { and end with }
`;
      
      console.log(`📝 Processing ${endpoint}:`, request);
      
      // Send to Kiro CLI
      const result = await kiroQueue.sendCommand(fullPrompt);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Parse JSON response
      const response = parseKiroResponse(result.output, template.outputSchema);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      
    } catch (error) {
      console.error(`❌ ${req.url} error:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, success: false }));
    }
  });
  return;
}

// Template renderer (simple string replacement)
function renderPrompt(template, data) {
  let prompt = template.instruction;
  
  // Replace {{data.field}} with actual values
  prompt = prompt.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined ? value : '';
  });
  
  return prompt;
}

function getNestedValue(obj, path) {
  // Handle paths like "data.draft.title"
  const parts = path.split('.');
  let current = { data: obj };
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  
  return current;
}

// Generic JSON parser with validation
function parseKiroResponse(output, schema) {
  // Extract JSON (handle markdown code blocks if present)
  let jsonStr = output.trim();
  
  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // Find JSON object boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON object found in response');
  }
  
  jsonStr = jsonStr.substring(startIdx, endIdx + 1);
  
  // Parse JSON
  const parsed = JSON.parse(jsonStr);
  
  // Validate against schema (basic validation)
  validateSchema(parsed, schema);
  
  return {
    ...parsed,
    success: true,
    source: 'kiro-structured'
  };
}

function validateSchema(data, schema) {
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
  
  // Add more validation as needed
  return true;
}
```

---

## Benefits of Proposed Architecture

### 1. Generalized Interface

**Before**:
```javascript
// Add new endpoint = write 2 functions
function generateNewFeaturePrompt(payload) { ... }
function parseNewFeatureResponse(result, payload) { ... }
```

**After**:
```json
// Add new endpoint = add JSON template
{
  "new-feature-v1": {
    "instruction": "...",
    "outputSchema": { ... }
  }
}
```

### 2. Easy to Review

**Prompts are data, not code**:
- Version controlled JSON files
- Diff-friendly
- Non-developers can review/edit
- A/B testing different prompts

### 3. Easy to Extend

**Add new endpoint**:
1. Add template to `prompts/templates.json`
2. Done! No code changes needed

**Modify existing prompt**:
1. Edit template JSON
2. Increment version (`v1` → `v2`)
3. Deploy without code changes

### 4. Better Parsing

**Kiro CLI returns structured JSON**:
- Single generic parser
- Schema validation
- Type safety
- Error messages reference schema

### 5. Clearer Responsibility

```
┌─────────────┐
│  Kiro API   │ ─── Manages: Request routing, template rendering, validation
└─────────────┘
       │
       │ JSON request
       ▼
┌─────────────┐
│  Kiro CLI   │ ─── Manages: AI processing, tool execution, JSON generation
└─────────────┘
       │
       │ JSON response
       ▼
┌─────────────┐
│  Kiro API   │ ─── Manages: Parsing, validation, DynamoDB storage
└─────────────┘
       │
       │ REST API
       ▼
┌─────────────┐
│  DynamoDB   │
└─────────────┘
```

**Clear separation**:
- Kiro API: Orchestration, validation, storage
- Kiro CLI: AI processing, structured output
- No parsing ambiguity

---

## Migration Path

### Phase 1: Add Structured Request (Backward Compatible)

```javascript
// Support both old and new formats
if (req.url.startsWith('/kiro/v2/')) {
  // New structured format
  handleStructuredRequest(req, res);
} else if (req.url.startsWith('/kiro/')) {
  // Old format (existing code)
  handleLegacyRequest(req, res);
}
```

### Phase 2: Externalize Prompts

```javascript
// Move prompts to JSON files
// Keep old functions as fallback
const template = PROMPT_TEMPLATES[templateName] || generateLegacyPrompt(endpoint);
```

### Phase 3: Enforce JSON Responses

```javascript
// Add strict JSON instruction to all prompts
const prompt = `${basePrompt}\n\nCRITICAL: Return ONLY valid JSON.`;
```

### Phase 4: Deprecate Legacy

```javascript
// Remove old prompt generator functions
// Remove old parser functions
// Use only structured format
```

---

## Example: Adding New Endpoint

### Current (Complex)

```javascript
// 1. Add prompt generator
function generateNewFeaturePrompt(payload) {
  return `Complex string template with ${payload.field1} and ${payload.field2}...`;
}

// 2. Add parser
function parseNewFeatureResponse(result, payload) {
  if (!result.success) return { error: result.error };
  try {
    const parsed = JSON.parse(result.output);
    return { ...parsed, generated: true };
  } catch (error) {
    return { fallback: 'data' };
  }
}

// 3. Add route handler
case 'new-feature':
  prompt = generateNewFeaturePrompt(payload);
  break;

// 4. Add response handler
case 'new-feature':
  response = parseNewFeatureResponse(result, payload);
  break;
```

**Total**: ~50 lines of code

### Proposed (Simple)

```json
// prompts/templates.json
{
  "new-feature-v1": {
    "version": "1.0",
    "description": "Generate new feature",
    "instruction": "Generate feature for:\n\nField1: {{data.field1}}\nField2: {{data.field2}}",
    "outputSchema": {
      "type": "object",
      "required": ["result"],
      "properties": {
        "result": {"type": "string"}
      }
    }
  }
}
```

**Total**: ~15 lines of JSON, **0 lines of code**

---

## Recommendation

**Implement the proposed architecture because**:

1. ✅ **Structured data** (JSON) is easier to validate and extend
2. ✅ **Externalized prompts** are easier to review and modify
3. ✅ **Clear parsing responsibility**: Kiro CLI generates JSON, Kiro API validates and stores
4. ✅ **Generalized interface** reduces code duplication
5. ✅ **Schema validation** catches errors early
6. ✅ **Version control** for prompts enables A/B testing
7. ✅ **Non-developers** can contribute prompt improvements

**Start with**:
- Phase 1: Add `/kiro/v2/` endpoints with structured format
- Test with one endpoint (e.g., `enhance-story`)
- Migrate other endpoints incrementally
- Keep legacy endpoints until migration complete
