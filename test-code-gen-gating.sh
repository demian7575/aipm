#!/bin/bash

# AIPM Test Code Generation Gating Test
# Integrates with existing gating test framework

set -e

echo "🧪 Running AIPM Test Code Generation Gating Tests..."
echo "=================================================="

# Run the test module
node test-code-gen.js

echo ""
echo "✅ All AIPM Test Code Generation gating tests passed!"
echo "Ready for deployment."
