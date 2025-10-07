import {
  AcceptanceTest,
  UserStory,
  checkInvest,
  detectAmbiguity,
  hasMeasurableValue,
  validateStoryNarrative
} from '@ai-pm-mindmap/shared';

export function evaluateStory(story: UserStory) {
  return validateStoryNarrative(story);
}

export function evaluateInvest(story: UserStory, childrenCount: number) {
  return checkInvest({
    title: story.title,
    estimateDays: story.estimateDays,
    childrenCount
  });
}

export function evaluateTest(test: AcceptanceTest) {
  const ambiguous = detectAmbiguity(test.title);
  const measurable = hasMeasurableValue(test.title) || test.steps.some(hasMeasurableValue);
  return {
    ambiguous,
    measurable
  };
}
