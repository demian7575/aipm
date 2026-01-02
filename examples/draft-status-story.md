# Draft Status Story Example

## Story Structure

**Title**: Generate Progress Reports

**Description**: 
As a project manager  
I want to generate automated progress reports  
So that I can share project status with stakeholders

**Story Points**: 8

**Status**: Draft

**Assignee**: pm@company.com

**Components**: 
- Traceability & Insight (TI)
- DocumentIntelligence (DI)

## Draft Status Characteristics

### What Draft Means
- Story is being authored or refined
- Requirements may still change
- Not yet ready for development
- Default status for new stories

### Current State Issues
- ❌ Acceptance criteria not yet defined
- ❌ Story points may need adjustment
- ❌ Components selection needs validation
- ❌ INVEST criteria not fully satisfied

### Next Steps to Progress
1. **Define Acceptance Criteria**
   - Add Given/When/Then test scenarios
   - Cover happy path and edge cases
   - Include error handling requirements

2. **Refine Requirements**
   - Clarify report format and content
   - Specify delivery method (email, download, etc.)
   - Define frequency and automation triggers

3. **INVEST Validation**
   - Ensure story is Independent
   - Verify it's Negotiable (not over-specified)
   - Confirm business Value is clear
   - Check if it's Estimable with current details
   - Assess if it's Small enough for one sprint
   - Add Testable acceptance criteria

## Potential Acceptance Criteria (Draft)
```
Given I am logged into the AIPM system
When I click "Generate Report"
Then [NEEDS DEFINITION - what format? what content?]
```

## Status Progression Path
**Draft** → **Ready** → **In Progress** → **Done**

### To Move to Ready
- Add complete acceptance criteria
- Validate INVEST compliance
- Confirm story points are accurate
- Ensure all required fields are complete

## AIPM System Behavior
- Draft stories can be edited freely
- No INVEST validation required yet
- Can transition to Ready or Blocked
- Warning overrides not needed in Draft state
