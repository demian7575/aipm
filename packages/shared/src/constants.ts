export const AMBIGUITY_DICTIONARY = [
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

export const NUMERIC_WITH_UNIT = /(?:(\d+)(?:\.\d+)?)\s?(?:ms|s|sec|seconds?|minutes?|hours?|days?|weeks?|%|percent|kb|mb|gb|users?|items?|cases?)/i;

export const DEFAULT_INVEST_OPTIONS = {
  maxDepth: 4,
  smallChildrenThreshold: 5,
  smallEstimateDays: 2,
  policy: 'warn' as 'warn' | 'block'
};
