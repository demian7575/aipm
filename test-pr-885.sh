#!/bin/bash

# Test script to verify branch management links have been removed
# This script checks that the removed elements are no longer in the code

echo "🧪 Testing PR #885 - Branch Management Links Removal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_JS="apps/frontend/public/app.js"
STYLES_CSS="apps/frontend/public/styles.css"

# Test 1: Check that branch display code is removed from task cards
echo "📋 Test 1: Branch display section removed from task cards"
if grep -q "Branch:</span>" "$APP_JS"; then
    echo "   ❌ Branch display code still present in task cards"
    exit 1
else
    echo "   ✅ Branch display code successfully removed from task cards"
fi

# Test 2: Check that "PR created and ready for development" text is changed
echo "📋 Test 2: PR reference removed from status text"
if grep -q "PR created and ready for development" "$APP_JS"; then
    echo "   ❌ Old status text still present"
    exit 1
else
    echo "   ✅ Status text simplified (PR reference removed)"
fi

# Test 3: Check that new simplified status text exists
if grep -q "Ready for development…" "$APP_JS"; then
    echo "   ✅ New simplified status text present"
else
    echo "   ❌ New status text not found"
    exit 1
fi

# Test 4: Check that rebase button is removed from task cards
echo "📋 Test 3: Rebase button removed from task cards"
if grep -q "textContent = 'Rebase'" "$APP_JS"; then
    echo "   ❌ Rebase button still present in task cards"
    exit 1
else
    echo "   ✅ Rebase button successfully removed from task cards"
fi

# Test 5: Check that rebase function still exists (for potential future use)
echo "📋 Test 4: Rebase function preserved"
if grep -q "async function rebaseCodeWhispererPR" "$APP_JS"; then
    echo "   ✅ Rebase function preserved for potential future use"
else
    echo "   ⚠️  Rebase function removed (this is acceptable)"
fi

# Test 6: Check that CSS styles are cleaned up
echo "📋 Test 5: CSS styles cleaned up"
if grep -q "codewhisperer-branch" "$STYLES_CSS"; then
    echo "   ❌ Branch CSS styles still present"
    exit 1
else
    echo "   ✅ Unused CSS styles successfully removed"
fi

# Test 7: Check that core functionality remains
echo "📋 Test 6: Core functionality preserved"
if grep -q "Generate Code" "$APP_JS" && grep -q "Test in Dev" "$APP_JS" && grep -q "Merge PR" "$APP_JS"; then
    echo "   ✅ Core task management buttons preserved"
else
    echo "   ❌ Core functionality may be missing"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed! Branch management links successfully removed."
echo "📊 Changes implemented:"
echo "   • Branch name display removed from task cards"
echo "   • 'PR created and ready for development' simplified to 'Ready for development'"
echo "   • Rebase button removed from task actions"
echo "   • Unused CSS styles cleaned up"
echo "   • Core task management functionality preserved"
