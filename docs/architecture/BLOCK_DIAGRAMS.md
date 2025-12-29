# Component Block Diagrams

## 🏗️ Frontend Architecture

```mermaid
graph TB
    subgraph "Web Application Layer"
        UI[index.html]
        CSS[styles.css]
        JS[app.js]
        Config[config.js]
    end
    
    subgraph "Terminal Interface"
        Terminal[kiro-live.html]
        TermJS[Terminal JavaScript]
        ANSI[ANSI Converter]
    end
    
    subgraph "Static Assets"
        Images[Images & Icons]
        Vendor[Vendor Libraries]
        Docs[Documentation]
    end
    
    subgraph "Configuration"
        ProdConfig[config-prod.js]
        DevConfig[config-dev.js]
        EnvConfig[Environment Detection]
    end
    
    UI --> JS
    UI --> CSS
    JS --> Config
    Terminal --> TermJS
    TermJS --> ANSI
    Config --> EnvConfig
    EnvConfig --> ProdConfig
    EnvConfig --> DevConfig
    
    classDef core fill:#e3f2fd
    classDef terminal fill:#fff3e0
    classDef assets fill:#f3e5f5
    classDef config fill:#e8f5e8
    
    class UI,CSS,JS core
    class Terminal,TermJS,ANSI terminal
    class Images,Vendor,Docs assets
    class ProdConfig,DevConfig,EnvConfig,Config config
```

## 🔧 Backend Services Architecture

```mermaid
graph TB
    subgraph "API Server (Node.js)"
        Router[Request Router]
        Auth[Authentication]
        Stories[Story Handlers]
        PRs[PR Handlers]
        Tests[Test Handlers]
        Tasks[Task Handlers]
    end
    
    subgraph "Data Access Layer"
        DDBClient[DynamoDB Client]
        SQLEmul[SQLite Emulation]
        FileSystem[File System]
    end
    
    subgraph "External Integrations"
        GitHubAPI[GitHub API Client]
        OpenAIAPI[OpenAI API Client]
        KiroAPI[Kiro API Client]
    end
    
    subgraph "Utility Services"
        Logger[Logging Service]
        Config[Configuration Manager]
        Health[Health Checks]
    end
    
    Router --> Auth
    Router --> Stories
    Router --> PRs
    Router --> Tests
    Router --> Tasks
    
    Stories --> DDBClient
    PRs --> GitHubAPI
    Tests --> DDBClient
    Tasks --> DDBClient
    
    Stories --> SQLEmul
    PRs --> KiroAPI
    
    Auth --> Config
    Health --> DDBClient
    Health --> GitHubAPI
    
    classDef api fill:#e3f2fd
    classDef data fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef utility fill:#f3e5f5
    
    class Router,Auth,Stories,PRs,Tests,Tasks api
    class DDBClient,SQLEmul,FileSystem data
    class GitHubAPI,OpenAIAPI,KiroAPI external
    class Logger,Config,Health utility
```

## 🗄️ Data Layer Architecture

```mermaid
graph TB
    subgraph "DynamoDB Tables"
        StoriesTable[aipm-backend-*-stories]
        TestsTable[aipm-backend-*-acceptance-tests]
        TasksTable[aipm-backend-*-tasks]
        PRsTable[Story PR Relationships]
    end
    
    subgraph "S3 Buckets"
        ProdBucket[aipm-static-hosting-demo]
        DevBucket[aipm-dev-frontend-hosting]
        DeployBucket[aipm-deployments-*]
    end
    
    subgraph "File Storage"
        Uploads[Backend Uploads]
        Logs[Application Logs]
        Configs[Configuration Files]
    end
    
    subgraph "Data Relationships"
        StoryPR[Story ↔ PR]
        StoryTest[Story ↔ Tests]
        StoryTask[Story ↔ Tasks]
        ParentChild[Story Hierarchy]
    end
    
    StoriesTable --> StoryPR
    StoriesTable --> StoryTest
    StoriesTable --> StoryTask
    StoriesTable --> ParentChild
    
    TestsTable --> StoryTest
    TasksTable --> StoryTask
    PRsTable --> StoryPR
    
    classDef dynamodb fill:#ff9800,color:#fff
    classDef s3 fill:#4caf50,color:#fff
    classDef files fill:#9c27b0,color:#fff
    classDef relations fill:#2196f3,color:#fff
    
    class StoriesTable,TestsTable,TasksTable,PRsTable dynamodb
    class ProdBucket,DevBucket,DeployBucket s3
    class Uploads,Logs,Configs files
    class StoryPR,StoryTest,StoryTask,ParentChild relations
```

## 🔄 Service Communication Flow

```mermaid
graph LR
    subgraph "Client Layer"
        Browser[Web Browser]
        Terminal[Terminal Client]
    end
    
    subgraph "Load Balancer"
        ALB[Application Load Balancer]
        CloudFront[CloudFront CDN]
    end
    
    subgraph "Application Layer"
        EC2Prod[Production EC2]
        EC2Dev[Development EC2]
    end
    
    subgraph "Service Layer"
        KiroSvc[Kiro AI Service]
        TermSvc[Terminal Service]
        APISvc[API Service]
    end
    
    subgraph "Data Layer"
        DynamoDB[(DynamoDB)]
        S3[(S3 Storage)]
    end
    
    Browser --> CloudFront
    Terminal --> ALB
    CloudFront --> S3
    ALB --> EC2Prod
    ALB --> EC2Dev
    
    EC2Prod --> APISvc
    EC2Prod --> KiroSvc
    EC2Prod --> TermSvc
    
    APISvc --> DynamoDB
    APISvc --> S3
    KiroSvc --> DynamoDB
    
    classDef client fill:#e3f2fd
    classDef lb fill:#fff3e0
    classDef app fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef data fill:#ffebee
    
    class Browser,Terminal client
    class ALB,CloudFront lb
    class EC2Prod,EC2Dev app
    class KiroSvc,TermSvc,APISvc service
    class DynamoDB,S3 data
```

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        GitHubAuth[GitHub OAuth]
        TokenMgmt[Token Management]
        SessionMgmt[Session Management]
    end
    
    subgraph "Authorization Layer"
        RBAC[Role-Based Access]
        RepoPerms[Repository Permissions]
        APIKeys[API Key Management]
    end
    
    subgraph "Network Security"
        HTTPS[HTTPS/TLS]
        CORS[CORS Policy]
        RateLimit[Rate Limiting]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        Secrets[Secret Management]
        Audit[Audit Logging]
    end
    
    GitHubAuth --> TokenMgmt
    TokenMgmt --> SessionMgmt
    SessionMgmt --> RBAC
    RBAC --> RepoPerms
    RepoPerms --> APIKeys
    
    HTTPS --> CORS
    CORS --> RateLimit
    
    Encryption --> Secrets
    Secrets --> Audit
    
    classDef auth fill:#4caf50,color:#fff
    classDef authz fill:#ff9800,color:#fff
    classDef network fill:#2196f3,color:#fff
    classDef data fill:#9c27b0,color:#fff
    
    class GitHubAuth,TokenMgmt,SessionMgmt auth
    class RBAC,RepoPerms,APIKeys authz
    class HTTPS,CORS,RateLimit network
    class Encryption,Secrets,Audit data
```

## 📊 Monitoring & Observability

```mermaid
graph TB
    subgraph "Application Metrics"
        APIMet[API Response Times]
        ErrorMet[Error Rates]
        UserMet[User Activity]
    end
    
    subgraph "Infrastructure Metrics"
        EC2Met[EC2 Performance]
        DDBMet[DynamoDB Metrics]
        S3Met[S3 Usage]
    end
    
    subgraph "Logging"
        AppLogs[Application Logs]
        AccessLogs[Access Logs]
        ErrorLogs[Error Logs]
    end
    
    subgraph "Alerting"
        CloudWatch[CloudWatch Alarms]
        SNS[SNS Notifications]
        Dashboard[Monitoring Dashboard]
    end
    
    APIMet --> CloudWatch
    ErrorMet --> CloudWatch
    UserMet --> Dashboard
    
    EC2Met --> CloudWatch
    DDBMet --> CloudWatch
    S3Met --> Dashboard
    
    AppLogs --> CloudWatch
    AccessLogs --> CloudWatch
    ErrorLogs --> SNS
    
    CloudWatch --> SNS
    SNS --> Dashboard
    
    classDef app fill:#e3f2fd
    classDef infra fill:#f3e5f5
    classDef logs fill:#fff3e0
    classDef alert fill:#e8f5e8
    
    class APIMet,ErrorMet,UserMet app
    class EC2Met,DDBMet,S3Met infra
    class AppLogs,AccessLogs,ErrorLogs logs
    class CloudWatch,SNS,Dashboard alert
```

---

**Last Updated**: December 29, 2025  
**Version**: 4.0.6
