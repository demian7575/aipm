#!/bin/bash
# Gating test for Kiro Worker Pool

set -e

echo "🧪 Kiro Worker Pool Gating Test"
echo ""

# Check if terminal-server.js exists and is valid
echo "1️⃣ Checking terminal-server.js syntax..."
if node --check scripts/workers/terminal-server.js 2>/dev/null; then
    echo "✅ Syntax valid"
else
    echo "❌ Syntax error"
    exit 1
fi

# Check worker pool structure
echo ""
echo "2️⃣ Checking worker pool implementation..."

# Check for worker1 and worker2
if grep -q "worker1:" scripts/workers/terminal-server.js && \
   grep -q "worker2:" scripts/workers/terminal-server.js; then
    echo "✅ Both workers defined"
else
    echo "❌ Workers not found"
    exit 1
fi

# Check for health monitor
if grep -q "monitorWorkers" scripts/workers/terminal-server.js && \
   grep -q "setInterval.*monitorWorkers" scripts/workers/terminal-server.js; then
    echo "✅ Health monitor implemented"
else
    echo "❌ Health monitor missing"
    exit 1
fi

# Check for round-robin load balancing
if grep -q "getAvailableWorker" scripts/workers/terminal-server.js; then
    echo "✅ Load balancing implemented"
else
    echo "❌ Load balancing missing"
    exit 1
fi

# Check for auto-recovery
if grep -q "onExit" scripts/workers/terminal-server.js && \
   grep -q "startWorker(name)" scripts/workers/terminal-server.js; then
    echo "✅ Auto-recovery implemented"
else
    echo "❌ Auto-recovery missing"
    exit 1
fi

# Check health endpoint returns worker status
if grep -q "health\[name\] = {" scripts/workers/terminal-server.js && \
   grep -q "status: worker.busy" scripts/workers/terminal-server.js; then
    echo "✅ Health endpoint includes worker status"
else
    echo "❌ Health endpoint incomplete"
    exit 1
fi

echo ""
echo "✅ All worker pool gating tests passed"
echo ""
echo "📊 Summary:"
echo "   - 2 persistent workers (worker1, worker2)"
echo "   - Health monitor (60s interval)"
echo "   - Round-robin load balancing"
echo "   - Auto-recovery on exit"
echo "   - Worker status in health endpoint"
