#!/bin/bash

# AIPM Test Code Generation Gating Test
# Follows existing AIPM gating test patterns

set -e

echo "🧪 Running AIPM Test Code Generation Gating Tests..."
echo "=================================================="

# Run the test module
node test-code-generation.js

echo ""
echo "✅ All AIPM test code generation gating tests passed!"
