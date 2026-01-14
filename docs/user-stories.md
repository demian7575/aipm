# AIPM User Stories

This document contains all user stories organized by category hierarchy.

## 1. Core Services
Backend APIs, data layer, and development environment

#### L2: Capacity planning
- **ID**: 1768382866688
- **Description**: Capacity planning related features

---

## 2. Platform Architecture
System architecture, infrastructure, and integration patterns

#### AI-Engine
- **ID**: 1768383685917
- **Description**: AI engine integration

---

## 3. User Experience
Frontend UI, UX patterns, and user interactions

### 3.1 Configuration & Environment

#### A1: Describe runtime topology
- **ID**: 1768381158890
- **Description**: Runtime topology documentation

#### A2: Environment endpoints
- **ID**: 1768381192868
- **Description**: Environment endpoint configuration

### 3.2 Core Features

#### B1: Story CRUD
- **ID**: 1768381397587
- **Description**: Story create, read, update, delete operations

#### B3: GitHub automation endpoints
- **ID**: 1768381466516
- **Description**: GitHub automation API endpoints

#### B5: File uploads
- **ID**: 1768381534956
- **Description**: File upload functionality

### 3.3 UI Components

#### C1: Panel synchronization
- **ID**: 1768381744921
- **Description**: Synchronize outline, mindmap, and detail panels

#### C2: Mindmap layout control
- **ID**: 1768381779660
- **Description**: Auto-layout toggle and manual positioning

#### C3: Modal workflows
- **ID**: 1768381814237
- **Description**: Modal forms with validation and warning overrides

#### C4: Story detail richness
- **ID**: 1768381848790
- **Description**: Comprehensive story detail view with metadata

#### C5: Employee Heat Map
- **ID**: 1768381883358
- **Description**: Workload visualization by assignee and component

#### C6: Export and document generation
- **ID**: 1768381917685
- **Description**: Generate test and requirement documents

### 3.4 Setup & Bootstrap

#### D1: Local bootstrap
- **ID**: 1768381604398
- **Description**: Local development environment setup

#### D3: AWS/IAM setup
- **ID**: 1768381674426
- **Description**: AWS and IAM configuration

### 3.5 Workflows

#### E4: Code generation workflow
- **ID**: 1768382091247
- **Description**: Automated code generation workflow

### 3.6 Testing UI

#### F1: Gating suites
- **ID**: 1768382300171
- **Description**: Test gating suite interface

#### F2: Browser validation
- **ID**: 1768382334815
- **Description**: Browser compatibility validation

#### F3: Test command guidance
- **ID**: 1768382369376
- **Description**: Test command documentation and guidance

### 3.7 Security

#### G1: Token handling
- **ID**: 1768382404357
- **Description**: Secure token management

#### G2: Secrets in configs
- **ID**: 1768382439028
- **Description**: Configuration secret management

#### G3: Access control/IAM
- **ID**: 1768382474438
- **Description**: Access control and IAM policies

#### G4: Data protection
- **ID**: 1768382510010
- **Description**: Data protection and encryption

### 3.8 CI/CD

#### H4: CI/CD workflows
- **ID**: 1768382230535
- **Description**: Continuous integration and deployment workflows

### 3.9 Monitoring

#### I4: Performance diagnostics
- **ID**: 1768382688925
- **Description**: Performance monitoring and diagnostics

### 3.10 Configuration Management

#### J2: Feature flagging
- **ID**: 1768382760219
- **Description**: Feature flag management

### 3.11 AI Integration

#### K2: Kiro CLI/API
- **ID**: 1768381295030
- **Description**: Kiro CLI and API integration

### 3.12 Operations

#### L1: Routine maintenance
- **ID**: 1768382831403
- **Description**: Routine system maintenance

#### L3: Disaster recovery
- **ID**: 1768382902249
- **Description**: Disaster recovery procedures

### 3.13 UI Improvements

#### Remove "Health (GWT)" from Acceptance Test view
- **ID**: 1768383614746

#### Change Details Panel Summary Row to INVEST
- **ID**: 1768384044842

#### Auto-generate acceptance tests in Create Child Story modal
- **ID**: 1768384080833

#### User Interface
- **ID**: 1768383508103

#### Fix Done Button Functionality in Story Details
- **ID**: 1768383793928

#### Fix Mindmap Position Persistence Bug
- **ID**: 1768384117287

#### Hide User Story when the User Story is "Done" status
- **ID**: 1768383829683

#### Remove redundant strings from INVEST row content
- **ID**: 1768383543779

#### Clean up the Development Tasks card interface
- **ID**: 1768383579293
- **Description**: Remove unnecessary git workflow fields (Branch, PR Status, Rebase)

#### Show User Story ID on User Story Details
- **ID**: 1768383650393

#### Stop Tracking Closes Connected PR
- **ID**: 1768384009008

#### Display GitHub PR Link in Development Task Card
- **ID**: 1768384154262

#### Add Vertical Scroll Bar to AIPM Structured Gating Tests Page
- **ID**: 1768383758071

#### Create PR directly when click "Create PR" button
- **ID**: 1768383721614
- **Description**: Without opening any modal

#### Streamline Dependencies Section Interface
- **ID**: 1768383901366

#### Streamline Development Tasks Card by Removing Git-Related Fields
- **ID**: 1768383865049

---

## 4. Quality & Security
Testing, quality gates, and security compliance

#### E1: Story lifecycle
- **ID**: 1768381986752
- **Description**: Story status lifecycle management

#### B2: Acceptance tests linkage
- **ID**: 1768381432142
- **Description**: Link acceptance tests to stories

---

## 5. Operations
Monitoring, configuration, and operational maintenance

#### I2: Log access
- **ID**: 1768382617631
- **Description**: System log access and management

---

## 6. Development & Delivery
Development workflows, PR process, and deployment

### 6.1 Compatibility

#### A3: Legacy compatibility
- **ID**: 1768381226902
- **Description**: Legacy system compatibility (Lambda/serverless-express)

### 6.2 External Integrations

#### K1: GitHub REST usage
- **ID**: 1768381260953
- **Description**: GitHub REST API integration

#### K3: AWS services mix
- **ID**: 1768381329067
- **Description**: AWS services integration

### 6.3 API Endpoints

#### B4: Health/config endpoints
- **ID**: 1768381500728
- **Description**: Health check and configuration endpoints

#### B6: Data model parity
- **ID**: 1768381570117
- **Description**: Data model consistency across services

### 6.4 Environment

#### D2: Env vars reference
- **ID**: 1768381639715
- **Description**: Environment variable documentation

### 6.5 PR & Deployment

#### E2: PR creation/assignment
- **ID**: 1768382021306
- **Description**: Automated PR creation and assignment

#### E3: Deployment dispatch
- **ID**: 1768382056718
- **Description**: Deployment workflow dispatch

### 6.6 Deployment

#### H1: Production deploy
- **ID**: 1768382126416
- **Description**: Production deployment process

#### H2: Development deploy
- **ID**: 1768382160867
- **Description**: Development environment deployment

#### H3: Unified configuration
- **ID**: 1768382195665
- **Description**: Unified deployment configuration

### 6.7 Operations

#### I1: Health probes
- **ID**: 1768382582085
- **Description**: System health monitoring probes

#### I3: Troubleshooting playbook
- **ID**: 1768382653799
- **Description**: Troubleshooting documentation and procedures

### 6.8 Configuration

#### J1: Environment-specific configs
- **ID**: 1768382724297
- **Description**: Environment-specific configuration management

#### J3: Runtime versioning
- **ID**: 1768382796438
- **Description**: Runtime version management

### 6.9 Automation

#### Automatic Version Numbering System
- **ID**: 1768383937236
- **Description**: Automated version number generation

#### User Story Generation
- **ID**: 1768383973312
- **Description**: Automated user story generation

---

## Summary

- **Total Stories**: 93
  - 6 Root Categories
  - 22 Sub-Categories
  - 65 Leaf Stories
- **Total Acceptance Tests**: 196
- **Average Tests per Story**: ~2.1
