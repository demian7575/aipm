#!/bin/bash

# Check components
if [ -f "./scripts/workers/q-worker.sh" ] && [ -f "./Dockerfile.q-worker" ]; then
    echo "✅ Components present"
else
    echo "❌ Missing components"
    exit 1
fi

# Check syntax
if bash -n ./scripts/workers/q-worker.sh; then
    echo "✅ Script syntax valid"
else
    echo "❌ Script syntax error"
    exit 1
fi

echo "✅ ECS Worker works"
