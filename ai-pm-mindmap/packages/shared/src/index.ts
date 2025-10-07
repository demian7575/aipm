import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIGenerator, OpenAPIRegistry } from 'zod-to-openapi';
import type {
  MergeRequest,
  UserStory,
  AcceptanceTest,
  InvestResult,
  AmbiguityFlag,
  StoryAnalysis,
  TestAnalysis
} from './types';

extendZodWithOpenApi(z);

export const mergeRequestStatusValues = ['open', 'merged', 'closed'] as const;
export const userStoryStatusValues = ['draft', 'ready', 'in-progress', 'done', 'blocked'] as const;
export const acceptanceTestStatusValues = ['pending', 'passing', 'failing'] as const;

const TimestampSchema = z.string().datetime();

export const MergeRequestSchema = z
  .object({
    id: z.string().openapi({ example: 'mr-1' }),
    title: z.string().min(3),
    description: z.string().min(1),
    repository: z.string().min(1),
    branch: z.string().min(1),
    status: z.enum(mergeRequestStatusValues),
    drift: z.boolean(),
    lastSyncAt: TimestampSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema
  })
  .openapi('MergeRequest');

export const StoryGwtSchema = z
  .object({
    given: z.string().min(3),
    when: z.string().min(3),
    then: z.string().min(3)
  })
  .openapi('StoryGWT');

export const UserStorySchema = z
  .object({
    id: z.string().openapi({ example: 'story-1' }),
    mrId: z.string(),
    parentId: z.string().nullable(),
    title: z.string().min(5),
    role: z.string().regex(/^As an? /i, 'Role must start with "As a"'),
    action: z.string().regex(/I want to /i, 'Action must contain "I want to"'),
    reason: z.string().regex(/so that/i, 'Reason must contain "so that"'),
    gwt: StoryGwtSchema,
    estimateDays: z.number().int().positive(),
    status: z.enum(userStoryStatusValues),
    depth: z.number().int().nonnegative(),
    order: z.number().int().nonnegative(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema
  })
  .openapi('UserStory');

export const AcceptanceTestSchema = z
  .object({
    id: z.string().openapi({ example: 'test-1' }),
    storyId: z.string(),
    title: z.string().min(3),
    steps: z.array(z.string().min(2)).min(1),
    status: z.enum(acceptanceTestStatusValues),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema
  })
  .openapi('AcceptanceTest');

export type { MergeRequest, UserStory, AcceptanceTest } from './types';

export interface InvestConfig {
  maxDays?: number;
  maxChildren?: number;
}

const DEFAULT_INVEST_CONFIG: Required<InvestConfig> = {
  maxDays: Number(process.env.INVEST_MAX_DAYS ?? 2),
  maxChildren: Number(process.env.INVEST_MAX_CHILDREN ?? 5)
};

const AMBIGUOUS_TERMS = {
  en: ['should', 'maybe', 'asap', 'etc', 'optimal', 'fast', 'sufficiently'],
  ko: ['적절히', '빠르게', '최적', '가능하면', '추후', '등등', '대략']
};

const MEASUREMENT_UNITS = [
  'ms',
  'milliseconds',
  's',
  'sec',
  'seconds',
  'minutes',
  'hours',
  '%',
  'percent',
  'px',
  'kb',
  'mb',
  'gb'
];

export function evaluateInvest(
  story: Pick<UserStory, 'estimateDays' | 'role' | 'action' | 'reason' | 'gwt' | 'title'>,
  options: InvestConfig & { childCount?: number } = {}
): InvestResult {
  const issues: string[] = [];
  const config = { ...DEFAULT_INVEST_CONFIG, ...options };

  if (story.estimateDays > config.maxDays) {
    issues.push(`Story exceeds Small threshold of ${config.maxDays} dev-days`);
  }
  if ((options.childCount ?? 0) > config.maxChildren) {
    issues.push(`Story has more than ${config.maxChildren} children`);
  }
  if (!/^As an? /i.test(story.role)) {
    issues.push('Role should start with "As a"');
  }
  if (!/I want to /i.test(story.action)) {
    issues.push('Action should contain "I want to" phrasing');
  }
  if (!/so that/i.test(story.reason)) {
    issues.push('Reason should explain "so that" value');
  }
  if (!story.gwt.given || !story.gwt.when || !story.gwt.then) {
    issues.push('Missing Given/When/Then context');
  }
  if (story.title.split(' and ').length > 2) {
    issues.push('Title may contain multiple objectives; consider splitting');
  }

  return { compliant: issues.length === 0, issues };
}

export function detectAmbiguity(text: string, locale: keyof typeof AMBIGUOUS_TERMS = 'en'): AmbiguityFlag[] {
  const dictionary = new Set([
    ...AMBIGUOUS_TERMS.en,
    ...(locale === 'ko' ? AMBIGUOUS_TERMS.ko : [])
  ]);
  const lower = text.toLowerCase();
  const flags: AmbiguityFlag[] = [];
  for (const term of dictionary) {
    if (lower.includes(term.toLowerCase())) {
      flags.push({ text: term, reason: 'ambiguous-term' });
    }
  }
  return flags;
}

function detectMissingMeasurements(text: string): AmbiguityFlag[] {
  const flags: AmbiguityFlag[] = [];
  const numericRegex = /\b(\d+(?:\.\d+)?)\b/g;
  let match: RegExpExecArray | null;
  while ((match = numericRegex.exec(text))) {
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 10).toLowerCase();
    const hasUnit = MEASUREMENT_UNITS.some((unit) => after.trim().startsWith(unit));
    if (!hasUnit) {
      flags.push({ text: match[0], reason: 'missing-measurement' });
    }
  }
  return flags;
}

export function analyzeStory(
  story: Pick<UserStory, 'title' | 'action' | 'reason' | 'gwt' | 'estimateDays' | 'role'>,
  options: InvestConfig & { childCount?: number; locale?: keyof typeof AMBIGUOUS_TERMS } = {}
): StoryAnalysis {
  const invest = evaluateInvest(story, options);
  const textFragments = [story.title, story.action, story.reason, story.gwt.given, story.gwt.when, story.gwt.then].join(' ');
  const ambiguity = [
    ...detectAmbiguity(textFragments, options.locale),
    ...detectMissingMeasurements(textFragments)
  ];
  return { invest, ambiguity };
}

export function analyzeTest(
  test: Pick<AcceptanceTest, 'title' | 'steps'>,
  locale: keyof typeof AMBIGUOUS_TERMS = 'en'
): TestAnalysis {
  const text = [test.title, ...test.steps].join(' ');
  const ambiguity = [...detectAmbiguity(text, locale), ...detectMissingMeasurements(text)];
  return { ambiguity };
}

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
  registry.register('MergeRequest', MergeRequestSchema);
  registry.register('UserStory', UserStorySchema);
  registry.register('AcceptanceTest', AcceptanceTestSchema);

  const generator = new OpenAPIGenerator(registry.definitions, {
    openapi: '3.1.0',
    info: {
      title: 'AI PM Mindmap API',
      version: '1.0.0'
    },
    servers: [{ url: 'http://localhost:4000' }]
  });

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'AI PM Mindmap API',
      version: '1.0.0'
    },
    servers: [{ url: 'http://localhost:4000' }]
  });
}

export const ambiguityDictionary = AMBIGUOUS_TERMS;
export const measurementUnits = MEASUREMENT_UNITS;
