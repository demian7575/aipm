# Generate Code & PR - Quick Reference

## ✅ System Status Check

```bash
# Run diagnostics
./diagnose-generate-flow.sh
```

## 🚀 Using the Feature

1. **Open AIPM**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
2. **Select story** → Scroll to "Development Tasks"
3. **Click "Generate Code & PR"**
4. **Fill form** → Submit
5. **Wait 2-10 minutes** for code generation
6. **Review PR** → Merge

## 📊 Monitoring

```bash
# Check EC2 server
curl http://3.92.96.67:8080/health

# Watch logs in real-time
ssh ec2-user@3.92.96.67 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'

# Check Kiro process
ssh ec2-user@3.92.96.67 'ps aux | grep kiro-cli'
```

## 🔧 Troubleshooting

### Restart Terminal Server
```bash
./scripts/workers/start-kiro-terminal.sh
```

### Check Recent Activity
```bash
ssh ec2-user@3.92.96.67 'tail -50 /home/ec2-user/aipm/scripts/workers/terminal-server.log'
```

### Manual Push (if needed)
```bash
ssh ec2-user@3.92.96.67 'cd /home/ec2-user/aipm && git status && git push origin <branch>'
```

## 🏗️ Architecture

```
AIPM UI → Backend API → EC2 (3.92.96.67:8080) → Kiro CLI → GitHub PR
```

## 📝 Form Fields

| Field | Example | Required |
|-------|---------|----------|
| Repository API URL | `https://api.github.com` | ✅ |
| Owner | `demian7575` | ✅ |
| Repository | `aipm` | ✅ |
| Branch name | `feature/my-feature` | ✅ |
| Task title | `Add PDF export` | ✅ |
| Objective | `Implement PDF export for stories` | ✅ |
| PR title | `feat: Add PDF export` | ✅ |
| Constraints | `Use existing PDF library` | ❌ |
| Acceptance criteria | `- Export button visible`<br>`- PDF downloads correctly` | ❌ |

## ⚡ Quick Commands

```bash
# Full diagnostics
./diagnose-generate-flow.sh

# Check server health
curl http://3.92.96.67:8080/health

# Restart server
./scripts/workers/start-kiro-terminal.sh

# View logs
ssh ec2-user@3.92.96.67 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'

# Check git status on EC2
ssh ec2-user@3.92.96.67 'cd /home/ec2-user/aipm && git status'
```

## 🎯 Best Practices

### ✅ Good Task Description
```
Objective: Add export to PDF feature
Constraints: Use jsPDF library, maintain UI consistency
Acceptance Criteria:
- Export button in story detail panel
- PDF includes title, description, tests
- Filename matches story title
```

### ❌ Bad Task Description
```
Objective: Make it better
Constraints: None
Acceptance Criteria: Should work
```

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| PR created but no code | Check logs, restart server |
| Kiro stuck on approval | Auto-approves with 't', restart if stuck |
| Timeout after 10 min | Check logs, may need manual intervention |
| Git push fails | Check git status, push manually |

## 📚 Full Documentation

See [GENERATE_CODE_PR_GUIDE.md](docs/GENERATE_CODE_PR_GUIDE.md) for complete guide.
