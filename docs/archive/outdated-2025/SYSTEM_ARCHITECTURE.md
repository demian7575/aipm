# AIPM System Architecture Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER BROWSER                                     │
│                              http://aipm-static-hosting-demo                        │
└────────────────────────────────┬────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP GET (HTML/CSS/JS)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          AWS S3 STATIC HOSTING (Frontend)                           │
│  Bucket: aipm-static-hosting-demo                                                   │
│  Region: us-east-1                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ Static Files:                                                                 │ │
│  │  - index.html                                                                 │ │
│  │  - app.js (266KB)                                                             │ │
│  │  - styles.css                                                                 │ │
│  │  - mindmap.js                                                                 │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────────────┘
                                 │
                                 │ API Calls (HTTP POST/GET/PUT/DELETE)
                                 │ http://3.92.96.67/api/*
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         AWS EC2 INSTANCE (Backend API)                              │
│  IP: 3.92.96.67                                                                   │
│  Port: 8081 (internal) → 80 (nginx proxy)                                          │
│  Region: us-east-1                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ NGINX (Reverse Proxy)                                                         │ │
│  │  - Routes :80 → localhost:8081                                                │ │
│  │  - CORS headers                                                               │ │
│  │  - Static file serving                                                        │ │
│  └────────────────────────────┬──────────────────────────────────────────────────┘ │
│                                │                                                    │
│                                ▼                                                    │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ Node.js API Server (kiro-api-server-v4.js)                                    │ │
│  │  - HTTP request routing                                                       │ │
│  │  - DynamoDB operations                                                        │ │
│  │  - GitHub API integration                                                     │ │
│  │  - Template-based AI delegation                                              │ │
│  │  - Systemd service: aipm-kiro-api.service                                    │ │
│  │                                                                               │ │
│  │  Endpoints:                                                                   │ │
│  │   GET  /api/stories                                                           │ │
│  │   POST /api/stories                                                           │ │
│  │   POST /api/generate-draft                                                    │ │
│  │   POST /api/stories/:id/tests/draft                                           │ │
│  │   POST /api/analyze-invest                                                    │ │
│  │   POST /api/analyze-gwt                                                       │ │
│  │   POST /api/create-pr                                                         │ │
│  │   POST /api/trigger-deployment                                                │ │
│  │   ... (30+ endpoints)                                                         │ │
│  └────────┬──────────────────────┬─────────────────────┬──────────────────────────┘ │
│           │                      │                     │                            │
│           │ stdin/stdout         │ AWS SDK             │ Octokit                    │
│           ▼                      ▼                     ▼                            │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐                │
│  │ Kiro CLI        │   │ DynamoDB Client  │   │ GitHub API       │                │
│  │ (Child Process) │   │                  │   │ Client           │                │
│  └─────────────────┘   └──────────────────┘   └──────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────────┘
           │                      │                     │
           │                      │                     │
           ▼                      ▼                     ▼
┌─────────────────────┐ ┌──────────────────┐ ┌──────────────────────────────────────┐
│ Kiro CLI Process    │ │ AWS DynamoDB     │ │ GitHub Repository                    │
│ (Persistent)        │ │ Region: us-east-1│ │ Repo: demian7575/aipm                │
│                     │ │                  │ │                                      │
│ - Reads templates   │ │ Tables:          │ │ Branches:                            │
│ - Executes AI       │ │  - stories       │ │  - main (production)                 │
│ - Posts callbacks   │ │  - tests         │ │  - feature/* (PRs)                   │
│ - Generates code    │ │  - queue         │ │                                      │
│                     │ │                  │ │ Actions:                             │
│ Started at boot:    │ │ GSI Indexes:     │ │  - deploy-pr-to-dev.yml              │
│ kiro-cli chat       │ │  - storyId-index │ │  - Deploy to production              │
│ --trust-all-tools   │ │                  │ │                                      │
└──────┬──────────────┘ └──────────────────┘ └────────────┬─────────────────────────┘
       │                                                   │
       │ Reads                                             │ Push/PR
       ▼                                                   │
┌─────────────────────────────────────────────────────────┼─────────────────────────┐
│ Templates Directory (./templates/)                      │                         │
│  - user-story-generation.md                             │                         │
│  - acceptance-test-generation.md                        │                         │
│  - invest-analysis.md                                   │                         │
│  - gwt-health-analysis.md                               │                         │
│  - code-generation.md                                   │                         │
└─────────────────────────────────────────────────────────┘                         │
                                                                                     │
┌────────────────────────────────────────────────────────────────────────────────────┘
│
│ GitHub Actions Workflow
▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           GITHUB ACTIONS CI/CD                                      │
│                                                                                     │
│  Workflow: deploy-pr-to-dev.yml                                                    │
│  Trigger: workflow_dispatch (manual)                                               │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                                        │ │
│  │  1. Checkout PR branch                                                        │ │
│  │  2. Install dependencies                                                      │ │
│  │  3. Build frontend                                                            │ │
│  │  4. Deploy to S3 dev bucket                                                   │ │
│  │  5. Notify completion                                                         │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  Deploys to: aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com         │
└────────────────────────────────┬────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    AWS S3 DEV BUCKET (Development Frontend)                         │
│  Bucket: aipm-dev-frontend-hosting                                                  │
│  URL: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com          │
└─────────────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════
                                  DATA FLOW DIAGRAMS
═══════════════════════════════════════════════════════════════════════════════════════

1. USER STORY CREATION FLOW
───────────────────────────────

User Browser                Frontend (S3)           Backend (EC2)           Kiro CLI            DynamoDB
     │                           │                        │                     │                   │
     │ Click "Generate Story"    │                        │                     │                   │
     ├──────────────────────────>│                        │                     │                   │
     │                           │ POST /api/generate-draft                     │                   │
     │                           ├───────────────────────>│                     │                   │
     │                           │                        │ sendToKiro(prompt)  │                   │
     │                           │                        ├────────────────────>│                   │
     │                           │                        │                     │ Read template     │
     │                           │                        │                     │ user-story-       │
     │                           │                        │                     │ generation.md     │
     │                           │                        │                     │                   │
     │                           │                        │                     │ Execute AI        │
     │                           │                        │                     │ Generate JSON     │
     │                           │                        │                     │                   │
     │                           │                        │ POST /api/draft-response                │
     │                           │                        │<────────────────────┤                   │
     │                           │                        │ Store in            │                   │
     │                           │                        │ global.latestDraft  │                   │
     │                           │                        │                     │                   │
     │                           │                        │ PutCommand (story)  │                   │
     │                           │                        ├────────────────────────────────────────>│
     │                           │                        │                     │                   │
     │                           │                        │ PutCommand (tests)  │                   │
     │                           │                        ├────────────────────────────────────────>│
     │                           │                        │                     │                   │
     │                           │ { storyId: 123 }       │                     │                   │
     │                           │<───────────────────────┤                     │                   │
     │ Story created!            │                        │                     │                   │
     │<──────────────────────────┤                        │                     │                   │


2. INVEST ANALYSIS FLOW
────────────────────────

User Browser           Frontend (S3)           Backend (EC2)           Kiro CLI            DynamoDB
     │                      │                        │                     │                   │
     │ Edit story fields    │                        │                     │                   │
     ├─────────────────────>│                        │                     │                   │
     │                      │ POST /api/analyze-invest                     │                   │
     │                      ├───────────────────────>│                     │                   │
     │                      │                        │ sendToKiro(prompt)  │                   │
     │                      │                        ├────────────────────>│                   │
     │                      │                        │                     │ Read template     │
     │                      │                        │                     │ invest-analysis.md│
     │                      │                        │                     │                   │
     │                      │                        │                     │ QueryCommand      │
     │                      │                        │                     │ (get tests)       │
     │                      │                        │                     ├──────────────────>│
     │                      │                        │                     │<──────────────────┤
     │                      │                        │                     │                   │
     │                      │                        │                     │ Analyze INVEST    │
     │                      │                        │                     │ Generate warnings │
     │                      │                        │                     │                   │
     │                      │                        │ POST /api/invest-response               │
     │                      │                        │<────────────────────┤                   │
     │                      │                        │ Store in            │                   │
     │                      │                        │ global.latestInvest │                   │
     │                      │                        │                     │                   │
     │                      │                        │ UpdateCommand       │                   │
     │                      │                        │ (save investAnalysis)                   │
     │                      │                        ├────────────────────────────────────────>│
     │                      │                        │                     │                   │
     │                      │ { warnings: [...] }    │                     │                   │
     │                      │<───────────────────────┤                     │                   │
     │ Display warnings     │                        │                     │                   │
     │<─────────────────────┤                        │                     │                   │


3. CODE GENERATION & PR FLOW
─────────────────────────────

User Browser           Frontend (S3)           Backend (EC2)           GitHub API          Kiro Worker
     │                      │                        │                     │                   │
     │ Click "Generate      │                        │                     │                   │
     │ Code & PR"           │                        │                     │                   │
     ├─────────────────────>│                        │                     │                   │
     │                      │ POST /api/create-pr    │                     │                   │
     │                      ├───────────────────────>│                     │                   │
     │                      │                        │ Create branch       │                   │
     │                      │                        ├────────────────────>│                   │
     │                      │                        │                     │                   │
     │                      │                        │ Create TASK.md      │                   │
     │                      │                        ├────────────────────>│                   │
     │                      │                        │                     │                   │
     │                      │                        │ Create PR           │                   │
     │                      │                        ├────────────────────>│                   │
     │                      │                        │                     │                   │
     │                      │                        │ PutCommand (queue)  │                   │
     │                      │                        ├────────────────────────────────────────>│
     │                      │                        │                     │         DynamoDB  │
     │                      │ { prNumber: 1025 }     │                     │                   │
     │                      │<───────────────────────┤                     │                   │
     │ PR created!          │                        │                     │                   │
     │<─────────────────────┤                        │                     │                   │
     │                      │                        │                     │                   │
     │                      │                        │                     │  Poll queue       │
     │                      │                        │                     │  (every 1s)       │
     │                      │                        │                     │<──────────────────┤
     │                      │                        │                     │                   │
     │                      │                        │                     │  Checkout branch  │
     │                      │                        │                     │  git checkout     │
     │                      │                        │                     │  feature/xyz      │
     │                      │                        │                     │                   │
     │                      │                        │                     │  kiro-cli chat    │
     │                      │                        │                     │  (read template)  │
     │                      │                        │                     │                   │
     │                      │                        │                     │  Generate code    │
     │                      │                        │                     │  Commit & push    │
     │                      │                        │<────────────────────┤                   │
     │                      │                        │                     │                   │
     │                      │                        │ UpdateCommand       │                   │
     │                      │                        │ (task status)       │                   │
     │                      │                        ├────────────────────────────────────────>│


4. DEPLOYMENT FLOW
───────────────────

User Browser           Frontend (S3)           Backend (EC2)           GitHub Actions
     │                      │                        │                     │
     │ Click "Deploy to Dev"│                        │                     │
     ├─────────────────────>│                        │                     │
     │                      │ POST /api/trigger-deployment                 │
     │                      ├───────────────────────>│                     │
     │                      │                        │ Trigger workflow    │
     │                      │                        ├────────────────────>│
     │                      │                        │                     │
     │                      │                        │                     │ Checkout PR
     │                      │                        │                     │ Build frontend
     │                      │                        │                     │ Deploy to S3 dev
     │                      │                        │                     │
     │                      │ { success: true }      │                     │
     │                      │<───────────────────────┤                     │
     │ Deployment triggered!│                        │                     │
     │<─────────────────────┤                        │                     │


═══════════════════════════════════════════════════════════════════════════════════════
                              ROUTING & NETWORKING
═══════════════════════════════════════════════════════════════════════════════════════

FRONTEND ROUTING (Client-Side)
────────────────────────────────
Browser → S3 Static Website
  - All requests to http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
  - Single Page Application (SPA)
  - No server-side routing
  - JavaScript handles view changes

API ROUTING (Backend)
──────────────────────
Browser → EC2 Public IP (3.92.96.67:80)
  ↓
NGINX Reverse Proxy
  - Listen on :80
  - Proxy to localhost:8081
  - Add CORS headers
  ↓
Node.js HTTP Server (kiro-api-server-v4.js)
  - Parse URL pathname
  - Route to handlers:
    * Exact match: url.pathname === '/api/stories'
    * Regex match: url.pathname.match(/^\/api\/stories\/(\d+)$/)
    * Prefix match: url.pathname.startsWith('/api/stories/')
  - Return JSON responses

NGINX CONFIGURATION
────────────────────
/etc/nginx/conf.d/aipm.conf:
  server {
    listen 80;
    location /api/ {
      proxy_pass http://localhost:8081;
      proxy_set_header Host $host;
      add_header Access-Control-Allow-Origin *;
    }
  }

SYSTEMD SERVICE
────────────────
/etc/systemd/system/aipm-kiro-api.service:
  [Service]
  ExecStart=/usr/bin/node /home/ec2-user/aipm/scripts/kiro-api-server-v4.js
  Restart=always
  User=ec2-user

  Commands:
    sudo systemctl start aipm-kiro-api
    sudo systemctl status aipm-kiro-api
    sudo systemctl restart aipm-kiro-api


═══════════════════════════════════════════════════════════════════════════════════════
                              GIT WORKFLOW
═══════════════════════════════════════════════════════════════════════════════════════

BRANCH STRATEGY
────────────────
main (production)
  ├── feature/story-123-implement-login
  ├── feature/story-456-add-validation
  └── feature/story-789-fix-bug

WORKFLOW
─────────
1. User creates story in AIPM UI
2. User clicks "Generate Code & PR"
3. Backend creates feature branch from main
4. Backend creates PR with TASK.md
5. Kiro worker generates code and pushes to branch
6. Developer reviews PR
7. Developer clicks "Deploy to Dev" (triggers GitHub Actions)
8. GitHub Actions deploys to dev S3 bucket
9. Developer tests on dev environment
10. Developer merges PR to main
11. Production deployment (manual or automated)

PR NAMING CONVENTION
─────────────────────
create-{feature-name}-{timestamp}
Example: create-child-story-without-acceptance-tests-1768462642995

COMMIT MESSAGES
────────────────
- "Add acceptance test draft endpoint"
- "Fix when/then field display"
- "Use camelCase prNumber consistently"


═══════════════════════════════════════════════════════════════════════════════════════
                              SECURITY & ACCESS
═══════════════════════════════════════════════════════════════════════════════════════

AWS CREDENTIALS
────────────────
EC2 Instance Profile:
  - DynamoDB read/write access
  - S3 read/write access (for deployments)

GitHub Access:
  - Personal Access Token (PAT) stored in environment
  - Used by Octokit for PR creation

CORS POLICY
────────────
Backend allows all origins (*) for development
Production should restrict to specific domains

KIRO CLI TRUST
────────────────
Started with --trust-all-tools flag
  - Executes tools without confirmation
  - Required for automated workflows
  - Security risk: only use in controlled environment


═══════════════════════════════════════════════════════════════════════════════════════
                              MONITORING & LOGS
═══════════════════════════════════════════════════════════════════════════════════════

BACKEND LOGS
─────────────
Location: /tmp/kiro-cli-live.log
View: GET /api/kiro-live-log
Systemd: journalctl -u aipm-kiro-api -f

FRONTEND LOGS
──────────────
Browser console (F12)
Network tab for API calls

GITHUB ACTIONS LOGS
────────────────────
https://github.com/demian7575/aipm/actions
View workflow runs and deployment status
```
