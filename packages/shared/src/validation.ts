import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  AMBIGUITY_DICTIONARY,
  DEFAULT_INVEST_OPTIONS,
  NUMERIC_WITH_UNIT
} from './constants.js';
import type {
  AcceptanceTest,
  InvestValidationOptions,
  MergeRequest,
  RollupResult,
  StoryTree,
  StoryTreeNode,
  UserStory
} from './schemas.js';

export interface ValidationMessage {
  type: 'error' | 'warning';
  code: string;
  message: string;
}

export interface InvestValidationResult {
  checklist: {
    independent: boolean;
    negotiable: boolean;
    valuable: boolean;
    estimable: boolean;
    small: boolean;
    testable: boolean;
  };
  messages: ValidationMessage[];
  canSave: boolean;
}

export interface MeasurabilityIssue {
  text: string;
  index: number;
  reason: 'missingQuantifiableOutcome';
  guidance: string;
  examples: string[];
}

export interface MeasurabilityResult {
  ok: boolean;
  offending: MeasurabilityIssue[];
}

export interface AcceptanceTestValidationResult {
  ambiguityFlags: string[];
  measurability: MeasurabilityResult;
}

export interface PolicyConfig extends Required<InvestValidationOptions> {}

export const DEFAULT_POLICY: PolicyConfig = {
  smallChildrenThreshold: DEFAULT_INVEST_OPTIONS.smallChildrenThreshold,
  smallEstimateDays: DEFAULT_INVEST_OPTIONS.smallEstimateDays,
  policy: DEFAULT_INVEST_OPTIONS.policy
};

export function detectAmbiguity(values: string[]): string[] {
  const flags = new Set<string>();
  values.forEach((value) => {
    const lower = value.toLowerCase();
    AMBIGUITY_DICTIONARY.forEach((word) => {
      if (lower.includes(word.toLowerCase())) {
        flags.add(word);
      }
    });
  });
  return Array.from(flags);
}

const MEASURABILITY_EXAMPLES = [
  'response time ≤ 500 ms',
  'error rate < 1%',
  'at least 3 notifications recorded',
  'downloaded CSV contains "invoiceId" column',
  'status updated within 2 minutes'
];

export function requireMeasurable(values: string[]): MeasurabilityResult {
  const offending: MeasurabilityIssue[] = [];
  values.forEach((value, index) => {
    const text = value.trim();
    if (!NUMERIC_WITH_UNIT.test(text)) {
      offending.push({
        text,
        index,
        reason: 'missingQuantifiableOutcome',
        guidance:
          'Specify an observable result with numeric thresholds, ranges, explicit fields, or time limits so the step can be verified.',
        examples: MEASURABILITY_EXAMPLES
      });
    }
  });
  return {
    ok: offending.length === 0,
    offending
  };
}

export function validateAcceptanceTest(values: {
  given: string[];
  when: string[];
  then: string[];
}): AcceptanceTestValidationResult {
  const ambiguityFlags = detectAmbiguity([...values.given, ...values.when, ...values.then]);
  const measurability = requireMeasurable(values.then);
  return { ambiguityFlags, measurability };
}

export function validateStoryInvest(
  story: UserStory,
  context: { tests: AcceptanceTest[]; children: UserStory[] },
  options: InvestValidationOptions = {}
): InvestValidationResult {
  const policy: PolicyConfig = {
    ...DEFAULT_POLICY,
    ...options
  } as PolicyConfig;

  const messages: ValidationMessage[] = [];
  const independent = !story.title.toLowerCase().includes(' and ');
  const negotiable = !story.title.toLowerCase().includes(' must ');
  const valuable = story.soThat.trim().length > 5;
  const estimable = typeof story.estimateDays === 'number' ? story.estimateDays <= 10 : true;
  const small =
    (typeof story.estimateDays === 'number'
      ? story.estimateDays <= policy.smallEstimateDays
      : true) && context.children.length <= policy.smallChildrenThreshold;
  const testable = context.tests.length > 0;

  const checklist = {
    independent,
    negotiable,
    valuable,
    estimable,
    small,
    testable
  };

  (Object.keys(checklist) as Array<keyof typeof checklist>).forEach((key) => {
    if (!checklist[key]) {
      messages.push({
        type: policy.policy === 'block' ? 'error' : 'warning',
        code: `invest.${key}`,
        message: `Story does not satisfy INVEST requirement: ${key}`
      });
    }
  });

  const canSave =
    messages.filter((msg) => msg.type === 'error').length === 0 &&
    Object.values(checklist).every(Boolean);

  return {
    checklist,
    messages,
    canSave
  };
}

export function buildStoryTree(
  stories: UserStory[],
  tests: AcceptanceTest[],
  mr: MergeRequest
): StoryTree {
  const map = new Map<string, StoryTreeNode>();
  stories.forEach((story) => {
    map.set(story.id, {
      story,
      children: [],
      tests: tests.filter((test) => test.storyId === story.id)
    });
  });

  const roots: StoryTreeNode[] = [];
  map.forEach((node) => {
    if (node.story.parentId) {
      const parent = map.get(node.story.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else if (mr.storyIds.includes(node.story.id)) {
      roots.push(node);
    }
  });

  return roots.sort((a, b) => a.story.order - b.story.order);
}

export function computeRollup(node: StoryTreeNode): RollupResult {
  const children = node.children.map(computeRollup);
  const childStatuses = children.map((child) => child.status);
  const allTests = node.tests;
  const testsPassing = allTests.length > 0 && allTests.every((test) => test.status === 'Pass');
  const childApproved = childStatuses.every((status) => status === 'Approved');
  let status: 'Draft' | 'Ready' | 'Approved' = node.story.status;

  if (testsPassing && childApproved) {
    status = 'Approved';
  } else if (node.story.status === 'Approved' && (!testsPassing || !childApproved)) {
    status = 'Ready';
  }

  return {
    storyId: node.story.id,
    status,
    tests: node.tests,
    children
  };
}

export function rollupStatus(
  mr: MergeRequest,
  stories: UserStory[],
  tests: AcceptanceTest[]
): RollupResult[] {
  const tree = buildStoryTree(stories, tests, mr);
  return tree.map(computeRollup);
}

export interface StoryFactoryInput {
  mrId: string;
  parentId?: string | null;
  order?: number;
  depth?: number;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  storyPoint?: number | null;
  assignee?: { name: string; email: string } | null;
  referenceDocuments?: { id: string; title: string; url: string }[];
}

export function createStory(input: StoryFactoryInput): UserStory {
  const now = formatISO(new Date());
  const id = uuid();
  return {
    id,
    mrId: input.mrId,
    parentId: input.parentId ?? null,
    order: input.order ?? 0,
    depth: input.depth ?? 0,
    title: input.title,
    asA: input.asA,
    iWant: input.iWant,
    soThat: input.soThat,
    invest: {
      independent: true,
      negotiable: true,
      valuable: true,
      estimable: true,
      small: true,
      testable: false
    },
    storyPoint:
      typeof input.storyPoint === 'number' && Number.isFinite(input.storyPoint)
        ? Math.max(0, Math.min(100, input.storyPoint))
        : null,
    assignee: input.assignee
      ? {
          name: input.assignee.name.trim(),
          email: input.assignee.email.trim()
        }
      : null,
    referenceDocuments: Array.isArray(input.referenceDocuments)
      ? input.referenceDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title,
          url: doc.url
        }))
      : [],
    estimateDays: undefined,
    childrenIds: [],
    testIds: [],
    status: 'Draft',
    createdAt: now,
    updatedAt: now,
    version: 0
  };
}

export function createAcceptanceTest(storyId: string): AcceptanceTest {
  const now = formatISO(new Date());
  const id = uuid();
  return {
    id,
    storyId,
    given: ['context is ready'],
    when: ['action occurs'],
    then: ['result observed in 5 seconds'],
    ambiguityFlags: [],
    status: 'Draft',
    createdAt: now,
    updatedAt: now,
    version: 0
  };
}
