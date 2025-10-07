import { analyzeStory, analyzeTest } from '@ai-pm-mindmap/shared';
import type { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';

export function getStoryInsights(story: UserStory, childCount: number) {
  return analyzeStory(story, { childCount });
}

export function getTestInsights(test: AcceptanceTest) {
  return analyzeTest(test);
}
