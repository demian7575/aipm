# Auto-Wake EC2 for Gating Tests

## Overview

All gating tests now automatically wake up stopped EC2 instances before running tests.

## How It Works

The wake-up functionality is built into `scripts/utilities/load-env-config.sh`, which all test scripts source.

**Flow:**
1. Test script sources `load-env-config.sh`
2. Script checks instance state
3. If stopped → starts instance and waits for it to be ready
4. If running → proceeds immediately
5. Loads environment variables (IP, ports, etc.)

## Usage

No changes needed! Just run tests normally:

```bash
# All these automatically wake EC2 if stopped
./scripts/testing/phase1-security-data-safety.sh
./scripts/testing/phase2-e2e-workflow.sh
./scripts/testing/phase4-functionality.sh
./scripts/testing/run-structured-gating-tests.sh
```

## What Happens

```
🔄 Starting prod EC2 instance (i-09971cca92b9bf3a9)...
⏳ Waiting for instance to start...
⏳ Waiting for services to initialize (30s)...
✅ Instance started
✅ Fetched IP from AWS: 100.31.138.60
✅ Loaded prod environment configuration
```

## Timing

- **Instance start**: ~30 seconds
- **Service initialization**: 30 seconds (hardcoded wait)
- **Total**: ~60 seconds from stopped to ready

## Manual Wake-Up

If you need to wake an instance manually:

```bash
# Wake prod
source scripts/utilities/load-env-config.sh prod

# Wake dev
source scripts/utilities/load-env-config.sh dev
```

## Cost Impact

- **$0** - No additional cost
- Instances still auto-stop after 30 minutes of inactivity
- Tests wake them up only when needed

## Implementation

Located in: `scripts/utilities/load-env-config.sh`

```bash
# Check instance state and wake up if stopped
INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" ...)

if [[ "$INSTANCE_STATE" == "stopped" ]]; then
    echo "🔄 Starting $ENV EC2 instance..."
    aws ec2 start-instances --instance-ids "$INSTANCE_ID" ...
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" ...
    sleep 30  # Wait for services
fi
```

## Benefits

1. **No manual intervention** - Tests "just work"
2. **Cost efficient** - Instances stay stopped when not in use
3. **CI/CD friendly** - GitHub Actions can run tests anytime
4. **Shared across all tests** - Single implementation
