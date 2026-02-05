# Story Quality Assurance Automation

Automated workflow to ensure all user stories have proper format, acceptance tests, and passing Phase 4 tests.

## Overview

This automation performs 4 steps:
1. **Fix Story Format** - Updates stories missing "As a/I want/So that"
2. **Generate Acceptance Tests** - Creates tests for stories without them
3. **Generate Phase 4 Tests** - Builds test script from all acceptance tests
4. **Run & Retry** - Executes tests with manual intervention on failures

## Usage

### Step 1: Run Story QA Automation

```bash
cd /repo/ebaejun/tools/aws/aipm
./scripts/utilities/story-qa-automation.sh
```

**What it does:**
- Audits all 255 stories
- Fixes stories with empty "As a/I want/So that" using Semantic API
- Generates acceptance tests for stories without them
- Creates `scripts/testing/phase4-functionality.sh` with all test cases
- Skips stories in exclusion list

**Output:**
- Summary of fixes and tests generated
- New Phase 4 script ready to run

### Step 2: Run Phase 4 Tests with Retry

```bash
./scripts/utilities/run-phase4-with-retry.sh
```

**What it does:**
- Runs Phase 4 tests
- On failure: pauses for manual intervention
- Allows you to fix code/tests
- Retries up to 10 times
- Skips tests that fail 3+ times consecutively

**Workflow:**
1. Script runs Phase 4 tests
2. If failures occur, script pauses
3. You review `/tmp/phase4-run-N.log`
4. Fix the issues manually
5. Press ENTER to retry
6. Repeat until all pass or max iterations reached

## Configuration

### Exclude Stories from Test Generation

Edit `story-qa-automation.sh` line 15:

```bash
EXCLUDED_STORIES="1000,5310,1234"  # Comma-separated story IDs
```

**When to exclude:**
- Meta stories (e.g., "Project Setup")
- Documentation-only stories
- Stories that can't have automated tests

### Adjust Retry Limits

Edit `run-phase4-with-retry.sh`:

```bash
MAX_ITERATIONS=10        # Max retry attempts
FAILURE_THRESHOLD=3      # Skip after N consecutive failures
```

## Example Run

```bash
$ ./scripts/utilities/story-qa-automation.sh

🔍 Story Quality Assurance Script
==================================

📥 Fetching all stories...
✅ Found 255 stories

📋 Step 1: Auditing story format...
⚠️  Found 12 stories needing format fix

🔧 Fixing story #1234...
   Title: User Authentication
   ✅ Story format updated

📋 Step 2: Generating missing acceptance tests...
⚠️  Found 45 stories needing acceptance tests

🧪 Generating tests for story #1234...
   ✅ Acceptance test created

📋 Step 3: Generating Phase 4 test script...
✅ Generated Phase 4 script with 187 test cases

📊 Summary
==========
Stories fixed: 12
Tests generated: 45
Phase 4 tests added: 187
Stories skipped: 2

✅ Story quality assurance complete!
```

## Files Generated

- `scripts/testing/phase4-functionality.sh` - Main test script
- `scripts/testing/phase4-functionality.sh.backup.*` - Backup of previous version
- `/tmp/phase4-run-N.log` - Test run logs for each iteration

## Troubleshooting

### "Semantic API timeout"
- Too many stories being processed at once
- Add more stories to exclusion list
- Run in smaller batches

### "Test implementation pending"
- Phase 4 script generates test stubs
- You must implement actual test logic
- Replace `# TODO` comments with real assertions

### "Max iterations reached"
- Some tests consistently failing
- Review logs to identify root cause
- May need code fixes or test adjustments
- Consider adding problematic stories to exclusion list

## Notes

- **Backup**: Original Phase 4 script is backed up before regeneration
- **Idempotent**: Safe to run multiple times
- **Manual Review**: Always review generated tests before running
- **Production**: Uses production environment by default
