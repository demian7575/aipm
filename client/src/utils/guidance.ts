export interface GuidanceItem {
  label: string;
  message: string;
  passed: boolean;
}

export interface GuidanceBundle {
  summary: string;
  items: GuidanceItem[];
}

export interface AcceptanceTestDraftShape {
  given: string;
  when: string;
  then: string;
}

export interface AcceptanceTestReview extends GuidanceBundle {}

export function reviewAcceptanceTestStructure(input: AcceptanceTestDraftShape): AcceptanceTestReview {
  const normalized = {
    given: input.given.trim(),
    when: input.when.trim(),
    then: input.then.trim(),
  };

  const items: GuidanceItem[] = [
    buildItem(
      'Given clause',
      normalized.given.length >= 10 && normalized.given.toLowerCase().startsWith('given'),
      normalized.given
        ? normalized.given.toLowerCase().startsWith('given')
          ? 'Context begins with "Given" and contains observable state.'
          : 'Start the clause with "Given" to keep the scenario in Gherkin format.'
        : 'Describe the initial state using a "Given" sentence.',
    ),
    buildItem(
      'When clause',
      normalized.when.length >= 10 && normalized.when.toLowerCase().startsWith('when'),
      normalized.when
        ? normalized.when.toLowerCase().startsWith('when')
          ? 'Trigger starts with "When" and outlines a measurable action.'
          : 'Prefix the trigger with "When" so the step is executable.'
        : 'Explain the trigger action using "When".',
    ),
    buildItem(
      'Then clause',
      normalized.then.length >= 10 && normalized.then.toLowerCase().startsWith('then') && !/quickly|nicely|good/i.test(normalized.then),
      normalized.then
        ? normalized.then.toLowerCase().startsWith('then')
          ? /quickly|nicely|good/i.test(normalized.then)
            ? 'Replace subjective words with measurable outcomes in the Then clause.'
            : 'Outcome is observable and aligned with Gherkin expectations.'
          : 'Begin the result with "Then" to follow Given/When/Then format.'
        : 'State the expected result starting with "Then".',
    ),
  ];

  const passedCount = items.filter((item) => item.passed).length;
  return {
    items,
    summary: `${passedCount}/3 acceptance test heuristics satisfied`,
  };
}

export interface MergeRequestDraftShape {
  title: string;
  description: string;
  objective: string;
}

export interface MergeRequestReview extends GuidanceBundle {
  ready: boolean;
}

export function reviewMergeRequest(draft: MergeRequestDraftShape): MergeRequestReview {
  const normalized = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    objective: draft.objective.trim(),
  };

  const items: GuidanceItem[] = [
    buildItem(
      'Title clarity',
      normalized.title.length >= 8 && /mr/i.test(normalized.title),
      normalized.title.length >= 8
        ? /mr/i.test(normalized.title)
          ? 'Title references the merge request and communicates intent.'
          : 'Include "MR" in the title to signal the workstream.'
        : 'Expand the title so collaborators understand the scope.',
    ),
    buildItem(
      'Description depth',
      normalized.description.length >= 40,
      normalized.description.length >= 40
        ? 'Description provides sufficient background for planning.'
        : 'Add context and constraints so downstream stories can be derived.',
    ),
    buildItem(
      'Objective articulation',
      normalized.objective.length >= 30,
      normalized.objective.length >= 30
        ? 'Objective explains the business outcome the MR aims to deliver.'
        : 'Describe the measurable outcome this MR should achieve.',
    ),
  ];

  const passedCount = items.filter((item) => item.passed).length;
  return {
    items,
    summary: `${passedCount}/3 MR quality checks satisfied`,
    ready: items.every((item) => item.passed),
  };
}

function buildItem(label: string, passed: boolean, message: string): GuidanceItem {
  return { label, passed, message };
}
