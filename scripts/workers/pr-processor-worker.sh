#!/bin/bash

# Minimal PR Processor Worker for Code Generation
# This script monitors for PR processing requests and uses Kiro CLI to generate code

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKER_LOG="$REPO_ROOT/logs/pr-worker.log"

# Ensure log directory exists
mkdir -p "$(dirname "$WORKER_LOG")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$WORKER_LOG"
}

log "🚀 Starting PR Processor Worker"
log "📁 Repository root: $REPO_ROOT"

# Check if Kiro CLI is available
if ! command -v kiro-cli &> /dev/null; then
    log "❌ kiro-cli not found in PATH"
    exit 1
fi

log "✅ Kiro CLI found: $(which kiro-cli)"

# Function to process a PR with Kiro
process_pr_with_kiro() {
    local branch="$1"
    local pr_number="$2"
    local task_details="$3"
    
    log "🔄 Processing PR #$pr_number on branch $branch"
    
    # Change to repo directory
    cd "$REPO_ROOT"
    
    # Ensure we're on the correct branch
    git fetch origin
    git checkout "$branch" || {
        log "❌ Failed to checkout branch $branch"
        return 1
    }
    
    # Create a prompt file for Kiro
    local prompt_file="/tmp/kiro-prompt-$pr_number.txt"
    cat > "$prompt_file" << EOF
I need to implement the following task:

$task_details

Please analyze the existing codebase and implement the required functionality. Make sure to:
1. Follow existing code patterns and conventions
2. Add appropriate error handling
3. Test the implementation
4. Commit the changes with a descriptive message

The task is defined in TASK.md in the repository root.
EOF

    log "📝 Created prompt file: $prompt_file"
    
    # Run Kiro CLI to generate code
    log "🤖 Running Kiro CLI for code generation..."
    
    if timeout 300 kiro-cli chat --file "$prompt_file" --auto-commit; then
        log "✅ Kiro CLI completed successfully"
        
        # Push changes
        if git push origin "$branch"; then
            log "✅ Changes pushed to branch $branch"
            
            # Add comment to PR
            if command -v gh &> /dev/null && [ -n "$GITHUB_TOKEN" ]; then
                gh pr comment "$pr_number" --body "🤖 **Code generation completed!**

Kiro CLI has analyzed the task requirements and implemented the requested functionality. Please review the changes and test the implementation.

Generated at: $(date)"
                log "✅ Added completion comment to PR #$pr_number"
            fi
            
            return 0
        else
            log "❌ Failed to push changes"
            return 1
        fi
    else
        log "❌ Kiro CLI failed or timed out"
        return 1
    fi
}

# Main worker loop - check for processing requests
log "🔄 Worker ready - monitoring for PR processing requests"

while true; do
    # Check if there are any pending PR processing requests
    # This is a simple file-based approach - create a requests directory
    REQUESTS_DIR="$REPO_ROOT/tmp/pr-requests"
    mkdir -p "$REQUESTS_DIR"
    
    for request_file in "$REQUESTS_DIR"/*.json; do
        if [ -f "$request_file" ]; then
            log "📨 Found processing request: $(basename "$request_file")"
            
            # Parse request
            if branch=$(jq -r '.branch' "$request_file" 2>/dev/null) && \
               pr_number=$(jq -r '.prNumber' "$request_file" 2>/dev/null) && \
               task_details=$(jq -r '.taskDetails' "$request_file" 2>/dev/null); then
                
                log "🎯 Processing: Branch=$branch, PR=#$pr_number"
                
                # Process the PR
                if process_pr_with_kiro "$branch" "$pr_number" "$task_details"; then
                    log "✅ Successfully processed PR #$pr_number"
                else
                    log "❌ Failed to process PR #$pr_number"
                fi
                
                # Remove processed request
                rm "$request_file"
                log "🗑️ Removed processed request file"
            else
                log "❌ Invalid request file format: $(basename "$request_file")"
                rm "$request_file"
            fi
        fi
    done
    
    # Sleep before next check
    sleep 5
done
