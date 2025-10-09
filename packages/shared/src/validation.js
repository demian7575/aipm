import {
  acceptanceTestSchema,
  ambiguityDictionary,
  absoluteLanguageTerms,
  assertAcceptanceTest,
  assertMergeRequest,
  assertUserStory,
  DEFAULT_INVEST_SMALL_CHILDREN_THRESHOLD,
  DEFAULT_INVEST_SMALL_DAY_THRESHOLD,
  INVEST_FAILURE_MESSAGES,
  mergeRequestSchema,
  numericUnitPatterns,
  openApiComponents,
  userStorySchema,
  conjunctionTerms
} from './schemas.js';
import { randomUUID } from 'node:crypto';

const nowIso = () => new Date().toISOString();

export const ValidationPolicies = { WARN: 'warn', BLOCK: 'block' };

export const defaultValidationConfig = {
  invest: {
    smallDayThreshold: DEFAULT_INVEST_SMALL_DAY_THRESHOLD,
    smallChildrenThreshold: DEFAULT_INVEST_SMALL_CHILDREN_THRESHOLD,
    policy: ValidationPolicies.BLOCK
  },
  ambiguityDictionary
};

export const detectAmbiguity = (texts, dictionary = defaultValidationConfig.ambiguityDictionary) => {
  const issues = [];
  texts.forEach((text, index) => {
    const lowered = text.toLowerCase();
    dictionary.forEach((term) => {
      if (lowered.includes(term.toLowerCase())) {
        issues.push({ term, text, index });
      }
    });
  });

  return { issues, hasIssues: issues.length > 0 };
};

const measurabilityExamples = [
  'response time ≤ 500 ms',
  'error rate < 1%',
  'at least 3 notifications recorded',
  'downloaded CSV contains "invoiceId" column',
  'status updated within 2 minutes'
];

export const requireMeasurable = (steps) => {
  const offending = [];
  steps.forEach((step, index) => {
    const text = step.trim();
    const matchesPattern = numericUnitPatterns.some((pattern) => pattern.test(text));
    if (!matchesPattern) {
      offending.push({
        text,
        index,
        reason: 'missingQuantifiableOutcome',
        guidance:
          'Specify an observable result with numeric thresholds, ranges, explicit fields, or time limits so the step can be verified.',
        examples: measurabilityExamples
      });
    }
  });
  return { ok: offending.length === 0, offending };
};

const containsAny = (text, patterns) => {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
};

const gatherDescendantStories = (stories, storyId) => {
  const result = [];
  const queue = stories.filter((story) => story.parentId === storyId);
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    queue.push(...stories.filter((story) => story.parentId === current.id));
  }
  return result;
};

const getTestsForStory = (tests, storyId) => tests.filter((test) => test.storyId === storyId);

const withMessage = (principle, messageOverrides = {}) => ({
  ok: false,
  message: messageOverrides[principle] ?? INVEST_FAILURE_MESSAGES[principle]
});

export const validateStoryInvest = (story, options) => {
  const config = {
    ...defaultValidationConfig,
    ...options.config,
    invest: {
      ...defaultValidationConfig.invest,
      ...(options.config?.invest ?? {})
    },
    ambiguityDictionary:
      options.config?.ambiguityDictionary ?? defaultValidationConfig.ambiguityDictionary
  };

  const texts = [story.title, story.asA, story.iWant, story.soThat];
  const ambiguity = detectAmbiguity(texts, config.ambiguityDictionary);
  const children = options.stories.filter((candidate) => candidate.parentId === story.id);
  const descendants = gatherDescendantStories(options.stories, story.id);
  const directTests = getTestsForStory(options.tests, story.id);

  const independentOk = !containsAny(`${story.title} ${story.iWant}`, conjunctionTerms);
  const negotiableOk = !containsAny(texts.join(' '), absoluteLanguageTerms);
  const valuableOk = story.soThat.trim().length >= 8 && !ambiguity.hasIssues;
  const estimableOk = !ambiguity.hasIssues;
  const smallOk =
    children.length <= config.invest.smallChildrenThreshold &&
    descendants.length <= config.invest.smallChildrenThreshold;

  const measurable = requireMeasurable(directTests.flatMap((test) => test.then));
  const testableOk = directTests.length > 0 && measurable.ok;

  const principles = {
    independent: independentOk ? { ok: true } : withMessage('independent'),
    negotiable: negotiableOk ? { ok: true } : withMessage('negotiable'),
    valuable: valuableOk ? { ok: true } : withMessage('valuable'),
    estimable: estimableOk ? { ok: true } : withMessage('estimable'),
    small: smallOk
      ? { ok: true }
      : withMessage('small', {
          small: INVEST_FAILURE_MESSAGES.small
            .replace('{days}', String(config.invest.smallDayThreshold))
            .replace('{children}', String(config.invest.smallChildrenThreshold))
        }),
    testable: testableOk ? { ok: true } : withMessage('testable')
  };

  return {
    ok: Object.values(principles).every((value) => value.ok),
    principles
  };
};

export const enforceInvestPolicy = (story, options) => {
  const result = validateStoryInvest(story, options);
  const policy = options.config?.invest?.policy ?? defaultValidationConfig.invest.policy;
  const canSave = policy === ValidationPolicies.WARN ? true : result.ok;
  return { ...result, policy, canSave };
};

const areAllTestsPassing = (tests) => tests.length > 0 && tests.every((test) => test.status === 'Pass');

const computeStoryRollup = (story, stories, tests) => {
  const children = stories.filter((candidate) => candidate.parentId === story.id);
  const descendants = gatherDescendantStories(stories, story.id);
  const directTests = getTestsForStory(tests, story.id);
  const childResults = children.map((child) => computeStoryRollup(child, stories, tests));
  const allDescendantApproved = childResults.every((child) => child.isApproved);
  const testsPass = areAllTestsPassing(directTests);

  return {
    storyId: story.id,
    isApproved: testsPass && allDescendantApproved,
    failingTestIds: testsPass
      ? []
      : directTests.filter((test) => test.status !== 'Pass').map((test) => test.id),
    descendantStoryIds: descendants.map((descendant) => descendant.id)
  };
};

export const rollupStatus = (mergeRequest, stories, tests) => {
  assertMergeRequest(mergeRequest);
  stories.forEach((story) => assertUserStory(story));
  tests.forEach((test) => assertAcceptanceTest(test));

  const rootStories = stories.filter((story) => story.parentId === null);
  const processed = new Map();

  const collect = (story) => {
    if (processed.has(story.id)) return;
    const result = computeStoryRollup(story, stories, tests);
    processed.set(story.id, result);
    stories.filter((candidate) => candidate.parentId === story.id).forEach(collect);
  };

  rootStories.forEach(collect);

  const storyResults = Array.from(processed.values());
  const approvedStoryIds = storyResults.filter((story) => story.isApproved).map((story) => story.storyId);

  return {
    mergeRequestId: mergeRequest.id,
    approvedStoryIds,
    totalStories: stories.length,
    stories: storyResults
  };
};

export const createStory = (input) => {
  const now = nowIso();
  const id = randomUUID();
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
    childrenIds: [],
    testIds: [],
    status: 'Draft',
    createdAt: now,
    updatedAt: now,
    version: 0
  };
};

export const createAcceptanceTest = (storyId) => {
  const now = nowIso();
  const id = randomUUID();
  return {
    id,
    storyId,
    given: ['context is prepared'],
    when: ['action is triggered'],
    then: ['result observed within 5 seconds'],
    ambiguityFlags: [],
    status: 'Draft',
    createdAt: now,
    updatedAt: now,
    version: 0
  };
};

export const schemasForOpenApi = {
  components: openApiComponents,
  references: {
    mergeRequestSchema,
    userStorySchema,
    acceptanceTestSchema
  }
};
export const validateAcceptanceTest = (test) => {
  const ambiguity = detectAmbiguity([...test.given, ...test.when, ...test.then]);
  const measurability = requireMeasurable(test.then);
  return {
    ambiguity,
    measurability,
    ok: ambiguity.hasIssues === false && measurability.ok
  };
};

