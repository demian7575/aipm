# AIPM Kiro Steering Files

This directory contains workspace-scoped steering files that guide Kiro's understanding of the AIPM project.

## File Structure

### Always Loaded (tiny, core principles)
- `tech.md` - Tech stack + non-negotiables
- `structure.md` - Project folder layout
- `progress.md` - Current status, recent changes, next steps

### FileMatch (layer-specific, loaded when relevant)
- `testing.md` - Test guidelines (loaded for test files)
- `api-contracts.md` - Backend API contracts (loaded for backend files)
- `ui-guidelines.md` - Frontend patterns (loaded for frontend files)

### Manual (large references, load on demand)
- `product.md` - Product overview + business rules

## Usage

Kiro automatically loads files based on:
- **always**: Loaded every conversation turn
- **fileMatch**: Loaded when working with matching file patterns
- **manual**: Load explicitly with `/load` command

## Maintenance

Update these files when:
- Architecture changes
- New patterns emerge
- Rules are added/changed
- Tech stack evolves

Keep files concise - prefer "do/don't" examples over prose.
