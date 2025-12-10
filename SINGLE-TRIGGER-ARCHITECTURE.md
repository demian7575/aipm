# Single Trigger Point Architecture

## Architecture Overview

```
                    SINGLE TRIGGER POINT
                         ./run-all-tests
                              |
                    ┌─────────┴─────────┐
                    │                   │
              SINGLE TEST REPOSITORY    │
               tests/all-tests.js       │
              (95+ tests in one file)   │
                    │                   │
                    └─────────┬─────────┘
                              |
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ALL ENTRY POINTS      ALL TRIGGERS         ALL ENVIRONMENTS
        │                     │                     │
   ├─ npm test               ├─ Manual              ├─ Local Development
   ├─ npm run test:*         ├─ GitHub Actions      ├─ CI/CD Pipeline  
   ├─ bash scripts           ├─ Shell Scripts       ├─ Browser
   ├─ Browser button         ├─ API calls           ├─ Production
   └─ GitHub workflows       └─ Deployment         └─ Staging
```

## Single Test Repository

**File**: `tests/all-tests.js`
**Contains**: All 95+ tests in one location

### Test Categories:
1. **Environment Tests** (15 tests) - API endpoints, frontend assets
2. **Deployment Config Tests** (12 tests) - Lambda config, SSM, health checks  
3. **Kiro API Tests** (10 tests) - API functionality, CORS, error handling
4. **Browser Tests** (58 tests) - Frontend validation, script loading

## Single Trigger Point

**File**: `./run-all-tests`
**Function**: Executes single test repository
**Result**: Same 95+ tests run regardless of entry point

## Entry Point Connections

### npm Commands
```bash
npm test                 → ./run-all-tests
npm run test:unified     → ./run-all-tests  
npm run test:legacy      → ./run-all-tests
npm run test:dev-gating  → ./run-all-tests
npm run gating:dev       → ./run-all-tests
```

### Shell Scripts
```bash
bash scripts/testing/run-all-gating-tests.sh → ./run-all-tests
```

### GitHub Actions
```yaml
- name: Run All Tests (Single Trigger)
  run: ./run-all-tests
```

### Browser
```javascript
// Button in browser pages connects to same tests
runAllTestsInBrowser() → Same 95+ tests via API
```

## Benefits

✅ **Single Source of Truth**: All tests in one file  
✅ **Consistent Results**: Same tests everywhere  
✅ **Easy Maintenance**: Update one file, affects all triggers  
✅ **No Duplication**: Eliminated test redundancy  
✅ **Universal Access**: Works from any environment  

## Usage

```bash
# All these run the same 95+ tests:
./run-all-tests
npm test
npm run test:legacy
bash scripts/testing/run-all-gating-tests.sh
# GitHub Actions automatically
# Browser button click
```

## Migration Complete

**Before**: 4+ separate test systems with different counts  
**After**: 1 test repository + 1 trigger point = consistent 95+ tests everywhere

**Result**: Perfect test consistency across all environments and triggers.
