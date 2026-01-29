# INVEST Scoring Rules (Shared)

**Score Range**: 0-100 (honest evaluation)

## Score Interpretation
- **80-100**: Excellent - Meets all INVEST criteria
- **60-79**: Good - Minor improvements needed
- **40-59**: Needs Work - Significant issues
- **0-39**: Poor - Major restructuring required

## INVEST Principles (Each ~16 points)

**1. Independent (I)**:
- ✅ Self-contained, no dependencies on incomplete work
- ✅ Can be developed in any order
- ❌ "After login is implemented, display user profile"

**2. Negotiable (N)**:
- ✅ Focus on WHAT and WHY, not HOW
- ✅ Leave implementation flexible
- ❌ "Use QuickSort algorithm to sort stories"

**3. Valuable (V)**:
- ✅ Clear business/user benefit
- ✅ Quantify value when possible
- ❌ "so that the code is cleaner"

**4. Estimable (E)**:
- ✅ Specific scope with clear boundaries
- ✅ Concrete examples and numbers
- ❌ "Improve the story display"

**5. Small (S)**:
- ✅ Completable in 1-2 weeks
- ✅ Single focused feature
- ✅ Story points: 2-5 (prefer 3)
- ❌ "Build complete project management dashboard"

**6. Testable (T)**:
- ✅ Observable, measurable outcomes
- ✅ Specific test scenarios
- ✅ Clear pass/fail criteria
- ❌ "System should work well"

## Quality Indicators

**⚠️ FORBIDDEN WORDS** (cause automatic failure below 80):
quickly, easily, efficiently, smoothly, seamlessly, intuitively, user-friendly, better, improved, enhanced, optimized, well, properly, correctly, appropriately

**✅ Use specific measurements instead**:
- "within 5 seconds" instead of "quickly"
- "with 3 clicks" instead of "easily"
- "in one screen" instead of "seamlessly"
- "without page reload" instead of "smoothly"
- "20 items per page" instead of "some items"

## Story Structure for 80+ Score

**Title Format**: `[Action Verb] + [Specific Object] + [Optional Context]`
- ✅ "Display Story List Sorted by Priority Level"
- ✅ "Filter Stories by Component Selection"
- ❌ "Story Management" (too vague)
- ❌ "Improve UI" (not specific)

**As a**: Use specific, realistic role
- ✅ "project manager", "software developer", "QA engineer"
- ❌ "user", "person", "someone"

**I want**: ONE clear, specific action
- ✅ "to see a list of all stories sorted by priority with high-priority items at the top"
- ❌ "to manage stories better"
- Must include specific details (what, where, how many)
- **NEVER use forbidden words**

**So that**: Measurable business value
- ✅ "I can identify critical work items within 5 seconds instead of scanning the entire list"
- ❌ "things work better"
- Include quantifiable benefit when possible
- **NEVER use forbidden words**

**Description**: 3-4 sentences with specifics
- Sentence 1: What the feature does
- Sentence 2: Specific behavior/constraints
- Sentence 3: Example or edge case
- Include numbers, states, UI elements

**Story Points**: Realistic estimate
- 1-2: Simple UI change, text update
- 3: Standard feature (list, filter, form)
- 5: Complex feature (multiple interactions)
- 8: Very complex (avoid if possible, split instead)

## High-Score Example (85+ score)

```json
{
  "title": "Display User Stories in Priority-Sorted List View",
  "asA": "project manager",
  "iWant": "to view all user stories in a sortable list showing title, status, and priority level with high-priority items displayed first",
  "soThat": "I can identify critical work items within 5 seconds instead of manually searching through the entire backlog",
  "description": "Create a list view displaying user stories with three columns: title, status, and priority. Stories are sorted by priority (High, Medium, Low) with high-priority items at the top. The list shows a maximum of 20 stories per page with pagination controls. Users can click on any story to view details.",
  "storyPoint": 3,
  "components": ["WorkModel"]
}
```

## Common Mistakes That Lower Score

❌ **Vague titles**: "Improve system", "Update UI", "Fix issues"
✅ **Specific titles**: "Add Search Bar to Story List", "Display Story Count Badge"

❌ **Generic roles**: "user", "person"
✅ **Specific roles**: "project manager", "QA engineer", "end user"

❌ **Vague wants**: "better features", "improved experience"
✅ **Specific wants**: "filter stories by status", "export story list to CSV"

❌ **Technical benefits**: "cleaner code", "better architecture"
✅ **User benefits**: "save 5 minutes per task", "reduce errors by 50%"

❌ **Vague descriptions**: "Make the system better"
✅ **Specific descriptions**: "Display 10 stories per page with title, status, assignee"

❌ **No numbers**: "display some items"
✅ **With numbers**: "display 20 items per page"

❌ **FORBIDDEN WORDS** (automatic score < 80)
✅ **Use instead**: "within 5 seconds", "with 3 clicks", "in one screen", "without page reload"
