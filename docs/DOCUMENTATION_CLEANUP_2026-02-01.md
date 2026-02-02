# Documentation Cleanup - 2026-02-01

## Summary

Comprehensive documentation audit and cleanup to align with actual codebase implementation.

## Issues Fixed

### 1. Queue Architecture (3 files)
**Problem**: Documentation described DynamoDB queue polling  
**Reality**: In-memory queue in Session Pool  
**Fixed**:
- README.md - Removed queue polling references
- docs/ARCHITECTURE.md - Removed Semantic Queue table
- Updated workflows to show direct HTTP/SSE communication

### 2. Database References (7 occurrences)
**Problem**: Documentation implied SQLite was primary database  
**Reality**: DynamoDB primary, SQLite compatibility layer for tests only  
**Fixed**:
- README.md - Clarified SQLite is test-only
- docs/DEVELOPMENT.md - Updated technology stack
- docs/DEVELOPMENT.md - Removed SQLite snapshot endpoint
- docs/DEVELOPMENT.md - Updated project structure

### 3. OpenAI/ChatGPT (1 file)
**Problem**: Documentation described ChatGPT integration  
**Reality**: Not implemented in backend code, Kiro CLI only  
**Fixed**:
- README.md - Added note that ChatGPT is not implemented

### 4. Duplicate Architecture Docs (2 files)
**Problem**: Multiple overlapping architecture documents  
**Solution**: Archived old docs, kept current ones  
**Actions**:
- Archived: docs/architecture/BLOCK_DIAGRAMS.md → docs/archive/architecture-old/
- Archived: docs/architecture/SYSTEM_ARCHITECTURE.md → docs/archive/architecture-old/
- Kept: docs/ARCHITECTURE.md (high-level overview)
- Kept: docs/ARCHITECTURE_BLOCK_DIAGRAM.md (detailed diagram)

### 5. Documentation Index
**Fixed**:
- docs/README.md - Added new architecture diagram link
- docs/README.md - Improved system overview
- docs/README.md - Clarified archive contents

## Files Modified

1. ✅ README.md
   - Fixed AI code generation workflow
   - Clarified data storage (DynamoDB + SQLite test layer)
   - Updated ChatGPT section (not implemented)
   - Removed test comments

2. ✅ docs/ARCHITECTURE.md
   - Updated architecture diagram (removed queue table)
   - Fixed Session Pool description (in-memory queue)
   - Removed Semantic Queue table from DynamoDB section
   - Updated AI story draft flow
   - Updated code generation flow

3. ✅ docs/README.md
   - Added ARCHITECTURE_BLOCK_DIAGRAM.md link
   - Added KIRO_SERVICES_SETUP.md link
   - Improved system overview
   - Clarified archive contents

4. ✅ docs/DEVELOPMENT.md
   - Fixed key features (removed SQLite/Lambda)
   - Updated technology stack
   - Updated backend responsibilities
   - Fixed project structure
   - Removed SQLite snapshot endpoint

5. ✅ docs/archive/architecture-old/
   - Moved BLOCK_DIAGRAMS.md (duplicate)
   - Moved SYSTEM_ARCHITECTURE.md (duplicate)

## Verification

All changes verified against actual code:
- ✅ apps/backend/dynamodb.js - DynamoDB primary
- ✅ scripts/kiro-session-pool.js - In-memory queue (`this.queue = []`)
- ✅ apps/backend/app.js - Direct GitHub API calls
- ✅ No OpenAI SDK imports in backend

## Result

Documentation now accurately reflects:
- **Database**: DynamoDB (production) + SQLite compatibility (tests)
- **Queue**: In-memory array in Session Pool
- **GitHub**: Direct API calls via githubRequest()
- **AI**: Kiro CLI only (no OpenAI)
- **Architecture**: Direct HTTP/SSE (no polling)

All documentation is now simple, clear, and accurate.
