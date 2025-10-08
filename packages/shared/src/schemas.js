const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isIsoDateTime = (value) => {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
};

const assertUuid = (value, field) => {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID string.`);
  }
};

const assertBoolean = (value, field) => {
  if (typeof value !== 'boolean') {
    throw new Error(`${field} must be a boolean.`);
  }
};

const assertString = (value, field) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
};

const assertNumber = (value, field) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${field} must be a valid number.`);
  }
};

const assertArray = (value, field) => {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
};

const assertIsoDate = (value, field) => {
  if (!isIsoDateTime(value)) {
    throw new Error(`${field} must be an ISO 8601 date string.`);
  }
};

export const mergeRequestStatusValues = ['Draft', 'Ready', 'InReview', 'Merged', 'Closed'];
export const userStoryStatusValues = ['Draft', 'Ready', 'Approved'];
export const acceptanceTestStatusValues = ['Draft', 'Ready', 'Pass', 'Fail', 'Blocked'];

export const DEFAULT_MAX_DEPTH = 4;
export const DEFAULT_INVEST_SMALL_DAY_THRESHOLD = 2;
export const DEFAULT_INVEST_SMALL_CHILDREN_THRESHOLD = 5;

export const ambiguityDictionary = [
  '적절히',
  '빠르게',
  '최적',
  '가능하면',
  '추후',
  '등등',
  '대략',
  '충분히',
  'should',
  'maybe',
  'asap',
  'etc',
  'optimal',
  'fast',
  'sufficiently'
];

export const numericUnitPatterns = [
  /\b\d+\s*(ms|milliseconds?)\b/i,
  /\b\d+\s*(s|sec|seconds?)\b/i,
  /\b\d+\s*(m|min|minutes?)\b/i,
  /\b\d+\s*(h|hr|hours?)\b/i,
  /\b\d+\s*(days?)\b/i,
  /\b\d+\s*(percent|%)\b/i,
  /\b\d+\s*(kb|kilobytes?|mb|megabytes?|gb|gigabytes?)\b/i,
  /\b\d+\s*(users?|transactions?|requests?|items?)\b/i,
  /\b\d+\s*(times?)\b/i
];

export const INVEST_FAILURE_MESSAGES = {
  independent: 'Story references multiple disjoint objectives; split it to ensure independence.',
  negotiable: 'Story contains inflexible language (e.g., "must"); rephrase to stay negotiable.',
  valuable: 'Story must articulate clear business value in the "so that" clause.',
  estimable: 'Story remains ambiguous; clarify acceptance criteria to make it estimable.',
  small: 'Story exceeds recommended scope (>{days} dev-days or children > {children}).',
  testable: 'Story requires at least one measurable acceptance test to be testable.'
};

export const absoluteLanguageTerms = ['must', '필수', '반드시'];
export const conjunctionTerms = [' and ', ' 그리고 ', ' 및 '];

export const mergeRequestSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'summary',
    'status',
    'branch',
    'drift',
    'lastSyncAt',
    'storyIds',
    'createdAt',
    'updatedAt',
    'version'
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', maxLength: 120 },
    summary: { type: 'string', maxLength: 500 },
    status: { type: 'string', enum: mergeRequestStatusValues },
    branch: { type: 'string' },
    drift: { type: 'boolean' },
    lastSyncAt: { type: 'string', format: 'date-time' },
    storyIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    version: { type: 'integer', minimum: 0 }
  }
};

export const userStorySchema = {
  type: 'object',
  required: [
    'id',
    'mrId',
    'parentId',
    'order',
    'depth',
    'title',
    'asA',
    'iWant',
    'soThat',
    'invest',
    'childrenIds',
    'testIds',
    'status',
    'createdAt',
    'updatedAt',
    'version'
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    mrId: { type: 'string', format: 'uuid' },
    parentId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
    order: { type: 'integer', minimum: 0 },
    depth: { type: 'integer', minimum: 0 },
    title: { type: 'string', maxLength: 160 },
    asA: { type: 'string' },
    iWant: { type: 'string' },
    soThat: { type: 'string' },
    invest: {
      type: 'object',
      required: ['independent', 'negotiable', 'valuable', 'estimable', 'small', 'testable'],
      properties: {
        independent: { type: 'boolean' },
        negotiable: { type: 'boolean' },
        valuable: { type: 'boolean' },
        estimable: { type: 'boolean' },
        small: { type: 'boolean' },
        testable: { type: 'boolean' }
      }
    },
    childrenIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    testIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    status: { type: 'string', enum: userStoryStatusValues },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    version: { type: 'integer', minimum: 0 }
  }
};

export const acceptanceTestSchema = {
  type: 'object',
  required: [
    'id',
    'storyId',
    'given',
    'when',
    'then',
    'ambiguityFlags',
    'status',
    'createdAt',
    'updatedAt',
    'version'
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    storyId: { type: 'string', format: 'uuid' },
    given: { type: 'array', items: { type: 'string' }, minItems: 1 },
    when: { type: 'array', items: { type: 'string' }, minItems: 1 },
    then: { type: 'array', items: { type: 'string' }, minItems: 1 },
    ambiguityFlags: { type: 'array', items: { type: 'string' } },
    status: { type: 'string', enum: acceptanceTestStatusValues },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    version: { type: 'integer', minimum: 0 }
  }
};

const ensureStringArray = (value, field, { allowEmpty = true } = {}) => {
  assertArray(value, field);
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || (!allowEmpty && entry.length === 0)) {
      throw new Error(`${field}[${index}] must be a non-empty string.`);
    }
  });
  if (!allowEmpty && value.length === 0) {
    throw new Error(`${field} must contain at least one item.`);
  }
};

export const assertMergeRequest = (value) => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Merge request must be an object.');
  }

  assertUuid(value.id, 'mergeRequest.id');
  assertString(value.title, 'mergeRequest.title');
  if (value.title.length > 120) {
    throw new Error('mergeRequest.title must be 120 characters or fewer.');
  }
  if (typeof value.summary !== 'string') {
    throw new Error('mergeRequest.summary must be a string.');
  }
  if (value.summary.length > 500) {
    throw new Error('mergeRequest.summary must be 500 characters or fewer.');
  }
  if (!mergeRequestStatusValues.includes(value.status)) {
    throw new Error('mergeRequest.status is invalid.');
  }
  assertString(value.branch, 'mergeRequest.branch');
  assertBoolean(value.drift, 'mergeRequest.drift');
  assertIsoDate(value.lastSyncAt, 'mergeRequest.lastSyncAt');
  assertArray(value.storyIds, 'mergeRequest.storyIds');
  value.storyIds.forEach((id, index) => assertUuid(id, `mergeRequest.storyIds[${index}]`));
  assertIsoDate(value.createdAt, 'mergeRequest.createdAt');
  assertIsoDate(value.updatedAt, 'mergeRequest.updatedAt');
  assertNumber(value.version, 'mergeRequest.version');
  if (!Number.isInteger(value.version) || value.version < 0) {
    throw new Error('mergeRequest.version must be a non-negative integer.');
  }
  return value;
};

export const assertUserStory = (value) => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('User story must be an object.');
  }
  assertUuid(value.id, 'userStory.id');
  assertUuid(value.mrId, 'userStory.mrId');
  if (value.parentId !== null) {
    assertUuid(value.parentId, 'userStory.parentId');
  }
  assertNumber(value.order, 'userStory.order');
  if (!Number.isInteger(value.order) || value.order < 0) {
    throw new Error('userStory.order must be a non-negative integer.');
  }
  assertNumber(value.depth, 'userStory.depth');
  if (!Number.isInteger(value.depth) || value.depth < 0) {
    throw new Error('userStory.depth must be a non-negative integer.');
  }
  assertString(value.title, 'userStory.title');
  if (value.title.length > 160) {
    throw new Error('userStory.title must be 160 characters or fewer.');
  }
  assertString(value.asA, 'userStory.asA');
  assertString(value.iWant, 'userStory.iWant');
  assertString(value.soThat, 'userStory.soThat');

  if (typeof value.invest !== 'object' || value.invest === null) {
    throw new Error('userStory.invest must be an object with boolean flags.');
  }
  ['independent', 'negotiable', 'valuable', 'estimable', 'small', 'testable'].forEach((key) =>
    assertBoolean(value.invest[key], `userStory.invest.${key}`)
  );

  assertArray(value.childrenIds, 'userStory.childrenIds');
  value.childrenIds.forEach((id, index) => assertUuid(id, `userStory.childrenIds[${index}]`));

  assertArray(value.testIds, 'userStory.testIds');
  value.testIds.forEach((id, index) => assertUuid(id, `userStory.testIds[${index}]`));

  if (!userStoryStatusValues.includes(value.status)) {
    throw new Error('userStory.status is invalid.');
  }

  assertIsoDate(value.createdAt, 'userStory.createdAt');
  assertIsoDate(value.updatedAt, 'userStory.updatedAt');

  assertNumber(value.version, 'userStory.version');
  if (!Number.isInteger(value.version) || value.version < 0) {
    throw new Error('userStory.version must be a non-negative integer.');
  }

  return value;
};

export const assertAcceptanceTest = (value) => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Acceptance test must be an object.');
  }

  assertUuid(value.id, 'acceptanceTest.id');
  assertUuid(value.storyId, 'acceptanceTest.storyId');
  ensureStringArray(value.given, 'acceptanceTest.given', { allowEmpty: false });
  ensureStringArray(value.when, 'acceptanceTest.when', { allowEmpty: false });
  ensureStringArray(value.then, 'acceptanceTest.then', { allowEmpty: false });
  ensureStringArray(value.ambiguityFlags, 'acceptanceTest.ambiguityFlags');

  if (!acceptanceTestStatusValues.includes(value.status)) {
    throw new Error('acceptanceTest.status is invalid.');
  }

  assertIsoDate(value.createdAt, 'acceptanceTest.createdAt');
  assertIsoDate(value.updatedAt, 'acceptanceTest.updatedAt');

  assertNumber(value.version, 'acceptanceTest.version');
  if (!Number.isInteger(value.version) || value.version < 0) {
    throw new Error('acceptanceTest.version must be a non-negative integer.');
  }

  return value;
};

export const openApiComponents = {
  MergeRequest: mergeRequestSchema,
  UserStory: userStorySchema,
  AcceptanceTest: acceptanceTestSchema,
  MergeRequestList: { type: 'array', items: mergeRequestSchema },
  UserStoryList: { type: 'array', items: userStorySchema },
  AcceptanceTestList: { type: 'array', items: acceptanceTestSchema }
};
