# Email Validation Utility

## Overview
Comprehensive email validation system for AIPM with both frontend and backend validation.

## Components

### Frontend (`apps/frontend/public/email-validator.js`)
- **EmailValidator class**: Client-side validation with comprehensive error handling
- **Global availability**: Accessible as `window.EmailValidator`
- **Integration**: Automatically loaded in AIPM frontend

### Backend (`apps/backend/utils/emailValidation.js`)
- **EmailValidationService class**: Server-side validation service
- **API endpoints**: REST API for email validation
- **AIPM integration**: Validates assignee emails in user stories

## Features

### Validation Rules
- ✅ RFC 5322 compliant email format
- ✅ Maximum email length (254 characters)
- ✅ Maximum local part length (64 characters)
- ✅ Domain format validation
- ✅ Empty/null handling for optional fields
- ✅ Comprehensive error messages

### Frontend Usage
```javascript
const validator = new EmailValidator();
const result = validator.validate('user@example.com');
// { valid: true, email: 'user@example.com' }

const assigneeResult = validator.validateAssignee('');
// { valid: true, email: null } - Empty assignee is valid
```

### Backend Usage
```javascript
import { EmailValidationService } from './utils/emailValidation.js';

const service = new EmailValidationService();
const result = service.validateEmail('user@example.com');
const assigneeResult = service.validateAssigneeEmail('');
```

## API Endpoints
- `POST /api/validate-email` - Single email validation
- `POST /api/validate-emails` - Batch email validation  
- `POST /api/validate-assignee` - Assignee email validation

## Integration with AIPM
- Validates assignee emails in user story forms
- Validates task assignee emails
- Provides real-time validation feedback
- Supports optional assignee fields (empty = valid)

## Testing
Run the integration test:
```bash
node test-email-validation.js
```

## Error Handling
- Input validation (type checking, null/undefined)
- Format validation (regex patterns)
- Length validation (RFC limits)
- User-friendly error messages
