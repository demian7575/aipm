import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export type NormalizedPaths = Record<string, unknown>;

export interface GeneratedOpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [key: string]: unknown;
  };
  paths: NormalizedPaths;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export const MergeRequestStatusSchema = z.enum(['open', 'merged', 'closed']);
export type MergeRequestStatus = z.infer<typeof MergeRequestStatusSchema>;

export const UserStoryStatusSchema = z.enum(['backlog', 'in-progress', 'done', 'blocked']);
export type UserStoryStatus = z.infer<typeof UserStoryStatusSchema>;

export const AcceptanceTestStatusSchema = z.enum(['pending', 'passed', 'failed']);
export type AcceptanceTestStatus = z.infer<typeof AcceptanceTestStatusSchema>;

export const MergeRequestSchema = z.object({
  id: z.string().uuid({ message: 'Merge request id must be a UUID' }),
  title: z.string().min(3),
  description: z.string().min(3),
  status: MergeRequestStatusSchema,
  repository: z.string().min(1),
  branch: z.string().min(1),
  drifted: z.boolean().default(false),
  lastSyncAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MergeRequest = z.infer<typeof MergeRequestSchema>;

export const UserStorySchema = z.object({
  id: z.string().uuid(),
  mrId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string().min(3),
  asA: z.string().min(3),
  iWant: z.string().min(3),
  soThat: z.string().min(3),
  status: UserStoryStatusSchema,
  estimateDays: z.number().positive().max(30).nullable(),
  order: z.number().nonnegative(),
  depth: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserStory = z.infer<typeof UserStorySchema>;

export const AcceptanceTestSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  title: z.string().min(3),
  given: z.string().min(3),
  when: z.string().min(3),
  then: z.string().min(3),
  status: AcceptanceTestStatusSchema,
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AcceptanceTest = z.infer<typeof AcceptanceTestSchema>;

export const ambiguityDictionary = {
  en: ['should', 'maybe', 'asap', 'etc', 'optimal', 'fast', 'sufficiently'],
  ko: ['적절히', '빠르게', '최적', '가능하면', '추후', '등등', '대략'],
};

export const numericUnitRegex = /\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|ms|milliseconds?|%|percent|kb|mb|gb|users?|reqs?|requests?|items?)\b/i;

export interface AmbiguityCheckResult {
  tokens: string[];
  missingMeasurement: boolean;
}

const punctuationRegex = /[.,;:!?]/g;

export const normalizeText = (value: string): string =>
  value.toLowerCase().replace(punctuationRegex, ' ');

export const detectAmbiguity = (value: string, locale: keyof typeof ambiguityDictionary = 'en'): AmbiguityCheckResult => {
  const normalized = normalizeText(value);
  const tokens = ambiguityDictionary[locale].filter((token) => normalized.includes(token));
  const missingMeasurement = /\d/.test(value) && !numericUnitRegex.test(value);
  return { tokens, missingMeasurement };
};

export interface InvestConfig {
  maxChildren: number;
  smallDays: number;
}

export const defaultInvestConfig: InvestConfig = {
  maxChildren: 5,
  smallDays: 2,
};

export interface InvestContext {
  children: UserStory[];
  tests: AcceptanceTest[];
}

export interface InvestResultEntry {
  satisfied: boolean;
  message: string;
}

export interface InvestResult {
  independent: InvestResultEntry;
  negotiable: InvestResultEntry;
  valuable: InvestResultEntry;
  estimable: InvestResultEntry;
  small: InvestResultEntry;
  testable: InvestResultEntry;
  summary: {
    score: number;
    total: number;
  };
}

const containsCoordinating = /\band\b|\bor\b/;
const rigidLanguage = /\bmust\b|\bexact(ly)?\b|\bperfect\b/;

export const evaluateInvest = (
  story: Pick<UserStory, 'title' | 'soThat' | 'iWant' | 'estimateDays'>,
  context: InvestContext,
  config: InvestConfig = defaultInvestConfig,
): InvestResult => {
  const independent = !containsCoordinating.test(normalizeText(story.title));
  const negotiable = !rigidLanguage.test(normalizeText(story.iWant));
  const valuable = story.soThat.trim().length > 10;
  const estimable = story.estimateDays != null && story.estimateDays > 0;
  const small =
    (story.estimateDays != null && story.estimateDays <= config.smallDays) ||
    context.children.length <= config.maxChildren;
  const testable = context.tests.length > 0;

  type InvestKey = keyof Omit<InvestResult, 'summary'>;

  const entries: [InvestKey, boolean, string][] = [
    [
      'independent',
      independent,
      independent
        ? 'Story title avoids chained dependencies.'
        : 'Split story to remove conjunctions like "and/or" in the title.',
    ],
    [
      'negotiable',
      negotiable,
      negotiable
        ? 'Implementation details can be negotiated.'
        : 'Avoid rigid language such as "must" or "exact" in the desire statement.',
    ],
    [
      'valuable',
      valuable,
      valuable
        ? 'Story communicates business value in the benefit clause.'
        : 'Clarify the benefit ("so that") to express value.',
    ],
    [
      'estimable',
      estimable,
      estimable
        ? 'Estimate is present.'
        : 'Provide an estimate in dev-days to help planning.',
    ],
    [
      'small',
      small,
      small
        ? 'Story fits within the configured size constraints.'
        : `Ensure estimate ≤ ${config.smallDays} days or ≤ ${config.maxChildren} child stories.`,
    ],
    [
      'testable',
      testable,
      testable ? 'At least one acceptance test exists.' : 'Add acceptance tests to make story testable.',
    ],
  ];

  const dimensions = entries.reduce<Record<InvestKey, InvestResultEntry>>(
    (acc, [key, satisfied, message]) => {
      acc[key] = { satisfied, message };
      return acc;
    },
    {} as Record<InvestKey, InvestResultEntry>,
  );

  const score = entries.filter(([, satisfied]) => satisfied).length;

  const result: InvestResult = {
    ...dimensions,
    summary: {
      score,
      total: entries.length,
    },
  };

  return result;
};

export interface AmbiguitySummary {
  fields: Record<string, AmbiguityCheckResult>;
  hasIssues: boolean;
}

export const analyzeStoryAmbiguity = (
  story: Pick<UserStory, 'title' | 'asA' | 'iWant' | 'soThat'>,
  tests: Pick<AcceptanceTest, 'title' | 'given' | 'when' | 'then'>[],
  locale: keyof typeof ambiguityDictionary = 'en',
): AmbiguitySummary => {
  const fields: Record<string, AmbiguityCheckResult> = {};
  const aggregate: AmbiguityCheckResult = { tokens: [], missingMeasurement: false };

  const addField = (field: string, text: string) => {
    const result = detectAmbiguity(text, locale);
    fields[field] = result;
    if (result.tokens.length > 0) {
      aggregate.tokens.push(...result.tokens);
    }
    aggregate.missingMeasurement = aggregate.missingMeasurement || result.missingMeasurement;
  };

  addField('title', story.title);
  addField('asA', story.asA);
  addField('iWant', story.iWant);
  addField('soThat', story.soThat);

  tests.forEach((test, index) => {
    addField(`test-${index}-title`, test.title);
    addField(`test-${index}-given`, test.given);
    addField(`test-${index}-when`, test.when);
    addField(`test-${index}-then`, test.then);
  });

  return {
    fields,
    hasIssues: aggregate.tokens.length > 0 || aggregate.missingMeasurement,
  };
};

export interface OpenApiBuilderOptions {
  title?: string;
  version?: string;
  description?: string;
}

export interface OpenApiBuilder {
  registry: OpenAPIRegistry;
  registerSchema<T extends z.ZodTypeAny>(name: string, schema: T): T;
  build(paths: NormalizedPaths): GeneratedOpenApiDocument;
}

export const createOpenApiBuilder = (
  options: OpenApiBuilderOptions = {},
): OpenApiBuilder => {
  const registry = new OpenAPIRegistry();

  const registerSchema = <T extends z.ZodTypeAny>(name: string, schema: T) => {
    registry.register(name, schema);
    return schema;
  };

  const build = (paths: NormalizedPaths): GeneratedOpenApiDocument => {
    const generator = new OpenApiGeneratorV3(registry.definitions);
    const document = generator.generateDocument({
      openapi: '3.0.3',
      info: {
        title: options.title ?? 'AI PM Mindmap API',
        version: options.version ?? '1.0.0',
        description:
          options.description ?? 'OpenAPI specification generated from shared schemas and routes.',
      },
    });
    return {
      ...document,
      paths,
    } as GeneratedOpenApiDocument;
  };

  return {
    registry,
    registerSchema,
    build,
  };
};

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const StoryStatusTransitions: Record<UserStoryStatus, UserStoryStatus[]> = {
  backlog: ['in-progress', 'done', 'blocked'],
  'in-progress': ['done', 'blocked'],
  done: ['backlog', 'in-progress'],
  blocked: ['backlog', 'in-progress'],
};

export const MergeRequestStatusTransitions: Record<MergeRequestStatus, MergeRequestStatus[]> = {
  open: ['merged', 'closed'],
  merged: ['closed'],
  closed: [],
};

export const AcceptanceTestStatusTransitions: Record<AcceptanceTestStatus, AcceptanceTestStatus[]> = {
  pending: ['passed', 'failed'],
  passed: ['failed'],
  failed: ['passed'],
};

export const ensureTransition = <T extends string>(
  current: T,
  next: T,
  transitions: Record<T, T[]>,
) => {
  const allowed = transitions[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error(`Invalid transition from ${current} to ${next}`);
  }
};

export const createTimestamp = () => new Date().toISOString();
