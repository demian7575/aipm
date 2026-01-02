// PR #584 Implementation
// Advanced code generation with validation

export class ValidationCodeGenerator {
  constructor() {
    this.validators = new Map();
    this.setupValidators();
  }

  setupValidators() {
    this.validators.set('email', () => 
      `function validateEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}`);

    this.validators.set('required', (field) => 
      `function validate${field}(value) {
  return value != null && value.toString().trim() !== '';
}`);

    this.validators.set('number', (field) => 
      `function validate${field}(value) {
  return !isNaN(value) && isFinite(value);
}`);
  }

  generateValidator(type, field = '') {
    const validator = this.validators.get(type);
    if (!validator) {
      throw new Error(`Unknown validator type: ${type}`);
    }
    return validator(field);
  }

  generateValidationSuite(fields) {
    const validators = fields.map(field => 
      this.generateValidator(field.type, field.name)
    ).join('\n\n');

    return `// Generated validation suite
${validators}

export function validateAll(data) {
  const errors = [];
  ${fields.map(field => 
    `if (!validate${field.name}(data.${field.name})) {
    errors.push('${field.name} is invalid');
  }`).join('\n  ')}
  return { valid: errors.length === 0, errors };
}`;
  }
}

export function generateCode(spec) {
  const generator = new ValidationCodeGenerator();
  return generator.generateValidator(spec.type, spec.field);
}
