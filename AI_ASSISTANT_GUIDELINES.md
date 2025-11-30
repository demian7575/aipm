# AI Assistant Guidelines - Preventing Endless Loops

## Problem: Repetitive Discussions

AI assistants often re-explain decisions already made, creating endless loops of the same conversation.

## Root Causes

1. **No memory of previous decisions** - Each session starts fresh
2. **Over-explaining** - Answering "why" questions that were already settled
3. **Assuming user forgot** - Re-teaching concepts already understood
4. **Not checking context** - Ignoring conversation history

## Prevention Rules

### Rule 1: Check Context First
Before answering, ask yourself:
- ✅ "Was this already discussed?"
- ✅ "Is this already implemented?"
- ✅ "Did we already decide this?"

### Rule 2: Short Answers for Settled Topics
If something is already decided/implemented:
```
❌ BAD: "Let me explain why we use Bedrock... [500 words]"
✅ GOOD: "Bedrock is already integrated. Need changes?"
```

### Rule 3: Redirect to Documentation
```
❌ BAD: Re-explain everything
✅ GOOD: "See PR_WORKFLOW_FIXED.md for details. What needs changing?"
```

### Rule 4: Clarify Intent
When user asks about existing features:
```
User: "Why Bedrock?"
AI: "Bedrock is already working. Are you asking to:
     1. Change to different service?
     2. Understand the implementation?
     3. Something else?"
```

### Rule 5: Assume User Knows
Default assumption: User understands their own project.
```
❌ BAD: "Let me explain how your code works..."
✅ GOOD: "What do you want to change?"
```

## Quick Response Templates

### For "Why X?" Questions
```
"X is already implemented [link to code/docs].
Want to change it or just reviewing?"
```

### For "How does X work?" Questions
```
"X works via [one sentence].
See [file/doc] for details.
Need to modify something?"
```

### For Repeated Questions
```
"We discussed this [when/where].
Current status: [brief status].
What's changed?"
```

## Decision Log Format

Keep a DECISIONS.md file:
```markdown
# Project Decisions

## 2025-11-30: Use Bedrock for Code Generation
- **Decision**: Use Amazon Bedrock (Claude 3 Sonnet)
- **Reason**: AWS-native, cost-effective, already integrated
- **Status**: ✅ Implemented
- **Files**: .github/workflows/q-code-generation.yml
- **Don't revisit unless**: Requirements change

## 2025-11-30: Event-driven Lambda
- **Decision**: DynamoDB Stream triggers Lambda
- **Reason**: Eliminates polling overhead
- **Status**: ✅ Deployed
- **Files**: q-worker-lambda.js, serverless-q-worker.yml
- **Don't revisit unless**: Performance issues
```

## Communication Protocol

### User Says: "Explain X"
**AI Response:**
1. Check if X is documented
2. If yes: "See [doc]. Need clarification on specific part?"
3. If no: Provide brief explanation

### User Says: "Why X?"
**AI Response:**
1. Check if X is already decided/implemented
2. If yes: "X is implemented because [one sentence]. Change needed?"
3. If no: Provide reasoning

### User Says: "I want to revert this"
**AI Response:**
1. ✅ Revert immediately
2. ✅ Ask what went wrong
3. ❌ Don't re-explain why it was done

## Red Flags (Stop and Ask)

If you find yourself:
- Writing >200 words for a simple question
- Re-explaining something from earlier in conversation
- Defending a decision already made
- Teaching concepts user likely knows

**STOP and ask:** "What specifically do you need?"

## Example: Good vs Bad

### Scenario: User asks "Why Bedrock?"

**❌ BAD (Endless Loop):**
```
"Great question! Bedrock is used because:
1. AWS-native integration...
2. Cost-effective at $0.05-$0.20...
3. Claude 3 Sonnet quality...
[500 more words]

We considered ChatGPT but...
[300 more words]

Here's how it works...
[400 more words]"
```

**✅ GOOD (Prevents Loop):**
```
"Bedrock is already integrated (see q-code-generation.yml).
Are you asking to:
1. Switch to different service?
2. Fix an issue?
3. Just reviewing?"
```

## When to Explain in Detail

Only explain in detail when:
1. ✅ User explicitly asks for details
2. ✅ It's a new feature being added
3. ✅ User says "I don't understand"
4. ✅ Documentation doesn't exist

## Summary

**Default Mode:** Assume user knows their project. Give short, actionable answers.

**Only Elaborate When:** User explicitly requests details or documentation is missing.

**Always Ask:** "What do you want to change?" instead of "Let me explain why..."

---

**Remember:** Your job is to help move forward, not re-explain the past.
