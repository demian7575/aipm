# System Architecture Overview

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Web UI - S3 Static Hosting]
        Terminal[Kiro Terminal]
    end
    
    subgraph "Backend Services"
        API[Node.js API Server]
        Kiro[Kiro AI Service]
        TermSrv[Terminal Server]
    end
    
    subgraph "Data Layer"
        DDB[DynamoDB Tables]
        S3[S3 Storage]
    end
    
    subgraph "External Services"
        GitHub[GitHub API]
        OpenAI[OpenAI API]
    end
    
    UI --> API
    Terminal --> API
    Terminal --> Kiro
    API --> DDB
    API --> S3
    API --> GitHub
    Kiro --> OpenAI
    
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef data fill:#e8f5e8
    classDef external fill:#fff3e0
    
    class UI,Terminal frontend
    class API,Kiro,TermSrv backend
    class DDB,S3 data
    class GitHub,OpenAI external
```

## 🌐 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        ProdFE[S3: aipm-static-hosting-demo]
        ProdBE[EC2: 44.220.45.57]
        ProdDDB[DynamoDB: aipm-backend-prod-*]
    end
    
    subgraph "Development Environment"
        DevFE[S3: aipm-dev-frontend-hosting]
        DevBE[EC2: 44.222.168.46]
        DevDDB[DynamoDB: aipm-backend-dev-*]
    end
    
    subgraph "CI/CD Pipeline"
        GHA[GitHub Actions]
        Deploy[Deployment Scripts]
    end
    
    GHA --> ProdFE
    GHA --> ProdBE
    Deploy --> DevFE
    Deploy --> DevBE
    
    classDef prod fill:#ffebee
    classDef dev fill:#e8f5e8
    classDef cicd fill:#e3f2fd
    
    class ProdFE,ProdBE,ProdDDB prod
    class DevFE,DevBE,DevDDB dev
    class GHA,Deploy cicd
```

## 🔧 Component Responsibilities

### Frontend Layer
- **Web UI**: React-like vanilla JS application for story management
- **Kiro Terminal**: Real-time terminal interface for AI interactions
- **Static Assets**: CSS, images, configuration files

### Backend Services
- **API Server**: RESTful API handling CRUD operations
- **Kiro Service**: AI-powered code generation and enhancement
- **Terminal Server**: WebSocket server for terminal functionality

### Data Layer
- **DynamoDB**: Primary data storage for stories, tests, tasks
- **S3**: Static file hosting and deployment artifacts

### External Integrations
- **GitHub API**: PR creation, branch management, repository operations
- **OpenAI API**: AI-powered story analysis and code generation

## 📊 Service Communication

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant API as Backend API
    participant DDB as DynamoDB
    participant GH as GitHub API
    participant Kiro as Kiro Service
    
    UI->>API: Create Story
    API->>DDB: Store Story
    DDB-->>API: Confirm
    API-->>UI: Story Created
    
    UI->>API: Create PR
    API->>GH: Create Branch & PR
    GH-->>API: PR Details
    API->>DDB: Store PR Info
    API-->>UI: PR Created
    
    UI->>API: Generate Code
    API->>Kiro: Code Generation Request
    Kiro-->>API: Generated Code
    API->>GH: Commit to Branch
    API-->>UI: Code Generated
```

## 🔐 Security Architecture

- **Authentication**: GitHub token-based authentication
- **Authorization**: Repository-level permissions
- **Data Encryption**: HTTPS/TLS for all communications
- **Access Control**: Environment-based resource isolation

## 📈 Scalability Considerations

- **Horizontal Scaling**: Multiple EC2 instances behind load balancer
- **Database Scaling**: DynamoDB auto-scaling enabled
- **CDN**: CloudFront for static asset delivery
- **Caching**: Application-level caching for frequently accessed data

---

**Last Updated**: December 29, 2025  
**Version**: 4.0.6
