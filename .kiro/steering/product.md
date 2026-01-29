---
inclusion: manual
---

# Product Overview

## What is AIPM?

Self-hosted mindmap workspace for managing user stories with AI-powered code generation.

## Core Features

1. **User Story Management**
   - Hierarchical stories with parent/child relationships
   - INVEST validation (80+ score required)
   - Status tracking: Draft → Ready → In Progress → Blocked → Approved → Done

2. **Visualization**
   - Right-growing mindmap (SVG)
   - Collapsible outline tree
   - Details panel with INVEST feedback

3. **AI Code Generation**
   - Generate code from user stories
   - Creates GitHub PRs automatically
   - Kiro CLI integration via session pool

4. **Acceptance Testing**
   - Link acceptance tests to stories
   - Verifiability validation
   - Pass/Fail tracking

5. **Team Management**
   - Employee heat map (workload by component)
   - Task assignment
   - Reference document library

## Business Rules

- **Done Status Guard**: Story can only be "Done" if:
  - All child stories are "Done"
  - All acceptance tests are "Pass"
  
- **INVEST Scoring**: Stories must score 80+ or use `skipInvestValidation=true`

- **Components**: System (S/S), WorkModel (WM), DocumentIntelligence (DI), Review & Governance (RG), Orchestration & Engagement (OE), Run & Verify (RV), Traceability & Insight (TI)

## Environments

**Production**:
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- API: http://44.197.204.18:4000
- Semantic API: http://44.197.204.18:8083

**Development**:
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: http://44.222.168.46:4000
- Semantic API: http://44.222.168.46:8083
