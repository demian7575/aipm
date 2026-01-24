# Rules & Lessons Learned Management System Setup

Copy and paste this prompt to Kiro CLI to set up the automated rules management system in any repository:

---

## Prompt for Kiro CLI:

```
I want to set up an automated rules and lessons learned management system for this repository. Please create:

1. **docs/RULES.md** with this structure:
   - Last Updated date
   - Critical Rules section (rules that must be followed)
   - Important Constraints section (technical/performance/security/cost)
   - Lessons Learned section (with date, impact level, lesson, action taken)
   - Automatic Update Process section
   - Metrics to Track section
   - Integration with Development section

2. **scripts/review-rules.sh** that:
   - Calculates days since last update
   - Shows "UP TO DATE" if < 30 days, "⚠️ REVIEW NEEDED" if >= 30 days
   - Lists recent incidents (fixes) from last 30 days
   - Lists new features from last 30 days
   - Shows compliance metrics (hardcoded values, direct main commits, test skips)
   - Provides review checklist
   - Suggests Kiro commands for help
   - Make it executable (chmod +x)

3. **.github/workflows/monthly-rules-review.yml** that:
   - Runs on 1st of every month at 9 AM
   - Can be manually triggered
   - Creates GitHub Issue with:
     - Title: "📅 Monthly Rules & Lessons Learned Review - YYYY-MM"
     - Body with review checklist
     - Recent incidents and features
     - Compliance metrics
     - Links to RULES.md and review script
   - Assigns to repository team

4. **Update .kirocontext** (or create if missing):
   - Add reference to docs/RULES.md
   - Add note that Kiro should be aware of project rules

Please use the AIPM repository implementation as reference:
- /repo/ebaejun/tools/aws/aipm/docs/RULES.md
- /repo/ebaejun/tools/aws/aipm/scripts/review-rules.sh
- /repo/ebaejun/tools/aws/aipm/.github/workflows/monthly-rules-review.yml

Adapt the content to this repository's specific needs, but keep the same structure and automation.
```

---

## What This Creates:

### 📚 Documentation
- **docs/RULES.md**: Central place for all rules, constraints, and lessons learned
- Automatically reviewed monthly
- Never becomes outdated

### 🤖 Automation
- **scripts/review-rules.sh**: Manual review script with metrics
- **.github/workflows/monthly-rules-review.yml**: Automatic monthly GitHub Issues
- Tracks compliance metrics automatically

### 🔗 Integration
- **.kirocontext**: Kiro knows all project rules
- Can ask: "What are the project rules?"
- Can ask: "Review recent incidents and suggest rule updates"

### 📊 Benefits
- ✅ Rules never become outdated (monthly review)
- ✅ Lessons learned are documented and applied
- ✅ Compliance automatically tracked
- ✅ Team reminded via GitHub Issues
- ✅ Kiro aware of all rules
- ✅ New developers learn quickly

---

## Quick Start After Setup:

```bash
# Manual review anytime
./scripts/review-rules.sh

# Ask Kiro about rules
kiro-cli chat "What are the project rules?"

# Get help updating rules
kiro-cli chat "Review recent incidents and suggest rule updates"
```

---

## Customization Tips:

1. **Adjust metrics** in review script for your repo's needs
2. **Change schedule** in workflow (default: 1st of month at 9 AM)
3. **Add repo-specific rules** to RULES.md
4. **Update compliance targets** based on your standards

---

## Example Usage:

```bash
# In your new repository
cd /path/to/your/repo

# Start Kiro
kiro-cli chat

# Paste the prompt above
# Kiro will create all files and set up the system

# Test it
./scripts/review-rules.sh

# Commit
git add -A
git commit -m "feat: add automated rules and lessons learned management"
git push
```

---

## Maintenance:

The system is self-maintaining:
- GitHub Actions creates monthly issues automatically
- Review script shows what needs attention
- Kiro helps with updates
- Team stays aligned on rules and lessons

**No manual tracking needed!** 🎯
