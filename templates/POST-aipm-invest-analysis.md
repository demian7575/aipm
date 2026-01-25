# INVEST Analysis

Analyze user story against INVEST principles. Target score: 80+. Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md` for test quality.

## INVEST Principles
- **Independent**: No dependencies on incomplete work
- **Negotiable**: WHAT/WHY, not HOW
- **Valuable**: Quantifiable benefit
- **Estimable**: Specific scope with numbers
- **Small**: 1-2 weeks, story points 2-5
- **Testable**: Observable, measurable outcomes

**Score Factors**:
- ✅ Specific roles, actions, benefits with numbers
- ✅ Concrete: "20 items per page", "within 5 seconds"
- ❌ Vague: quickly, easily, efficiently, smoothly, seamlessly, intuitively, better, improved, enhanced, optimized

## Steps
1. Extract Request ID, storyId, title, description, asA, iWant, soThat
2. Send progress: `curl -X POST http://localhost:8083/api/invest-analysis-response -H 'Content-Type: application/json' -d '{"requestId":"REQUEST_ID","status":"processing","message":"Analyzing..."}'`
3. Analyze: score 0-100, warnings array, strengths array
4. Send complete: `curl -X POST http://localhost:8083/api/invest-analysis-response -H 'Content-Type: application/json' -d '{"requestId":"REQUEST_ID","status":"complete","storyId":STORY_ID,"summary":"...","score":SCORE,"warnings":[{"criterion":"...","message":"...","suggestion":"..."}],"strengths":["..."],"source":"ai","model":"kiro-cli"}'`
