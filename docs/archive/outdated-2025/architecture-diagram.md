```
🌐 AIPM Lambda-Free Architecture with AI Integration
═══════════════════════════════════════════════════

┌─────────────────┐    HTTP POST /api/stories/draft    ┌─────────────────────┐
│                 │    {"idea": "user profile mgmt"}   │                     │
│   Frontend      │────────────────────────────────────▶│   Kiro API Server   │
│   (S3 Static)   │                                     │   (EC2:8081)        │
│                 │◀────────────────────────────────────│                     │
└─────────────────┘    Enhanced JSON Response          └─────────────────────┘
                                                                    │
                                                                    │ spawn process
                                                                    ▼
┌─────────────────┐                                     ┌─────────────────────┐
│                 │                                     │                     │
│   DynamoDB      │◀────────────────────────────────────│   Kiro CLI          │
│   Stories       │    Store/Retrieve Stories           │   (AI Assistant)    │
│                 │                                     │                     │
└─────────────────┘                                     └─────────────────────┘

🔄 Request Flow:
1. Frontend sends idea to Kiro API Server
2. Server spawns Kiro CLI process with prompt
3. Kiro CLI generates AI-enhanced story (30-60 seconds)
4. Server parses streaming JSON response
5. Returns enhanced story to frontend
6. Optionally stores in DynamoDB

📝 AI Prompt Example:
Generate enhanced user story JSON for: "user profile management"

IMPORTANT: Return ONLY a single JSON object on one line, no other text.

Required JSON format:
{"storyId":"story-1735185581662","title":"Enhanced title",...}

🤖 AI Processing:
- Kiro CLI uses Amazon Q/Claude for enhancement
- Generates detailed descriptions
- Creates specific acceptance criteria
- Follows INVEST principles
- Takes 30-60 seconds for quality output

⚡ Performance:
- Direct API calls (no Lambda overhead)
- 600-second timeout for AI processing
- Streaming JSON parsing
- CORS enabled for frontend access

💾 Data Flow:
Frontend ──▶ Kiro API ──▶ Kiro CLI ──▶ AI Model ──▶ Enhanced Story
    ▲                                                      │
    └──────────────────────────────────────────────────────┘
```
