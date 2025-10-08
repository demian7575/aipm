import { z } from 'zod';
import { AcceptanceTestSchema, StorySchema } from './schemas';

export const ambiguousDictionary = {
  en: ['optimize', 'quickly', 'soon', 'some', 'about', 'approximately'],
  ko: ['빠르게', '적절히', '대략', '어느정도', '최대한']
};

const numberRegex = /\d/;
const unitRegex = /\b\d+(?:\.\d+)?\s?(ms|s|sec|seconds|minutes|px|%|percent|kb|mb)\b/i;

export type ValidationMessage = {
  type: string;
  field?: string;
  message: string;
};

export type ValidationResult = {
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
};

export const StoryValidator = StorySchema.superRefine((value, ctx) => {
  if (!/^As a .+/i.test(value.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['role'],
      message: "Role must start with 'As a'"
    });
  }
  if (!/^I want .+/i.test(value.goal)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['goal'],
      message: "Goal must start with 'I want'"
    });
  }
  if (!/^So that .+/i.test(value.benefit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['benefit'],
      message: "Benefit must start with 'So that'"
    });
  }
});

export function analyseAmbiguity(text: string, field: string): ValidationMessage[] {
  const lower = text.toLowerCase();
  const hits: ValidationMessage[] = [];
  for (const list of Object.values(ambiguousDictionary)) {
    for (const term of list) {
      if (lower.includes(term.toLowerCase())) {
        hits.push({ type: 'ambiguity', field, message: `Ambiguous term "${term}" detected` });
      }
    }
  }
  if (numberRegex.test(text) && !unitRegex.test(text)) {
    hits.push({ type: 'unit', field, message: 'Numeric values should include explicit units' });
  }
  return hits;
}

export function validateStory(value: z.infer<typeof StorySchema>): ValidationResult {
  const result = StoryValidator.safeParse(value);
  const warnings = ['title', 'role', 'goal', 'benefit'].flatMap((field) =>
    analyseAmbiguity((value as any)[field], field)
  );
  const errors = [] as ValidationMessage[];
  if (!result.success) {
    errors.push(
      ...result.error.issues.map((issue) => ({
        type: 'invest',
        field: issue.path.join('.'),
        message: issue.message
      }))
    );
  }
  return { warnings, errors };
}

export function validateAcceptanceTests(values: z.infer<typeof AcceptanceTestSchema>[]): ValidationResult {
  const warnings: ValidationMessage[] = [];
  const errors: ValidationMessage[] = [];
  for (const test of values) {
    const combined = `Given ${test.given} When ${test.when} Then ${test.then}`.replace(/\n/g, ' ');
    if (!/^Given .+ When .+ Then .+/i.test(combined)) {
      errors.push({ type: 'gwt', field: test.id, message: 'Acceptance tests must follow Given/When/Then format' });
    }
    ['given', 'when', 'then'].forEach((field) => {
      warnings.push(...analyseAmbiguity((test as any)[field], field));
    });
  }
  return { warnings, errors };
}
