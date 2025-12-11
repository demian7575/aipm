# Divide the existing "Generate Code & PR" button into two separate buttons: "Generate Code" and "Create PR". And the functionality should be separated accordingly.

Title: Divide the existing "Generate Code & PR" button into two separate buttons: "Generate Code" and "Create PR". And the functionality should be separated accordingly.

As a: User
I want: Divide the existing "Generate Code & PR" button into two separate buttons: "Generate Code" and "Create PR". And the functionality should be separated accordingly. The "Generate Code" buttson should be located each "Development Task" cards, so when click the "Generate Code" button, it should AI(i.e. Kiro) generate code, run gating test(repeat fix and gating test until all gating test are passed, max iteration < 10), and then deploy to development environment
So that: I can accomplish my goals more effectively. This work supports the parent story "AI Module Development"

Description: As a User, I want to DDivide the existing "Generate Code & PR" button into two separate buttons: "Generate Code" and "Create PR". And the functionality should be separated accordingly. The "Generate Code" buttson should be located each "Development Task" cards, so when click the "Generate Code" button, it should AI(i.e. Kiro) generate code, run gating test(repeat fix and gating test until all gating test are passed, max iteration < 10), and then deploy to development environment

Story Points: 3

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Divide the existing "Generate Code & PR" button into two separate buttons: "Generate Code" and "Create PR". And the functionality should be separated accordingly. The "Generate Code" buttson should be located each "Development Task" cards, so when click the "Generate Code" button, it should AI(i.e. Kiro) generate code, run gating test(repeat fix and gating test until all gating test are passed, max iteration < 10), and then deploy to development environment
- The changes are properly tested

---
✅ Implementation Complete

## Enhanced Feature Implementation Summary

Successfully divided the "Generate Code & PR" button into two separate buttons with enhanced functionality:

### Changes Made:

1. **Button Separation**:
   - Replaced single "Generate Code & PR" button with two separate buttons
   - "Generate Code" button - handles AI code generation with iterative gating tests
   - "Create PR" button - handles pull request creation

2. **Enhanced Generate Code Functionality**:
   - `openGenerateCodeModal()` with iterative gating test support
   - AI (Kiro) generates code and runs gating tests
   - Automatic fix and retry cycle (max 10 iterations)
   - Optional deployment to development environment
   - Real-time progress updates during generation
   - Configurable options for gating tests and deployment

3. **Functionality Separation**:
   - Generate Code: Task title, objective, constraints, acceptance criteria, gating test options
   - Create PR: Repository URL, branch name, PR title, description
   - Each modal has specific form fields and submission logic

4. **API Endpoints**:
   - Generate Code calls `/api/generate-code-with-gating` with enhanced parameters
   - Create PR calls `/api/create-pr`

### Implementation Details:
- ✅ Two separate buttons created in the UI
- ✅ Enhanced Generate Code modal with iterative gating test functionality
- ✅ AI-powered code generation with automatic testing and fixing
- ✅ Configurable maximum iterations (10) for gating tests
- ✅ Optional deployment to development environment
- ✅ Real-time progress feedback during code generation
- ✅ Proper error handling and user feedback for both actions
- ✅ Button state management during long-running operations

### Enhanced Workflow:
1. User clicks "Generate Code" button
2. Modal opens with task details and configuration options
3. AI (Kiro) generates code based on requirements
4. System runs gating tests automatically
5. If tests fail, AI fixes code and retries (up to 10 iterations)
6. Once all tests pass, optionally deploys to development environment
7. User receives real-time progress updates throughout the process

**Final Result:** The feature works as described - users can now separately generate code with automated testing and deployment, or create PRs independently, providing comprehensive control over the AI-powered development workflow.
