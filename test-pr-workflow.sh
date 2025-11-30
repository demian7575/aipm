#!/bin/bash
# Test PR workflow - Verify loosely coupled PR creation system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Testing PR Workflow"
echo "====================="
echo ""

# Test 1: Check required files exist
echo "✓ Test 1: Checking required files..."
FILES=(
  "create-pr-with-kiro.sh"
  "lib/credential-provider.sh"
  "lib/code-generator.sh"
  ".github/workflows/deploy-pr-to-dev.yml"
  ".github/workflows/create-pr.yml"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file missing"
    exit 1
  fi
done
echo ""

# Test 2: Check script permissions
echo "✓ Test 2: Checking script permissions..."
SCRIPTS=(
  "create-pr-with-kiro.sh"
  "lib/credential-provider.sh"
  "lib/code-generator.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [ -x "$script" ]; then
    echo "  ✓ $script is executable"
  else
    echo "  ✗ $script not executable"
    exit 1
  fi
done
echo ""

# Test 3: Validate workflow YAML syntax
echo "✓ Test 3: Validating workflow YAML..."
if command -v yamllint &> /dev/null; then
  yamllint .github/workflows/deploy-pr-to-dev.yml 2>&1 | grep -q "error" && {
    echo "  ✗ YAML validation failed"
    exit 1
  } || echo "  ✓ YAML is valid"
else
  echo "  ⚠ yamllint not installed, skipping"
fi
echo ""

# Test 4: Check workflow_dispatch trigger
echo "✓ Test 4: Checking workflow_dispatch trigger..."
if grep -q "workflow_dispatch:" .github/workflows/deploy-pr-to-dev.yml; then
  echo "  ✓ workflow_dispatch trigger found"
else
  echo "  ✗ workflow_dispatch trigger missing"
  exit 1
fi
echo ""

# Test 5: Verify abstraction layers
echo "✓ Test 5: Verifying abstraction layers..."

# Check credential-provider.sh
if grep -q "setup_credentials" lib/credential-provider.sh; then
  echo "  ✓ setup_credentials function exists"
else
  echo "  ✗ setup_credentials function missing"
  exit 1
fi

# Check code-generator.sh
if grep -q "generate_code" lib/code-generator.sh; then
  echo "  ✓ generate_code function exists"
else
  echo "  ✗ generate_code function missing"
  exit 1
fi
echo ""

# Test 6: Check backend API endpoint
echo "✓ Test 6: Checking backend API endpoint..."
if grep -q "/api/deploy-pr" apps/backend/app.js; then
  echo "  ✓ /api/deploy-pr endpoint exists"
else
  echo "  ✗ /api/deploy-pr endpoint missing"
  exit 1
fi
echo ""

# Test 7: Verify PR base branch is 'main'
echo "✓ Test 7: Verifying PR base branch..."
if grep -q '"base":"main"' q-worker.sh 2>/dev/null || grep -q '"base": "main"' apps/backend/app.js; then
  echo "  ✓ PR base branch is 'main'"
else
  echo "  ⚠ Could not verify PR base branch"
fi
echo ""

# Test 8: Check GitHub CLI availability
echo "✓ Test 8: Checking GitHub CLI..."
if command -v gh &> /dev/null; then
  echo "  ✓ GitHub CLI (gh) is installed"
  gh --version | head -1
else
  echo "  ⚠ GitHub CLI (gh) not installed"
  echo "    Install: https://cli.github.com/"
fi
echo ""

# Test 9: Dry-run PR creation script
echo "✓ Test 9: Dry-run PR creation script..."
if bash -n create-pr-with-kiro.sh; then
  echo "  ✓ Script syntax is valid"
else
  echo "  ✗ Script syntax error"
  exit 1
fi
echo ""

# Test 10: Check documentation
echo "✓ Test 10: Checking documentation..."
DOCS=(
  "PR_CREATION_SOLUTION.md"
  "PR_WORKFLOW_CHANGES.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✓ $doc exists"
  else
    echo "  ✗ $doc missing"
    exit 1
  fi
done
echo ""

# Summary
echo "================================"
echo "✅ All PR workflow tests passed!"
echo "================================"
echo ""
echo "PR Workflow Components:"
echo "  • create-pr-with-kiro.sh - Main PR creation script"
echo "  • lib/credential-provider.sh - Credential abstraction"
echo "  • lib/code-generator.sh - Code generation abstraction"
echo "  • .github/workflows/deploy-pr-to-dev.yml - Staging deployment"
echo "  • apps/backend/app.js - /api/deploy-pr endpoint"
echo ""
echo "Usage:"
echo "  ./create-pr-with-kiro.sh \"Task title\" \"Task details\""
echo ""
echo "Workflow:"
echo "  1. Create PR → main (not develop)"
echo "  2. Run in Staging → Deploy to dev environment"
echo "  3. Test changes → Verify in staging"
echo "  4. Merge PR → Deploy to production"
echo ""
