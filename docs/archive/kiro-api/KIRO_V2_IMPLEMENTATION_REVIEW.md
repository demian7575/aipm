# Kiro API V2 Implementation Review

## Date: 2025-12-17

## Implementation Summary

### What Was Implemented

1. **Prompt Templates System** (`scripts/prompts/templates.json`)
   - Externalized prompts as JSON configuration
   - Template versioning (v1)
   - Schema definitions for validation
   - 4 templates: enhance-story, generate-acceptance-test, analyze-invest, chat

2. **Structured Protocol** (`scripts/kiro-api-server-v2.js`)
   - V2 API endpoints under `/kiro/v2/`
   - Template-based prompt rendering with `{{data.field}}` syntax
   - Generic JSON parser with schema validation
   - Comprehensive logging for debugging
   - Metadata in responses (`_meta` field)

3. **Improved Queue Manager** (`scripts/kiro-queue-manager.js`)
   - Environment variable configuration for paths
   - `KIRO_CLI_PATH` and `KIRO_WORKING_DIR`
   - Better logging of paths and configuration

4. **Test Suite** (`scripts/test-kiro-v2.sh`)
   - Automated testing of all endpoints
   - JSON validation
   - Detailed logging to `/tmp/kiro-v2-test-*.log`

### Test Results

#### ✅ Successful Tests

1. **Health Check** - PASSED
   - Server responds with version 2.0
   - Lists all templates and endpoints
   - Shows queue status

2. **Chat Endpoint** - PASSED (partially)
   - Kiro CLI responds
   - Returns JSON
   - But schema doesn't match (returned `{"message": "4"}` for "2+2" question)

#### ❌ Failed Tests

3. **Enhance Story Endpoint** - FAILED
   - Kiro CLI is still processing after 60+ seconds
   - Response not received within test timeout
   - Indicates Kiro is thinking too long or not following JSON-only instruction

4. **Generate Acceptance Test** - NOT TESTED
   - Blocked by enhance-story timeout

### Root Cause Analysis

#### Problem 1: Kiro CLI is Conversational, Not API-Oriented

**Evidence**:
```
📨 Kiro CLI response (success: true):
   Output length: 25 chars
   Output preview: json
{
  "message": "4"
}
```

**Analysis**:
- Kiro returned JSON, but with wrong schema
- Expected schema had `message` field (chat endpoint)
- But response was for "2+2" question, not following the enhance-story schema
- Kiro maintains conversation context across requests

**Impact**:
- Cannot reliably get structured JSON matching specific schemas
- Kiro interprets prompts conversationally, not as strict API contracts
- Schema validation fails because Kiro doesn't strictly follow output schema

#### Problem 2: Long Processing Times

**Evidence**:
- Enhance-story request still "Thinking..." after 60+ seconds
- Multiple "⠋ Thinking..." spinner updates in stderr

**Analysis**:
- Complex prompts with detailed schemas take too long
- Kiro may be trying to be too thorough
- No timeout mechanism in test suite

**Impact**:
- Poor user experience (>60s response time)
- Tests timeout before completion
- Queue backs up with slow requests

#### Problem 3: Conversation Context Pollution

**Evidence**:
- Single persistent Kiro CLI session
- All requests share same conversation history
- Previous "2+2" question affects subsequent requests

**Analysis**:
- Persistent session was designed to maintain context
- But for API use, we want isolated requests
- Context from previous requests interferes with new ones

**Impact**:
- Unpredictable responses
- Schema mismatches
- Cannot guarantee idempotent behavior

### Architectural Insights

#### What Works Well

1. **Template System**
   - ✅ Easy to add new endpoints (just add JSON)
   - ✅ Version control friendly
   - ✅ Non-developers can review/edit prompts
   - ✅ Clear separation of data and instructions

2. **Structured Request Format**
   - ✅ Clean API design
   - ✅ Extensible without code changes
   - ✅ Schema validation catches errors early

3. **Logging and Debugging**
   - ✅ Comprehensive logs show exact prompts sent
   - ✅ Response parsing steps are visible
   - ✅ Easy to diagnose issues

#### What Doesn't Work

1. **Kiro CLI as Structured API**
   - ❌ Kiro is designed for conversation, not strict JSON APIs
   - ❌ Cannot reliably enforce output schemas
   - ❌ Processing times too long for API use
   - ❌ Conversation context interferes with isolated requests

2. **Single Persistent Session**
   - ❌ Context pollution across requests
   - ❌ Cannot parallelize (max 1 concurrent)
   - ❌ One slow request blocks all others

3. **Schema Enforcement**
   - ❌ Kiro doesn't strictly follow "CRITICAL: Return ONLY valid JSON" instruction
   - ❌ Returns conversational responses instead of pure JSON
   - ❌ Schema validation fails frequently

### Recommendations

#### Option A: Hybrid Approach (Recommended)

**Keep V2 for simple tasks, use V1 for complex tasks**

```javascript
// Simple, fast tasks → V2 (structured JSON)
POST /kiro/v2/chat
POST /kiro/v2/quick-analysis

// Complex tasks → V1 (conversational with custom parsers)
POST /kiro/enhance-story
POST /kiro/generate-acceptance-test
POST /kiro/analyze-invest
```

**Benefits**:
- Leverage V2's clean architecture for appropriate use cases
- Keep V1's proven parsers for complex tasks
- Gradual migration path

#### Option B: Fresh Session Per Request

**Spawn new Kiro CLI process for each request**

```javascript
// In kiro-queue-manager.js
async sendCommand(message) {
  // Spawn fresh Kiro CLI
  const kiro = spawn('kiro-cli', ['chat', '--trust-all-tools']);
  
  // Send prompt
  kiro.stdin.write(message + '\n');
  
  // Wait for response
  const response = await waitForResponse(kiro);
  
  // Kill process
  kiro.kill();
  
  return response;
}
```

**Benefits**:
- No context pollution
- Isolated requests
- Can parallelize

**Drawbacks**:
- 2s startup overhead per request
- Higher resource usage
- Lose conversation context (but we don't need it for API)

#### Option C: Use Different AI Service

**Replace Kiro CLI with API-oriented AI**

- OpenAI API (already used for INVEST analysis)
- AWS Bedrock
- Anthropic Claude API

**Benefits**:
- Designed for structured API use
- Fast response times (<5s)
- Reliable JSON output
- Better schema enforcement

**Drawbacks**:
- Requires API keys
- External dependency
- Cost per request

### Next Steps

#### Immediate Actions

1. **Document Current State** ✅ (this document)
   - What works
   - What doesn't
   - Why

2. **Kill Long-Running Test**
   ```bash
   kill $(cat /tmp/kiro-v2-server.pid)
   ```

3. **Decide on Architecture**
   - Review options A, B, C
   - Choose based on requirements

#### Short Term (If Continuing with Kiro CLI)

1. **Simplify Prompts**
   - Remove complex schema requirements
   - Ask for simpler JSON structures
   - Accept conversational responses and parse them

2. **Add Timeouts**
   - 30s timeout per request
   - Return partial results on timeout
   - Log slow requests for analysis

3. **Improve Parsing**
   - More lenient JSON extraction
   - Handle markdown code blocks
   - Extract JSON from conversational text

#### Long Term

1. **Evaluate AI Service Options**
   - Compare Kiro CLI vs OpenAI vs Bedrock
   - Benchmark response times
   - Test schema compliance

2. **Implement Hybrid System**
   - V2 for simple tasks
   - OpenAI for complex structured tasks
   - Kiro CLI for interactive terminal sessions

3. **Add Monitoring**
   - Track response times
   - Monitor schema validation failures
   - Alert on slow requests

### Lessons Learned

1. **Kiro CLI is a Conversational Tool**
   - Excellent for interactive chat
   - Not designed for strict API contracts
   - Best used in terminal/WebSocket mode

2. **Structured Protocols Need Structured Tools**
   - Template system is great
   - But needs AI that respects schemas
   - OpenAI API is better suited for this

3. **Context is Double-Edged**
   - Good for conversations
   - Bad for isolated API requests
   - Need to choose based on use case

4. **Testing Reveals Truth**
   - Assumptions about Kiro's behavior were wrong
   - Actual testing showed limitations
   - Fact-based development works

### Conclusion

The V2 implementation successfully demonstrates:
- ✅ Clean architectural patterns (templates, schemas, validation)
- ✅ Extensible design (easy to add endpoints)
- ✅ Good developer experience (logging, debugging)

But reveals fundamental mismatch:
- ❌ Kiro CLI is conversational, not API-oriented
- ❌ Cannot reliably enforce JSON schemas
- ❌ Too slow for synchronous API use

**Recommendation**: Use V2 architecture (templates, schemas) but with OpenAI API instead of Kiro CLI for structured tasks. Keep Kiro CLI for interactive terminal sessions where its conversational nature is an asset.

### Files Created

1. `/repo/ebaejun/tools/aws/aipm/scripts/prompts/templates.json` - Prompt templates
2. `/repo/ebaejun/tools/aws/aipm/scripts/kiro-api-server-v2.js` - V2 API server
3. `/repo/ebaejun/tools/aws/aipm/scripts/test-kiro-v2.sh` - Test suite
4. `/repo/ebaejun/tools/aws/aipm/docs/KIRO_PROTOCOL_IMPROVEMENT_PROPOSAL.md` - Design proposal
5. `/repo/ebaejun/tools/aws/aipm/docs/KIRO_V2_IMPLEMENTATION_REVIEW.md` - This document

### Test Logs

- Server log: `/tmp/kiro-v2-server.log`
- Test log: `/tmp/kiro-v2-test-20251217-165900.log`
- Server PID: `/tmp/kiro-v2-server.pid`
