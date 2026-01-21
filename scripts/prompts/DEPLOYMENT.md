# Prompt Template Deployment Summary

## ✅ Deployed Successfully

Date: 2025-12-18  
Location: EC2 instance (3.92.96.67)  
Service: kiro-api-v3

## Files Created

### Prompt Templates
```
scripts/prompts/
├── README.md                    # Documentation
├── DEPLOYMENT.md                # This file
├── enhance-story.txt            # Enhance story prompt (with tokens)
├── enhance-story.json           # JSON template for response
├── chat.txt                     # Chat prompt
└── transform.txt                # Transform prompt
```

### Updated Files
- `scripts/kiro-api-server-v3.js` - Now loads and uses external templates

## Token System

All templates use `{{TOKEN_NAME}}` format for clear, unambiguous replacement.

### Example: enhance-story.txt
```
Enhance this user story:

Idea: {{IDEA}}
Current: {{CURRENT_DRAFT}}
Parent: {{PARENT_TITLE}}

...

curl -X POST {{CALLBACK_URL}} \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{{JSON_TEMPLATE}}
EOF
```

### Example: enhance-story.json
```json
{
  "title": "{{ENHANCED_TITLE}}",
  "description": "{{ENHANCED_DESCRIPTION}}",
  "asA": "{{ENHANCED_AS_A}}",
  "iWant": "{{ENHANCED_I_WANT}}",
  "soThat": "{{ENHANCED_SO_THAT}}",
  "acceptanceCriteria": [
    {
      "id": 1,
      "title": "{{AC_1_TITLE}}",
      "description": "{{AC_1_DESCRIPTION}}"
    }
  ]
}
```

## Benefits

1. **Externalized Prompts**: Prompts are now separate from code
2. **Easy Editing**: Modify prompts without touching JavaScript
3. **Clear Tokens**: `{{TOKEN}}` format is unambiguous
4. **Version Control**: Track prompt changes independently
5. **Testing**: Easy to test different prompt variations
6. **Documentation**: Self-documenting with clear token names

## Verification

Service logs show successful loading:
```
📋 Loaded contracts: [ 'enhance-story-v1', 'generate-acceptance-test-v1', 'analyze-invest-v1' ]
📝 Loaded prompt templates: [ 'enhanceStory', 'enhanceStoryJson', 'chat', 'transform' ]
```

## Usage in Code

```javascript
// Load templates at startup
const PROMPTS = {
  enhanceStory: readFileSync(join(__dirname, 'prompts/enhance-story.txt'), 'utf-8'),
  enhanceStoryJson: readFileSync(join(__dirname, 'prompts/enhance-story.json'), 'utf-8'),
  // ...
};

// Use in endpoint
const enhancePrompt = PROMPTS.enhanceStory
  .replace('{{IDEA}}', idea)
  .replace('{{CURRENT_DRAFT}}', JSON.stringify(draft))
  .replace('{{PARENT_TITLE}}', parent?.title || 'None')
  .replace('{{CALLBACK_URL}}', callbackUrl)
  .replace('{{JSON_TEMPLATE}}', PROMPTS.enhanceStoryJson);
```

## Next Steps

To modify prompts:
1. Edit files in `scripts/prompts/`
2. Deploy: `scp -r scripts/prompts ec2-user@3.92.96.67:/home/ec2-user/aipm/scripts/`
3. Restart: `ssh ec2-user@3.92.96.67 'sudo systemctl restart kiro-api-v3'`

No code changes needed for prompt modifications!
