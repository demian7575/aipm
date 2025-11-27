#!/bin/bash

# Auto-save conversation script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONVERSATION_FILE="Conversation_AIPM_${TIMESTAMP}.md"

# Function to save conversation
save_conversation() {
    echo "# AIPM Conversation - $(date)" > "$CONVERSATION_FILE"
    echo "" >> "$CONVERSATION_FILE"
    echo "## Session Info" >> "$CONVERSATION_FILE"
    echo "- Date: $(date)" >> "$CONVERSATION_FILE"
    echo "- Working Directory: $(pwd)" >> "$CONVERSATION_FILE"
    echo "- Git Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')" >> "$CONVERSATION_FILE"
    echo "" >> "$CONVERSATION_FILE"
    echo "## Recent Git Activity" >> "$CONVERSATION_FILE"
    git log --oneline -5 2>/dev/null >> "$CONVERSATION_FILE" || echo "No git history" >> "$CONVERSATION_FILE"
    echo "" >> "$CONVERSATION_FILE"
    echo "## Files Modified" >> "$CONVERSATION_FILE"
    git status --porcelain 2>/dev/null >> "$CONVERSATION_FILE" || echo "No git status" >> "$CONVERSATION_FILE"
    
    echo "✅ Conversation saved to: $CONVERSATION_FILE"
}

# Save conversation
save_conversation

# Add to git if in a git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
    git add "$CONVERSATION_FILE"
    echo "📝 Added to git staging"
fi
