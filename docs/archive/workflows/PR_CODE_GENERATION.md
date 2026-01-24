# PR Creation & Code Generation Workflow

## 🔄 Complete Workflow Overview

```mermaid
graph TD
    A[Select User Story] --> B[Click Create PR]
    B --> C[Auto-generate PR Details]
    C --> D[Create GitHub Branch]
    D --> E[Create Placeholder File]
    E --> F[Create GitHub PR]
    F --> G[Store PR in Database]
    G --> H[Display Development Task Card]
    H --> I[Click Generate Code]
    I --> J[Create Fresh Generation Branch]
    J --> K[Call Kiro AI Service]
    K --> L[Generate Code]
    L --> M[Commit Generated Code]
    M --> N[Update PR Target Branch]
    N --> O[Show Success Notification]
    
    classDef userAction fill:#e3f2fd
    classDef systemAction fill:#f3e5f5
    classDef aiAction fill:#fff3e0
    classDef gitAction fill:#e8f5e8
    
    class A,B,I userAction
    class C,G,H,O systemAction
    class K,L aiAction
    class D,E,F,J,M,N gitAction
```

## 📋 PR Creation Process

### 1. User Interaction
```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend
    participant API as Backend
    participant GH as GitHub API
    participant DDB as DynamoDB
    
    User->>UI: Click "Create PR"
    UI->>UI: Generate Default Values
    Note over UI: Branch: feature-story-{id}-{timestamp}<br/>Title: Story Title<br/>Body: Story Description
    
    UI->>API: POST /api/create-pr
    API->>GH: Get Main Branch SHA
    GH-->>API: SHA Response
    
    API->>GH: Create New Branch
    GH-->>API: Branch Created
    
    API->>GH: Create Placeholder File
    Note over API: TASK-{storyId}-{timestamp}.md
    GH-->>API: File Committed
    
    API->>GH: Create Pull Request
    GH-->>API: PR Details
    
    API->>DDB: Store PR Entry
    DDB-->>API: Stored
    
    API-->>UI: PR Created Response
    UI->>UI: Update Development Tasks
    UI-->>User: Show Success Toast
```

### 2. Branch Conflict Resolution
```mermaid
graph TD
    A[Attempt Branch Creation] --> B{Branch Exists?}
    B -->|No| C[Create Branch Successfully]
    B -->|Yes| D[Append -1 to Name]
    D --> E[Retry Branch Creation]
    E --> F{Branch Exists?}
    F -->|No| G[Create Branch Successfully]
    F -->|Yes| H[Append -2 to Name]
    H --> I[Continue Until Success]
    I --> J[Max 5 Attempts]
    J --> K{Success?}
    K -->|Yes| C
    K -->|No| L[Throw Error]
```

## 🤖 Code Generation Process

### 1. Fresh Branch Strategy
```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend
    participant API as Backend
    participant Kiro as Kiro AI
    participant GH as GitHub API
    
    User->>UI: Click "Generate Code"
    UI->>API: POST /api/generate-code-branch
    
    API->>GH: Get Latest Main SHA
    GH-->>API: Main SHA
    
    API->>GH: Create Generation Branch
    Note over API: {original-branch}-gen-{timestamp}
    GH-->>API: Branch Created
    
    API->>Kiro: POST /kiro/v4/enhance
    Note over API: Prompt: Story Description
    Kiro-->>API: Generated Code
    
    API->>GH: Commit Generated Code
    GH-->>API: Commit SHA
    
    API->>GH: Update PR Target Branch
    GH-->>API: PR Updated
    
    API-->>UI: Generation Complete
    UI-->>User: Show Success with Branch Info
```

### 2. Code Generation Flow
```mermaid
graph LR
    A[Story Description] --> B[Kiro AI Service]
    B --> C[Generated Code]
    C --> D[Auto-commit to Branch]
    D --> E[Update PR]
    E --> F[Notify User]
    
    subgraph "AI Processing"
        B1[Parse Requirements]
        B2[Generate Implementation]
        B3[Format Output]
        B --> B1 --> B2 --> B3
    end
    
    classDef input fill:#e3f2fd
    classDef ai fill:#fff3e0
    classDef output fill:#e8f5e8
    
    class A input
    class B,B1,B2,B3 ai
    class C,D,E,F output
```

## ⚡ Optimizations Implemented

### 1. No-Modal Workflow
- **Before**: Modal → Form → Submit → Process
- **After**: Click → Process → Complete

### 2. Smart Defaults
- **Branch Name**: `feature-story-{id}-{timestamp}`
- **PR Title**: Story title
- **PR Body**: Story description with acceptance criteria
- **Code Prompt**: Story description or title

### 3. Fresh Branch Generation
- **Problem**: Conflicts and stale code
- **Solution**: Always create from latest main
- **Benefit**: Clean, conflict-free code generation

## 🔧 Error Handling

### Branch Creation Errors
```mermaid
graph TD
    A[Branch Creation] --> B{Error Type}
    B -->|422 Already Exists| C[Try with Suffix]
    B -->|403 Permission| D[Show Auth Error]
    B -->|Network Error| E[Retry with Backoff]
    B -->|Other| F[Show Generic Error]
    
    C --> G[Increment Counter]
    G --> H{Max Attempts?}
    H -->|No| A
    H -->|Yes| I[Fail with Error]
```

### Code Generation Errors
- **Timeout**: 30-second limit with clear error message
- **AI Service Down**: Graceful fallback with retry option
- **Invalid Response**: Parse error handling with diagnostics

## 📊 Performance Metrics

- **PR Creation Time**: ~3-5 seconds
- **Code Generation Time**: ~10-30 seconds
- **Success Rate**: >95% for PR creation
- **User Satisfaction**: One-click workflow

---

**Last Updated**: December 29, 2025  
**Version**: 4.0.6
