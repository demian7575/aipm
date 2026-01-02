#!/bin/bash

# AIPM Test Generation Gating Test
# Follows existing AIPM gating test patterns

set -e

echo "🧪 Running AIPM Test Generation Gating Tests..."
echo "=============================================="

# Run the test module
node test-gen.js

echo ""
echo "✅ All AIPM test generation gating tests passed!"
