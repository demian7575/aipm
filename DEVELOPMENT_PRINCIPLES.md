# AIPM Development Principles & Instructions

## Core Development Principles

### 1. **User Reports = Truth**
- When user reports different results than automated tests, the user is right
- Always start with manual browser testing when there's a discrepancy
- Automated tests can give false confidence

### 2. **Browser-First Testing**
- Test in actual browser environment, not just server-to-server
- CORS policies only affect browsers, not Node.js tests
- DOM elements and JavaScript execution must be tested in browser context

### 3. **Environment Awareness**
- Production and development environments have different configurations
- Always test same-origin requests to avoid CORS issues
- Auto-detect environment in gating tests

### 4. **Minimal Code Implementation**
- Write only the absolute minimal code needed
- Avoid verbose implementations
- Focus on functionality over complexity

## Testing Strategy

### Reality Check Protocol
```
When user reports issues:
1. STOP automated testing
2. Open browser manually 
3. Reproduce exact user steps
4. Check browser console for errors
5. Only then fix and automate
```

### Test Environment Matrix
- **Server-to-Server (Node.js)**: HTTP status, response content, API endpoints
- **Browser-Only Required**: CORS policies, DOM elements, JavaScript execution, modal interactions
- **Cross-Origin Testing**: Must use browser, not Node.js

### Gating Test Improvements
- Environment auto-detection
- Same-origin testing to avoid CORS
- Realistic deployment validation
- Clear pass/fail feedback with actionable errors
- Performance monitoring

## Deployment Strategy

### Multi-Environment Setup
- **Production**: `aipm-static-hosting-demo` bucket, production config
- **Development**: `aipm-dev-frontend-hosting` bucket, development config
- **API**: Shared production API for both environments

### Deployment Process
1. Test locally first
2. Deploy to development environment
3. Run gating tests in browser
4. Fix any issues found
5. Deploy to production
6. Verify with production gating tests

### Configuration Management
- Separate config files for each environment
- Auto-detect environment in applications
- Use environment-specific settings

## Feature Development

### PR Implementation Process
1. Create feature branch
2. Implement minimal functionality
3. Add gating tests for new features
4. Deploy to development
5. Test manually in browser
6. Fix issues based on real browser behavior
7. Deploy to production
8. Merge to main branch

### Button/UI Feature Pattern
```javascript
// 1. Add button to HTML
<button id="feature-btn">Feature Name</button>

// 2. Add element reference
const featureBtn = document.getElementById('feature-btn');

// 3. Add event listener
featureBtn?.addEventListener('click', () => {
    const { element, onClose } = buildFeatureModalContent();
    openModal({ title: 'Feature', content: element });
});

// 4. Add modal content function
function buildFeatureModalContent() {
    // Implementation
    return { element: container, onClose: () => {} };
}

// 5. Add gating test
case 'testFeature':
    // Test button exists in HTML
    // Test function exists in JavaScript
    // Return success/failure with message
```

## Error Prevention

### Common Mistakes to Avoid
1. **Testing simulation vs reality**: Always verify in actual browser
2. **Cross-origin assumptions**: Test same-origin scenarios
3. **DOM context confusion**: Gating tests run in different context than main app
4. **Variable name conflicts**: Use unique variable names (e.g., `perfStart` not `start`)
5. **Environment mismatches**: Ensure correct config for each environment

### Validation Checklist
- [ ] Feature works in browser (not just tests)
- [ ] Gating tests pass in actual browser
- [ ] Both environments configured correctly
- [ ] No JavaScript console errors
- [ ] CORS policies respected
- [ ] Performance acceptable

## File Management

### Conversation Files
- Keep only essential principles and instructions
- Remove detailed conversation logs
- Focus on reusable patterns and lessons learned
- Maintain deployment and testing documentation

### Code Organization
- Separate environment configs
- Modular gating test structure
- Clear naming conventions
- Minimal but complete implementations

## Success Metrics

### Definition of Done
- [ ] Feature implemented with minimal code
- [ ] Manual browser testing confirms functionality
- [ ] Gating tests pass in both environments
- [ ] No console errors in browser
- [ ] Performance meets requirements
- [ ] Documentation updated with principles learned

This document should be updated with new principles learned from each development cycle.
