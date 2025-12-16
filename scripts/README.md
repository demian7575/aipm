# Scripts Directory

Organized scripts for AIPM development and operations.

## Directory Structure

### `deployment/`
Deployment scripts for development and production environments.

- `deploy-dev-full.sh` - Complete development environment deployment
- `deploy-prod-full.sh` - Complete production environment deployment
- `deploy-develop.sh` - Quick development deployment (legacy)
- `deploy.sh` - Production deployment (legacy)
- `deploy-prod-complete.sh` - Alternative production deployment
- `prepare-dev.sh` - First-time development setup

**Usage:**
```bash
./scripts/deployment/deploy-dev-full.sh
./scripts/deployment/deploy-prod-full.sh
```

### `workers/`
Background worker scripts for code generation and task processing.

- `kiro-worker.sh` - Kiro CLI worker for AI code generation
- `local-q-worker.sh` - Local Q worker
- `heartbeat-worker.sh` - Heartbeat monitoring worker
- `amazon-q-heartbeat.sh` - Amazon Q heartbeat service
- `start-heartbeat.sh` - Start heartbeat monitoring
- `test-heartbeat.sh` - Test heartbeat functionality

**Usage:**
```bash
./scripts/workers/kiro-worker.sh
```

### `testing/`
Testing and quality assurance scripts.

- `run-comprehensive-gating-tests.cjs` - Complete gating test suite
- `test-ecs-worker.sh` - ECS worker testing

**Usage:**
```bash
node scripts/testing/run-comprehensive-gating-tests.cjs
```

### `utilities/`
Utility scripts for maintenance and operations.

- `startup.sh` - Daily development environment setup
- `cleanup-docs.sh` - Archive old documentation
- `sync-prod-to-dev.cjs` - Synchronize production data to development
- `backup-restore.sh` - Database backup and restore
- `auto-save-conversation.sh` - Auto-save conversation logs
- `kiro-persistent-session.js` - Posts periodic heartbeats to the EC2 Kiro chat endpoint to keep sessions warm
- `kiro-service-health.sh` - Quick diagnostics for the EC2 Kiro terminal/heartbeat services (ports, logs, missing scripts)
- `generate-code-with-q.sh` - Generate code with Amazon Q
- `add-amazonq-permissions.sh` - Add Amazon Q IAM permissions
- `update-task-def-runtime-script.sh` - Update ECS task definition
- `update-ecs-task.sh` - Update ECS task
- `rebuild-docker.sh` - Rebuild Docker images
- `rebuild-in-cloudshell.sh` - Rebuild in AWS CloudShell
- `cloudshell-setup.sh` - CloudShell environment setup
- `cloudshell-generate.sh` - CloudShell code generation

**Usage:**
```bash
./scripts/utilities/startup.sh
./scripts/utilities/cleanup-docs.sh
```

## Quick Access (bin/)

Common scripts are symlinked in `bin/` for easy access:

```bash
./bin/deploy-dev      # → scripts/deployment/deploy-dev-full.sh
./bin/deploy-prod     # → scripts/deployment/deploy-prod-full.sh
./bin/startup         # → scripts/utilities/startup.sh
```

## Best Practices

1. **Always test in development first**: Use `deploy-dev-full.sh` before production
2. **Run gating tests**: Execute `run-comprehensive-gating-tests.cjs` after deployment
3. **Use startup script**: Run `startup.sh` at the beginning of each work session
4. **Archive regularly**: Use `cleanup-docs.sh` to maintain documentation structure

## Migration Notes

All scripts have been moved from the root directory to organized subdirectories. Update any external references or CI/CD pipelines accordingly.
