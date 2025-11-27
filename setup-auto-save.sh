#!/bin/bash

# Setup automatic conversation saving

echo "Setting up automatic conversation storage..."

# Add alias to bashrc/zshrc
ALIAS_LINE="alias save-convo='cd /repo/ebaejun/tools/aws/aipm && ./auto-save-conversation.sh'"

# Check if alias already exists
if ! grep -q "save-convo" ~/.bashrc 2>/dev/null; then
    echo "$ALIAS_LINE" >> ~/.bashrc
    echo "✅ Added 'save-convo' alias to ~/.bashrc"
fi

if [ -f ~/.zshrc ] && ! grep -q "save-convo" ~/.zshrc 2>/dev/null; then
    echo "$ALIAS_LINE" >> ~/.zshrc
    echo "✅ Added 'save-convo' alias to ~/.zshrc"
fi

echo ""
echo "🎉 Setup complete! You can now:"
echo "1. Run './auto-save-conversation.sh' manually"
echo "2. Use 'save-convo' alias from anywhere"
echo "3. Conversations auto-save after git commits"
echo ""
echo "To activate alias in current session:"
echo "source ~/.bashrc"
