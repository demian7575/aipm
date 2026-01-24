#!/bin/bash
# Monthly Rules Review Reminder
# Add to crontab: 0 9 1 * * /path/to/aipm/scripts/review-rules.sh

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULES_FILE="$REPO_DIR/docs/RULES.md"
CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_MONTH=$(date +%Y-%m)

echo "📅 Monthly Rules Review - $CURRENT_DATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if rules file exists
if [[ ! -f "$RULES_FILE" ]]; then
    echo "❌ Rules file not found: $RULES_FILE"
    exit 1
fi

# Get last update date from rules file
LAST_UPDATE=$(grep "Last Updated" "$RULES_FILE" | head -1 | sed 's/.*: //')
echo "📝 Last Updated: $LAST_UPDATE"

# Calculate days since last update
LAST_UPDATE_EPOCH=$(date -d "$LAST_UPDATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAST_UPDATE" +%s 2>/dev/null || echo "0")
CURRENT_EPOCH=$(date +%s)
DAYS_SINCE=$((($CURRENT_EPOCH - $LAST_UPDATE_EPOCH) / 86400))

echo "📊 Days since last update: $DAYS_SINCE"

# Check if review is overdue
if [[ $DAYS_SINCE -gt 35 ]]; then
    echo "⚠️  OVERDUE: Rules review is overdue by $((DAYS_SINCE - 30)) days!"
elif [[ $DAYS_SINCE -gt 30 ]]; then
    echo "⏰ DUE: Rules review is due!"
else
    echo "✅ UP TO DATE: Next review in $((30 - DAYS_SINCE)) days"
fi

echo ""
echo "📋 Review Checklist:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[ ] Review all rules - are they still relevant?"
echo "[ ] Check constraints - any changes needed?"
echo "[ ] Update lessons learned - any new insights?"
echo "[ ] Update .kirocontext with new rules"
echo "[ ] Update documentation if rules changed"
echo "[ ] Update 'Last Updated' date in RULES.md"
echo "[ ] Commit changes: git commit -m 'docs: monthly rules review $CURRENT_MONTH'"
echo ""

# Check for recent incidents (commits with 'fix:' or 'hotfix:')
echo "🔍 Recent Incidents (last 30 days):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$REPO_DIR"
INCIDENTS=$(git log --since="30 days ago" --oneline --grep="fix:\|hotfix:" | head -5)
if [[ -n "$INCIDENTS" ]]; then
    echo "$INCIDENTS"
    echo ""
    echo "💡 Consider adding lessons learned from these fixes!"
else
    echo "✅ No incidents in the last 30 days"
fi
echo ""

# Check for new features (commits with 'feat:')
echo "🚀 New Features (last 30 days):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FEATURES=$(git log --since="30 days ago" --oneline --grep="feat:" | head -5)
if [[ -n "$FEATURES" ]]; then
    echo "$FEATURES"
    echo ""
    echo "💡 Consider documenting new constraints or rules!"
else
    echo "ℹ️  No new features in the last 30 days"
fi
echo ""

# Check metrics
echo "📊 Compliance Metrics (last 30 days):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for hardcoded IPs in recent commits
HARDCODED_IPS=$(git log --since="30 days ago" -p | grep -E '\+.*\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | grep -v 'config/environments.yaml' | wc -l)
echo "Hardcoded IPs added: $HARDCODED_IPS (target: 0)"

# Check for direct main commits
DIRECT_MAIN=$(git log --since="30 days ago" --first-parent main --oneline | wc -l)
TOTAL_COMMITS=$(git log --since="30 days ago" --oneline | wc -l)
echo "Direct main commits: $DIRECT_MAIN of $TOTAL_COMMITS (target: 0)"

# Check for test skips
TEST_SKIPS=$(git log --since="30 days ago" --oneline --grep="skip.*test\|test.*skip" -i | wc -l)
echo "Test skips mentioned: $TEST_SKIPS (review if > 0)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 To update rules:"
echo "   1. Edit docs/RULES.md"
echo "   2. Update 'Last Updated' date"
echo "   3. git add docs/RULES.md"
echo "   4. git commit -m 'docs: monthly rules review $CURRENT_MONTH'"
echo "   5. git push"
echo ""
echo "🤖 Ask Kiro for help:"
echo "   kiro-cli chat 'Review recent incidents and suggest rule updates'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
