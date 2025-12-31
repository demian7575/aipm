const fs = require('fs');
const path = require('path');

class TemplateEngine {
  constructor(templatesDir = './templates') {
    this.templatesDir = templatesDir;
    this.templates = new Map();
    this.loadTemplates();
  }

  loadTemplates() {
    try {
      const files = fs.readdirSync(this.templatesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(this.templatesDir, file);
          const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
          this.templates.set(template.templateId, template);
          console.log(`📋 Loaded template: ${template.templateId}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load templates:', error.message);
    }
  }

  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  validateInput(templateId, input) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const schema = template.input.schema;
    const required = schema.required || [];
    
    for (const field of required) {
      if (!(field in input)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return true;
  }

  buildPrompt(templateId, input, context = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.validateInput(templateId, input);

    let prompt = template.prompt.template;
    
    // Replace variables
    const variables = template.prompt.variables || {};
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      let replacement = value;
      
      // Handle simple variable substitution
      if (value.startsWith('{{input.')) {
        const inputKey = value.slice(8, -2); // Remove {{input. and }}
        replacement = input[inputKey] || '';
      } else if (value.startsWith('{{output.')) {
        const outputKey = value.slice(9, -2); // Remove {{output. and }}
        replacement = JSON.stringify(template.output[outputKey], null, 2);
      } else if (value.includes('{{#if')) {
        // Handle conditional logic
        if (value.includes('input.parentId') && input.parentId && context.parent) {
          replacement = `This is a child story of: ${context.parent.title}\n\n`;
        } else {
          replacement = '';
        }
      }
      
      prompt = prompt.replace(placeholder, replacement);
    }

    return prompt;
  }

  validateOutput(templateId, output) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const schema = template.output.schema;
    const required = schema.required || [];
    
    for (const field of required) {
      if (!(field in output)) {
        console.warn(`Missing output field: ${field}`);
        return false;
      }
    }

    return true;
  }

  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }
}

module.exports = TemplateEngine;
