# AIPM Documentation Index

**Last Updated:** 2025-12-01

## 📚 Essential Documentation

### Getting Started
- **[README.md](../README.md)** - Project overview, quick start, features
- **[DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md)** - Complete development process (Discussion → Implementation → Dev → Prod)

### Development Guide
- **[DevelopmentBackground.md](../DevelopmentBackground.md)** - Comprehensive technical documentation
  - Project architecture
  - Code structure
  - API reference
  - AWS infrastructure
  - Deployment procedures
  - Troubleshooting

### AI Assistant Guidelines
- **[AI_ASSISTANT_GUIDELINES.md](../AI_ASSISTANT_GUIDELINES.md)** - Guidelines for AI-assisted development

### 🆕 Updated Architecture & Workflows (December 2025)
- **[ARCHITECTURE_UPDATE_2025.md](../ARCHITECTURE_UPDATE_2025.md)** - Current production architecture analysis
  - Actual vs documented architecture
  - Critical findings and recommendations
  - Updated technical implementation details
- **[WORKFLOW_UPDATE_2025.md](../WORKFLOW_UPDATE_2025.md)** - Current workflow analysis
  - Actual vs documented workflows
  - Performance metrics and pain points
  - Recommended improvements and tools

---

## 🗂️ Documentation Structure

```
aipm/
├── README.md                      # Start here
├── DEVELOPMENT_WORKFLOW.md        # How to develop
├── DevelopmentBackground.md       # Technical deep dive
├── AI_ASSISTANT_GUIDELINES.md    # AI guidelines
├── docs/
│   ├── INDEX.md                   # This file
│   ├── archive/                   # Old documentation
│   └── examples/                  # Sample data
└── .github/
    └── pull_request_template.md  # PR template
```

---

## 🚀 Quick Commands

### Daily Startup
```bash
./startup.sh
```

### Deploy to Development
```bash
./bin/deploy-dev
```

### Deploy to Production
```bash
./bin/deploy-prod
```

---

## 📖 Reading Order for New Developers

1. **README.md** - Understand what AIPM is
2. **DEVELOPMENT_WORKFLOW.md** - Learn the development process
3. **DevelopmentBackground.md** - Deep dive into architecture
4. **AI_ASSISTANT_GUIDELINES.md** - If using AI assistance

---

## 🗄️ Archived Documentation

Old documentation has been moved to `docs/archive/`:
- Amazon Q integration docs (superseded by current workflow)
- Old PR workflow docs (superseded by DEVELOPMENT_WORKFLOW.md)
- ECS deployment docs (not currently used)
- Legacy fix and status documents

---

## 📝 Conversation Logs

Conversation logs are automatically saved to the root directory with format:
`Conversation_AIPM_YYYYMMDD_HHMMSS.md`

These are useful for:
- Tracking development decisions
- Understanding why changes were made
- Debugging issues

**Cleanup:** Run `./cleanup-old-conversations.sh` to archive conversations older than 30 days.

---

## 🔗 External Resources

- **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **GitHub**: https://github.com/demian7575/aipm
- **AWS Console**: https://console.aws.amazon.com/

---

## 📞 Support

For questions or issues:
1. Check DevelopmentBackground.md troubleshooting section
2. Review recent conversation logs
3. Check GitHub issues
