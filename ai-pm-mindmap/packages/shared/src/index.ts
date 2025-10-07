import { z } from 'zod';
import { OpenAPIRegistry, OpenApiGeneratorV31 } from 'zod-to-openapi';

export const ambiguityDictionary = {
  en: ['should', 'maybe', 'asap', 'etc', 'optimal', 'fast', 'sufficiently'],
  ko: ['적절히', '빠르게', '최적', '가능하면', '추후', '등등', '대략']
};

export const measurableUnits = [
  'seconds?',
  'secs?',
  'sec',
  'ms',
  'minutes?',
  'hours?',
  'days?',
  'percent',
  '%',
  'kb',
  'mb',
  'gb',
  'tb',
  'px',
  'em',
  'rem',
  'items?',
  'requests?',
  'users?',
  'per ?second',
  'per ?minute'
];

export const MergeRequestStatusSchema = z.enum(['open', 'review', 'merged', 'closed']);
export type MergeRequestStatus = z.infer<typeof MergeRequestStatusSchema>;

export const MergeRequestSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  repository: z.string().min(1),
  branch: z.string().min(1),
  status: MergeRequestStatusSchema.default('open'),
  drift: z.boolean().default(false),
  lastSyncAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type MergeRequest = z.infer<typeof MergeRequestSchema>;

export const StoryStatusSchema = z.enum(['draft', 'ready', 'in-progress', 'blocked', 'done']);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const AcceptanceTestStatusSchema = z.enum(['pending', 'failing', 'passing']);
export type AcceptanceTestStatus = z.infer<typeof AcceptanceTestStatusSchema>;

export const AcceptanceTestSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  title: z.string().min(1),
  steps: z.array(z.string().min(1)),
  status: AcceptanceTestStatusSchema.default('pending'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AcceptanceTest = z.infer<typeof AcceptanceTestSchema>;

export const UserStorySchema = z.object({
  id: z.string(),
  mrId: z.string(),
  parentId: z.string().nullable().default(null),
  title: z.string().min(1),
  role: z.string().min(1),
  action: z.string().min(1),
  reason: z.string().min(1),
  gwt: z.object({
    given: z.string().min(1),
    when: z.string().min(1),
    then: z.string().min(1)
  }),
  estimateDays: z.number().nonnegative().max(30).optional(),
  status: StoryStatusSchema.default('draft'),
  depth: z.number().int().nonnegative().default(0),
  order: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type UserStory = z.infer<typeof UserStorySchema>;

export interface InvestConfig {
  smallEstimateDays?: number;
  maxChildren?: number;
}

export interface InvestResult {
  passed: boolean;
  issues: string[];
}

export const defaultInvestConfig: Required<InvestConfig> = {
  smallEstimateDays: 2,
  maxChildren: 5
};

export const numericUnitRegex = new RegExp(
  `\\b\\d+(?:\\.\\d+)?\\s?(?:${measurableUnits.join('|')})\\b`,
  'i'
);

export function detectAmbiguity(
  value: string,
  locale: keyof typeof ambiguityDictionary = 'en'
): string[] {
  const haystack = value.toLowerCase();
  return ambiguityDictionary[locale].filter((term) => haystack.includes(term.toLowerCase()));
}

export function hasMeasurableValue(value: string): boolean {
  return numericUnitRegex.test(value);
}

export function checkInvest(
  story: Pick<UserStory, 'estimateDays' | 'title'> & { childrenCount?: number },
  config: InvestConfig = {}
): InvestResult {
  const resolved = { ...defaultInvestConfig, ...config };
  const issues: string[] = [];

  if (!story.title || story.title.trim().length === 0) {
    issues.push('Story must have a clear title.');
  }

  if (typeof story.estimateDays === 'number' && story.estimateDays > resolved.smallEstimateDays) {
    issues.push(
      `Estimate should be small (≤ ${resolved.smallEstimateDays} days). Current: ${story.estimateDays}`
    );
  }

  if ((story.childrenCount ?? 0) > resolved.maxChildren) {
    issues.push(`Story should be small (≤ ${resolved.maxChildren} children).`);
  }

  return { passed: issues.length === 0, issues };
}

export interface StoryValidationDetail {
  field: string;
  message: string;
  locale: keyof typeof ambiguityDictionary;
}

export interface StoryValidationResult {
  invest: InvestResult;
  ambiguities: StoryValidationDetail[];
  measurable: StoryValidationDetail[];
}

export function validateStoryNarrative(
  story: Pick<UserStory, 'role' | 'action' | 'reason' | 'gwt' | 'title'> &
    Partial<Pick<UserStory, 'estimateDays'>>,
  locale: keyof typeof ambiguityDictionary = 'en'
): StoryValidationResult {
  const invest = checkInvest({
    title: story.title,
    estimateDays: story.estimateDays
  });
  const ambiguities: StoryValidationDetail[] = [];
  const measurable: StoryValidationDetail[] = [];

  const fields: Array<[string, string]> = [
    ['title', story.title],
    ['role', story.role],
    ['action', story.action],
    ['reason', story.reason],
    ['gwt.given', story.gwt.given],
    ['gwt.when', story.gwt.when],
    ['gwt.then', story.gwt.then]
  ];

  for (const [field, value] of fields) {
    const matches = detectAmbiguity(value, locale);
    if (matches.length > 0) {
      ambiguities.push({ field, message: `Ambiguous terms: ${matches.join(', ')}`, locale });
    }
    if (!hasMeasurableValue(value)) {
      measurable.push({
        field,
        message: 'Consider adding measurable metrics or units (e.g., seconds, %).',
        locale
      });
    }
  }

  return { invest, ambiguities, measurable };
}

export function buildOpenApiDocument(options?: { title?: string; version?: string }) {
  const registry = new OpenAPIRegistry();
  const mergeRequestComponent = registry.register('MergeRequest', MergeRequestSchema);
  const storyComponent = registry.register('UserStory', UserStorySchema);
  const testComponent = registry.register('AcceptanceTest', AcceptanceTestSchema);

  registry.registerPath({
    method: 'get',
    path: '/api/merge-requests',
    operationId: 'listMergeRequests',
    responses: {
      200: {
        description: 'List merge requests',
        content: {
          'application/json': {
            schema: { type: 'array', items: mergeRequestComponent }
          }
        }
      }
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/stories',
    operationId: 'listStories',
    responses: {
      200: {
        description: 'List user stories',
        content: {
          'application/json': { schema: { type: 'array', items: storyComponent } }
        }
      }
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/tests',
    operationId: 'listTests',
    responses: {
      200: {
        description: 'List acceptance tests',
        content: {
          'application/json': { schema: { type: 'array', items: testComponent } }
        }
      }
    }
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: options?.title ?? 'AI PM Mindmap API',
      version: options?.version ?? '1.0.0'
    },
    servers: [{ url: 'http://localhost:4000' }]
  });

  return document;
}

export * from './types';
