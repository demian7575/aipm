# Zombie Code Documentation

## apps/backend/app.js

The following code sections are **no longer used** but remain in the codebase for safety. They were replaced by the Semantic API template-based document generation system.

### Zombie Functions (655 lines total)

1. **buildCommonTestDocument()** - Lines ~3649-3904 (256 lines)
   - Old heuristic-based test document generator
   - Replaced by: Semantic API `/api/aipm-document-generation` with test template

2. **buildCommonRequirementSpecificationDocument()** - Lines ~3906-4226 (321 lines)
   - Old heuristic-based requirement specification generator
   - Replaced by: Semantic API `/api/aipm-document-generation` with requirement template

3. **generateDocumentFile()** - Lines ~4346-4350 (5 lines)
   - Document generation dispatcher
   - Replaced by: Semantic API template-based routing

4. **generateDocumentPayload()** - Lines ~4352-4383 (32 lines)
   - Document type router
   - Replaced by: Semantic API template-based routing

### Zombie Endpoints (40 lines total)

5. **OPTIONS /api/documents/generate** - Lines ~8081-8089 (9 lines)
   - CORS preflight for old document generation endpoint
   - Replaced by: Semantic API handles its own CORS

6. **POST /api/documents/generate** - Lines ~8167-8197 (31 lines)
   - Old document generation HTTP endpoint
   - Replaced by: Frontend now calls Semantic API directly at `/api/aipm-document-generation`

## Removal Plan

These sections can be safely removed once:
1. All document generation is confirmed working via Semantic API
2. No references to `/api/documents/generate` exist in any client code
3. Adequate testing has been performed

## Status

- ✅ Semantic API template-based generation working
- ✅ Frontend updated to use new endpoint
- ✅ Old endpoint no longer called
- ⏳ Zombie code removal pending final verification
