# Bin Directory

Quick access symlinks to commonly used scripts.

## Available Commands

### Deployment
- `./bin/deploy-dev` - Deploy complete development environment
- `./bin/deploy-prod` - Deploy complete production environment

### Utilities
- `./bin/startup` - Daily development environment setup

## Usage

```bash
# Deploy to development
./bin/deploy-dev

# Deploy to production (after testing in dev)
./bin/deploy-prod

# Start your work session
./bin/startup
```

## Adding New Commands

To add a new command to bin:

```bash
ln -s ../scripts/<category>/<script-name>.sh bin/<command-name>
```

Example:
```bash
ln -s ../scripts/testing/run-comprehensive-gating-tests.cjs bin/test
```
