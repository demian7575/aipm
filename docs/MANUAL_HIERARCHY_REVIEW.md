# Manual Hierarchy Review - 2026-02-09

## Summary
Manually reviewed all 72 stories and remapped 9 stories to correct L2 categories.

## Changes Made

### Test UI Stories (4 stories)
**Moved from:** 4001 (Story Visualization) → **3600 (Testing UI)**
- 4109: US-UX-TEST-L4-001: View Tests in Detail Panel
- 4110: US-UX-TEST-L4-002: Create Test Modal
- 4111: US-UX-TEST-L4-003: Edit Test Modal
- 4112: US-UX-TEST-L4-004: Delete Test Confirmation

**Rationale:** These are testing-specific UI features, belong in Testing UI category.

### GitHub Integration Stories (3 stories)
**Moved from:** 4001 (Story Visualization) → **6200 (External Integrations)**
- 4116: US-UX-GH-L4-001: Create PR Button
- 4117: US-UX-GH-L4-002: View PR Status
- 4118: US-UX-GH-L4-003: Merge PR Button

**Rationale:** GitHub integration is external system integration, not core visualization.

### INVEST Quality Stories (2 stories)
**Moved from:** 4001 (Story Visualization) → **4100 (Story Lifecycle & Quality)**
- 4119: US-UX-INVEST-L4-001: Run INVEST Check Button
- 4120: US-UX-INVEST-L4-002: View INVEST Results

**Rationale:** INVEST checks are quality/lifecycle features, not visualization.

## Stories That Stayed in Place

### Under 4001 (Story Visualization) - CORRECT
- 4101-4106: Core mindmap/outline/detail/modal features
- 4107-4108: Filter and search (core UI functionality)
- 4113-4115: Dependency visualization (core feature)
- 4121-4122: Document upload/view (core feature)

### Under 1200 (Backend APIs) - CORRECT
- 1001: Story Management API (L3 epic)
  - 1101-1114: All API endpoints (L4 features)

### Under 1300 (Data Layer) - CORRECT
- 2001: DynamoDB Data Management (L3 epic)
  - 2102-2103: CRUD operations (L4 features)
    - 2202-2204: Specific DB operations (L5 stories)

### Under 2100 (AI Engine) - CORRECT
- 3001: AI Story Generation (L3 epic)
  - 3102-3103: AI endpoints (L4 features)
- 6207-6208: AI service infrastructure (L5 stories)

### Under 5100 (Monitoring) - CORRECT
- 5101-5102: Health check and version endpoints

### Under 6300 (PR & Deployment) - CORRECT
- 6101: GitHub Actions Workflow
- 6102: Pre-Deployment Tests
  - 6201-6204: Test phases (L5 stories)
- 6205-6206: Utility scripts (L5 stories)

### Under 2200 (Infrastructure) - CORRECT
- 7001-7006: Infrastructure components (L6 stories)

## Final Hierarchy Structure

```
L1 (6 roots) → L2 (22 categories) → L3 (5 epics) → L4 (47 features) → L5 (18 stories) → L6 (6 infra)
```

**Total: 100 stories** (6 + 22 + 72 real functionalities)

## Verification

All stories now properly categorized:
- ✅ API endpoints under Backend APIs (1200)
- ✅ Database operations under Data Layer (1300)
- ✅ AI features under AI Engine (2100)
- ✅ Core UI under Core Features (3200)
- ✅ Test UI under Testing UI (3600)
- ✅ Quality checks under Story Lifecycle (4100)
- ✅ Monitoring under Monitoring (5100)
- ✅ GitHub integration under External Integrations (6200)
- ✅ Deployment under PR & Deployment (6300)
- ✅ Infrastructure under Infrastructure (2200)

## Script Used

`scripts/utilities/manual-remap.mjs` - Updates parentId for 9 stories
