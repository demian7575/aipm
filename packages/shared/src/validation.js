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

export const requireMeasurable = (steps) => {
  const offending = [];
  steps.forEach((step, index) => {
    const matchesPattern = numericUnitPatterns.some((pattern) => pattern.test(step));
    if (!matchesPattern) {
      offending.push({ text: step, index });
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

export const schemasForOpenApi = {
  components: openApiComponents,
  references: {
    mergeRequestSchema,
    userStorySchema,
    acceptanceTestSchema
  }
};
