# Email Validation Utility

A comprehensive email validation utility for the AIPM system with proper error handling, real-time validation, and frontend integration.

## Features

- **Robust Email Validation**: Uses RFC 5322 compliant regex pattern
- **Error Handling**: Comprehensive error messages and validation feedback
- **Real-time Validation**: Attach validation to input fields with visual feedback
- **AIPM Integration**: Designed specifically for AIPM's requirements (empty emails allowed)
- **Accessibility**: Proper ARIA attributes and screen reader support
- **CSS Styling**: Pre-built styles for validation states

## Files

- `utils/email-validator.js` - Core validation utility
- `apps/frontend/public/email-validation-integration.js` - Frontend integration
- `apps/frontend/public/email-validation.css` - Validation styles
- `test-email-validation.js` - Comprehensive test suite

## Usage

### Basic Validation

```javascript
import { isValidEmail, validateEmailField } from './utils/email-validator.js';

// Simple boolean check
const isValid = isValidEmail('user@example.com'); // true

// Detailed validation with feedback
const result = validateEmailField('user@example.com');
// { valid: true, message: '', email: 'user@example.com' }
```

### Frontend Integration

```javascript
import { attachEmailValidation } from './apps/frontend/public/email-validation-integration.js';

// Auto-attach validation to all email inputs
// (automatically done on page load)

// Or manually attach to specific input
const input = document.getElementById('email-input');
const feedback = document.getElementById('email-feedback');
attachEmailValidation(input, feedback);
```

### Form Validation

```javascript
import { validateAssigneeEmail } from './apps/frontend/public/email-validation-integration.js';

// Validate before form submission
const result = validateAssigneeEmail(emailInput.value);
if (!result.isValid) {
  showError(result.message);
  return false;
}
```

## Validation Rules

- **Empty emails**: Allowed (returns valid: true)
- **Whitespace-only**: Treated as empty, allowed
- **Maximum length**: 254 characters
- **Format**: Must follow standard email format (user@domain.tld)
- **Special characters**: Supports standard email special characters

## CSS Classes

- `.invalid` - Applied to invalid email inputs
- `.valid` - Applied to valid email inputs (optional)
- `.validation-feedback` - Styling for feedback messages
- `.validation-feedback.invalid` - Error message styling
- `.validation-feedback.valid` - Success message styling

## Testing

Run the test suite:

```bash
node test-email-validation.js
```

Tests cover:
- Valid email formats
- Invalid email formats
- Edge cases (empty, whitespace, too long)
- DOM integration
- Feedback functionality

## Integration with AIPM

The utility is designed to integrate seamlessly with AIPM's existing email handling:

- Story assignee emails
- Task assignee emails
- User contact information
- Email notifications

All existing email inputs will automatically receive validation when the integration script is loaded.
