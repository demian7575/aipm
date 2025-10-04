export interface StoryLike {
  asA: string;
  iWant: string;
  soThat: string;
  given: string;
  when: string;
  then: string;
}

interface InvestCheckItem {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface InvestEvaluation {
  items: InvestCheckItem[];
  summary: string;
}

const MIN_PHRASE_LENGTH = 12;

const containsMultipleObjectives = /\band\b/i;
const vagueTerms = /(quickly|easily|nice|good|improve|optimize)/i;

export function evaluateInvest(story: StoryLike): InvestEvaluation {
  const normalized = {
    asA: story.asA.trim(),
    iWant: story.iWant.trim(),
    soThat: story.soThat.trim(),
    given: story.given.trim(),
    when: story.when.trim(),
    then: story.then.trim(),
  };

  const items: InvestCheckItem[] = [
    buildCheck(
      'independent',
      'Independent',
      normalized.iWant.length > 0 && !containsMultipleObjectives.test(normalized.iWant),
      normalized.iWant.length > 0
        ? containsMultipleObjectives.test(normalized.iWant)
          ? 'Avoid chaining multiple desires; split into separate stories.'
          : 'The intent focuses on a single objective.'
        : 'Add a clear objective in the "I want" statement.',
    ),
    buildCheck(
      'negotiable',
      'Negotiable',
      normalized.soThat.length > 0 && !/must|exactly/i.test(normalized.soThat),
      normalized.soThat.length > 0
        ? /must|exactly/i.test(normalized.soThat)
          ? 'Describe the benefit without prescribing an exact implementation.'
          : 'Outcome leaves space for implementation choices.'
        : 'Explain the user benefit to keep scope negotiable.',
    ),
    buildCheck(
      'valuable',
      'Valuable',
      normalized.soThat.length >= MIN_PHRASE_LENGTH,
      normalized.soThat.length >= MIN_PHRASE_LENGTH
        ? 'Benefit statement has enough detail to justify the story.'
        : 'Expand on the value delivered so stakeholders can assess the impact.',
    ),
    buildCheck(
      'estimable',
      'Estimable',
      normalized.iWant.length >= MIN_PHRASE_LENGTH && !vagueTerms.test(normalized.iWant),
      normalized.iWant.length >= MIN_PHRASE_LENGTH && !vagueTerms.test(normalized.iWant)
        ? 'Objective is specific enough for estimation discussions.'
        : 'Clarify the objective with measurable signals (avoid terms like "quickly").',
    ),
    buildCheck(
      'small',
      'Small',
      normalized.iWant.split(' ').length <= 25,
      normalized.iWant.split(' ').length <= 25
        ? 'Scope appears manageable for a single iteration.'
        : 'Consider splitting this story into smaller deliverables.',
    ),
    buildCheck(
      'testable',
      'Testable',
      normalized.given.length >= MIN_PHRASE_LENGTH &&
        normalized.when.length >= MIN_PHRASE_LENGTH &&
        normalized.then.length >= MIN_PHRASE_LENGTH &&
        !vagueTerms.test(normalized.then),
      normalized.given && normalized.when && normalized.then
        ? !vagueTerms.test(normalized.then)
          ? 'Scenario expresses observable conditions and outcomes.'
          : 'Replace vague success criteria with observable results.'
        : 'Provide Given/When/Then details to make this verifiable.',
    ),
  ];

  const passedCount = items.filter((item) => item.passed).length;
  const summary = `${passedCount}/6 INVEST checks satisfied`;

  return { items, summary };
}

function buildCheck(key: string, label: string, passed: boolean, message: string): InvestCheckItem {
  return { key, label, passed, message };
}
