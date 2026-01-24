# AIPM Documentation

**AI Project Manager** - Self-hosted mindmap and outline workspace for managing user stories, acceptance tests, and AI-powered code generation.

## 📖 Quick Links

- **[🚀 Getting Started](GETTING_STARTED.md)** - Complete setup guide for Kiro
- **[Configuration](CONFIGURATION.md)** - Environment setup and configuration
- **[Architecture](ARCHITECTURE.md)** - System design and components
- **[API Reference](API_REFERENCE.md)** - REST API endpoints
- **[Development](DEVELOPMENT.md)** - Development workflow and guidelines
- **[Deployment](DEPLOYMENT.md)** - Deployment procedures
- **[Testing](TESTING.md)** - Testing strategy and gating tests

## 🏗️ System Overview

AIPM is a full-stack application for managing software projects with AI assistance:

- **Frontend**: Vanilla JavaScript with mindmap visualization
- **Backend**: Node.js REST API with DynamoDB storage
- **AI Integration**: Semantic API with Kiro CLI for code generation
- **Deployment**: AWS EC2 + S3 static hosting

## 🚀 Current Endpoints

**Production:**
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- API: http://44.197.204.18:4000
- Semantic API: http://44.197.204.18:8083

**Development:**
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: http://44.222.168.46:4000
- Semantic API: http://44.222.168.46:8083

## 📚 Additional Resources

- **[Lessons Learned](lessons/BEST_PRACTICES.md)** - Development best practices
- **[AI Assistant Guidelines](AI_ASSISTANT_GUIDELINES.md)** - Working with AI tools
- **[User Stories](user-stories.md)** - Project user stories

## 🗂️ Archive

Historical documentation is preserved in `archive/` for reference:
- `archive/kiro-api/` - Old KIRO API architecture
- `archive/legacy/` - Legacy implementation docs
- `archive/outdated-2025/` - Superseded 2025 documentation

## 🔄 Last Updated

January 24, 2026 - Documentation consolidated and updated to reflect current system state.
