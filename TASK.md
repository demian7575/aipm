# Remove "Refresh", "Runtime Data", "Dependency" Button.

As a User, I want to remove "Refresh", "Runtime Data", "Dependency" Button., so that I can complete my tasks quickly and intuitively.

Constraints: 

Acceptance Criteria:
- Implement: I can complete my tasks quickly and intuitively

---
✅ **IMPLEMENTED**

## Changes Made:

### Frontend (index.html)
- Removed "Refresh" button from header
- Removed "Runtime Data" download link from header
- Removed "Dependency" toggle button from header

### JavaScript (app.js)
- Removed `refreshBtn` variable declaration and event listener
- Removed `dependencyToggleBtn` variable declaration and event listener
- Removed `dependencyToggleBtn` references from `syncDependencyOverlayControls()` function

## Result:
The header now displays a cleaner interface with only essential buttons:
- Kiro
- Generate Document
- Employee Heat Map
- Reference Documents

This streamlined UI allows users to complete tasks more quickly and intuitively by removing less frequently used controls.