# Kiro API Prompt Templates

This directory contains external prompt templates and JSON schemas for each Kiro API endpoint.

## File Structure

```
prompts/
├── README.md                    # This file
├── enhance-story.txt            # Prompt template for /kiro/enhance-story
├── enhance-story.json           # JSON template for enhance-story response
├── chat.txt                     # Prompt template for /kiro/chat
└── transform.txt                # Prompt template for /kiro/v3/transform
```

## Token Format

All tokens use the format: `{{TOKEN_NAME}}`

### enhance-story.txt Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{{IDEA}}` | User's story idea | "Remove Branch field from UI" |
| `{{CURRENT_DRAFT}}` | JSON string of heuristic draft | `{"title":"...","description":"..."}` |
| `{{PARENT_TITLE}}` | Parent story title or "None" | "Remove Branch functionality" |
| `{{CALLBACK_URL}}` | Callback endpoint URL | `http://localhost:8081/kiro/callback/enhance-123` |
| `{{JSON_TEMPLATE}}` | Contents of enhance-story.json with tokens | See enhance-story.json |

### enhance-story.json Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{{ENHANCED_TITLE}}` | Improved story title | "Remove Branch Field, PR Status, and Rebase Link from Development Task UI" |
| `{{ENHANCED_DESCRIPTION}}` | Improved description | "Clean up the Development Task interface by removing..." |
| `{{ENHANCED_AS_A}}` | Improved user role | "AIPM workspace user managing development tasks" |
| `{{ENHANCED_I_WANT}}` | Improved want statement | "to remove the Branch field, PR status indicator..." |
| `{{ENHANCED_SO_THAT}}` | Improved business value | "I can reduce cognitive load and improve task management..." |
| `{{AC_N_TITLE}}` | Acceptance criteria N title | "Branch field removed" |
| `{{AC_N_DESCRIPTION}}` | Acceptance criteria N description | "The Branch field is no longer visible in forms" |

### chat.txt Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{{USER_MESSAGE}}` | User's chat message | "What is the weather today?" |

### transform.txt Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{{CONTRACT_DESCRIPTION}}` | Contract description | "Transform user story to INVEST-compliant format" |
| `{{INPUT_JSON}}` | Input JSON string | `{"idea":"Add login","draft":{...}}` |
| `{{CONTRACT_INSTRUCTIONS}}` | Contract-specific instructions | "Ensure all fields follow INVEST principles..." |
| `{{OUTPUT_SCHEMA}}` | Expected output JSON schema | `{"type":"object","properties":{...}}` |

## Usage in Code

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load prompt template
const promptTemplate = readFileSync(
  join(__dirname, 'prompts/enhance-story.txt'), 
  'utf-8'
);

// Load JSON template
const jsonTemplate = readFileSync(
  join(__dirname, 'prompts/enhance-story.json'), 
  'utf-8'
);

// Replace tokens
const prompt = promptTemplate
  .replace('{{IDEA}}', idea)
  .replace('{{CURRENT_DRAFT}}', JSON.stringify(draft))
  .replace('{{PARENT_TITLE}}', parent?.title || 'None')
  .replace('{{CALLBACK_URL}}', callbackUrl)
  .replace('{{JSON_TEMPLATE}}', jsonTemplate);

// Send to Kiro CLI
await kiroQueue.sendCommand(prompt);
```

## Benefits

1. **Separation of Concerns**: Prompts are separate from code logic
2. **Easy Editing**: Modify prompts without touching code
3. **Version Control**: Track prompt changes independently
4. **Testing**: Easy to test different prompt variations
5. **Clear Tokens**: `{{TOKEN}}` format is unambiguous and easy to find/replace
6. **Documentation**: Self-documenting with clear token names

## Token Naming Convention

- Use `SCREAMING_SNAKE_CASE` for all tokens
- Be descriptive: `{{ENHANCED_TITLE}}` not `{{TITLE}}`
- Use prefixes for related tokens: `{{AC_1_TITLE}}`, `{{AC_2_TITLE}}`
- Avoid ambiguity: `{{CALLBACK_URL}}` not `{{URL}}`
