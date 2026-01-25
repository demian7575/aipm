# User Story Generation

Generate user story with INVEST score 80+. Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md` for tests.

## Rules
- **Independent**: No dependencies on incomplete work
- **Negotiable**: WHAT/WHY, not HOW
- **Valuable**: Quantifiable benefit (e.g., "save 5 minutes")
- **Estimable**: Specific scope with numbers
- **Small**: 1-2 weeks, story points 1-5
- **Testable**: Observable, measurable outcomes

**Avoid**: quickly, easily, efficiently, smoothly, seamlessly, intuitively, better, improved, enhanced, optimized
**Use**: "within 5 seconds", "with 3 clicks", "20 items per page"

## Steps
1. Extract Request ID, Parent ID, Feature description
2. Generate story + 1-2 acceptance tests (arrays)
3. Execute: `curl -X POST http://localhost:8083/api/story-draft-response -H 'Content-Type: application/json' -d '{"requestId":"REQUEST_ID","status":"complete","title":"...","description":"...","asA":"...","iWant":"...","soThat":"...","components":["..."],"storyPoint":3,"assigneeEmail":"","parentId":PARENT_ID,"acceptWarnings":true,"acceptanceTests":[{"title":"...","given":["..."],"when":["..."],"then":["..."],"status":"Draft"}]}'`
