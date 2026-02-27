# Utility Scripts Cleanup - 2026-02-09

## Removed Outdated Utilities (27 files)

### One-Time Hierarchy Management Scripts
- `create-intermediate-layers.mjs` - Already executed
- `create-intermediate-layers-2.mjs` - Already executed
- `create-l1-l2-structure.mjs` - Already executed
- `create-missing-parents.mjs` - Already executed
- `manual-remap.mjs` - Already executed
- `regenerate_from_docs.mjs` - Already executed
- `fix-hierarchy.mjs` - Outdated
- `fix-parents.cjs` - Outdated
- `fix-roots.cjs` - Outdated
- `fix-1100.cjs` - Outdated
- `build-deep-hierarchy.cjs` - Outdated
- `restore-deep-hierarchy.cjs` - Outdated
- `clean-hierarchy.cjs` - Outdated
- `analyze-hierarchy.cjs` - Outdated
- `redistribute-stories.cjs` - Outdated
- `reorganize-flat.cjs` - Outdated
- `split-overloaded.cjs` - Outdated

### Migration Scripts (No Longer Needed)
- `migrate-to-camelcase.sh` - Migration complete
- `rollback-camelcase-migration.sh` - Migration complete
- `migrate-hierarchy.cjs` - Migration complete
- `merge-old-stories.cjs` - Migration complete

### Temporary/Duplicate Scripts
- `fix-empty-invest-fields.mjs` - One-time fix
- `fix-empty-invest-fields.sh` - One-time fix
- `cleanup-phase4-stories.sh` - Temporary
- `generate-phase4-tests.sh` - Duplicate
- `implement-phase4-tests.sh` - Temporary
- `run-phase4-with-retry.sh` - Temporary

## Remaining Active Utilities (15 files)

### Core Infrastructure
1. **load-env-config.sh** - Loads environment configuration (used by all tests)
2. **read-yaml.py** - YAML parser for config files

### Test Generation & Execution
3. **generate-phase4-tests.mjs** - Generates API tests from acceptance tests
4. ~~**generate-phase4-extended.mjs** - Generates UI/integration tests~~ (removed)
5. **upload-test-results.mjs** - Uploads test results to DynamoDB for RTM

### Acceptance Test Management
6. **generate-acceptance-tests.sh** - Generates acceptance tests for stories
7. **generate-acceptance-tests-parallel.sh** - Parallel version
8. **story-qa-automation.sh** - Story QA automation
9. **story-qa-automation-parallel.sh** - Parallel version

### Data Management
10. **sync-prod-to-dev.cjs** - Syncs production data to development
11. **sync-data.sh** - General data sync utility

### Service Management
12. **install-kiro-services.sh** - Installs Kiro AI services
13. **setup-prod-services.sh** - Sets up production services
14. **verify-ec2-services.sh** - Verifies EC2 service health

### Database Setup
15. **create-test-runs-tables.sh** - Creates test results tables

## Impact
- **Removed**: 27 outdated/one-time scripts
- **Kept**: 15 active utilities
- **Cleanup**: 64% reduction in utility scripts
- **Benefit**: Cleaner codebase, easier maintenance

All remaining utilities are actively used in CI/CD, testing, or operations.
