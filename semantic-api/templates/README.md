# AIPM Templates Documentation

This directory contains templates for Semantic API operations and shared guidelines.

## Template Categories

### 1. Semantic API Templates (POST-*)

All templates follow the standard structure defined in `SEMANTIC_API_GUIDELINES.md`.

#### User Story Management
- **POST-aipm-story-draft.md** - Generate user stories with acceptance tests
  - Role: User Story Writer
  - Endpoint: `/api/story-draft-response`
  - Output: Complete user story with INVEST compliance

#### Acceptance Testing
- **POST-aipm-acceptance-test-draft.md** - Generate Given-When-Then acceptance tests
  - Role: Acceptance Test Writer
  - Endpoint: `/api/acceptance-test-draft-response`
  - Output: GWT format acceptance test
  - Guidelines: `ACCEPTANCE_TEST_GUIDELINES.md`

#### Quality Analysis
- **POST-aipm-invest-analysis.md** - Analyze user stories against INVEST principles
  - Role: INVEST Principles Analyst
  - Endpoint: `/api/invest-analysis-response`
  - Output: INVEST compliance analysis with issues and suggestions

- **POST-aipm-gwt-analysis.md** - Analyze acceptance test quality
  - Role: Test Quality Analyst
  - Endpoint: `/api/gwt-analysis-response`
  - Output: Test health score and improvement suggestions

#### Code Generation
- **POST-aipm-code-generation.md** - Generate code implementation for user stories
  - Role: Code Implementation Engineer
  - Endpoint: `/api/code-generation-response`
  - Output: Implementation status and modified files

### 2. Shared Guidelines

#### SEMANTIC_API_GUIDELINES.md (AI-Readable)
Common sections used by all Semantic API templates:
- ROLE ASSIGNMENT (structure)
- AUTHORITY & RESPONSIBILITY (full text)
- COMPLIANCE REQUIREMENTS (full text)
- EXECUTION COMMAND (structure)
- Standard Execution Pattern (4 steps)
- Critical warnings

**Usage**: All POST-*.md templates include this file via `**INCLUDE**` directive

#### TEMPLATE_DEVELOPMENT_GUIDE.md (Developer Guide)
Comprehensive guide for creating and modifying templates:
- Template structure and conventions
- Creating new templates (step-by-step)
- Modifying existing templates
- Naming conventions
- Testing procedures
- Template checklist

**Usage**: Reference when developing new templates or modifying existing ones

#### ACCEPTANCE_TEST_GUIDELINES.md (Shared Content)
Reusable guidelines for acceptance test generation:
- Purpose & Usage (code generation, CI/CD automation)
- Given-When-Then format specifications
- Quality requirements (executable, deterministic, independent)
- Automation requirements
- Common test patterns

**Usage**: Referenced by story and acceptance test templates

## Template Structure

All Semantic API templates follow this structure:

```markdown
# [Template Name]

> **Template Guidelines**: See `SEMANTIC_API_GUIDELINES.md`

## ROLE ASSIGNMENT
**YOU ARE**: [Specific Role]
**YOU ARE NOT**: An AIPM developer, template editor, or workflow designer

## AUTHORITY & RESPONSIBILITY
[Standard authority and responsibility text]

## COMPLIANCE REQUIREMENTS
[Standard compliance text]

## EXECUTION COMMAND
[Standard execution command text]

---

## Input
[Input parameters]

## Technical Specifications
[Output schema and curl command]

## EXECUTION INSTRUCTIONS
[Step-by-step execution guide]
```

## Usage

### For Template Users (AI)
1. Read the template from top to bottom
2. Extract input values from the prompt
3. Generate required content
4. Replace placeholders in curl command
5. Execute curl command immediately

### For Template Developers
1. Review `SEMANTIC_API_GUIDELINES.md` for standard structure
2. Copy an existing template as starting point
3. Update role-specific sections only
4. Keep standard sections unchanged
5. Follow placeholder naming conventions
6. Test with actual Semantic API

### For Content Guidelines
- **Acceptance Tests**: Reference `ACCEPTANCE_TEST_GUIDELINES.md`
- **INVEST Principles**: Defined in `POST-aipm-invest-analysis.md`
- **GWT Format**: Defined in `ACCEPTANCE_TEST_GUIDELINES.md`

## File Organization

```
templates/
├── README.md (this file)
│
├── AI-Readable Guidelines
│   ├── SEMANTIC_API_GUIDELINES.md (57 lines - common sections)
│   └── ACCEPTANCE_TEST_GUIDELINES.md (79 lines - test guidelines)
│
├── Developer Documentation
│   ├── TEMPLATE_DEVELOPMENT_GUIDE.md (259 lines - how to create/modify)
│   ├── OPTIMIZATION_FINAL.md (optimization results)
│   └── OPTIMIZATION_STATUS.md (optimization status)
│
└── Semantic API Templates (POST-*)
    ├── POST-aipm-story-draft.md (112 lines)
    ├── POST-aipm-acceptance-test-draft.md (76 lines)
    ├── POST-aipm-invest-analysis.md (87 lines)
    ├── POST-aipm-gwt-analysis.md (65 lines)
    └── POST-aipm-code-generation.md (70 lines)
```

## Key Principles

### 1. Consistency
All templates follow the same structure for predictability and maintainability.

### 2. Reusability
Common guidelines are extracted to shared documents to avoid duplication.

### 3. Strict Compliance
Templates enforce strict adherence to specifications with no room for interpretation.

### 4. Immediate Execution
All templates require immediate curl execution without questions or explanations.

### 5. Request ID Integrity
All templates emphasize correct Request ID extraction and usage.

## Maintenance

### Adding New Templates
1. Copy an existing template
2. Update role and endpoint
3. Define input/output schema
4. Write execution instructions
5. Add reference to this README

### Modifying Templates
- Keep standard sections unchanged
- Only update role-specific content
- Maintain placeholder conventions
- Update this README if structure changes

### Updating Guidelines
- Update shared guideline documents
- Templates automatically inherit changes
- No need to update individual templates

## Related Documentation

- **Semantic API Server**: `scripts/semantic-api-server-v2.js`
- **Kiro Session Pool**: `scripts/kiro-session-pool.js`
- **API Documentation**: `docs/TEMPLATE_API_ARCHITECTURE.md`
