import { z } from 'zod';

export const investChecklistSchema = z.object({
  independent: z.boolean(),
  negotiable: z.boolean(),
  valuable: z.boolean(),
  estimable: z.boolean(),
  small: z.boolean(),
  testable: z.boolean()
});

export const acceptanceTestSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  given: z.array(z.string().trim().min(1)).min(1),
  when: z.array(z.string().trim().min(1)).min(1),
  then: z.array(z.string().trim().min(1)).min(1),
  ambiguityFlags: z.array(z.string()),
  status: z.enum(['Draft', 'Ready', 'Pass', 'Fail', 'Blocked']).default('Draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative()
});

export const userStorySchema = z.object({
  id: z.string().uuid(),
  mrId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  order: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  title: z.string().trim().min(3).max(160),
  asA: z.string().trim().min(3),
  iWant: z.string().trim().min(3),
  soThat: z.string().trim().min(3),
  invest: investChecklistSchema,
  estimateDays: z.number().positive().max(30).optional(),
  childrenIds: z.array(z.string().uuid()),
  testIds: z.array(z.string().uuid()),
  status: z.enum(['Draft', 'Ready', 'Approved']).default('Draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative()
});

export const mergeRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(500),
  status: z.enum(['Draft', 'Ready', 'InReview', 'Merged', 'Closed']).default('Draft'),
  branch: z.string().trim().min(1),
  drift: z.boolean().default(false),
  lastSyncAt: z.string().datetime(),
  storyIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative()
});

export const mergeRequestCollectionSchema = z.array(mergeRequestSchema);
export const storyCollectionSchema = z.array(userStorySchema);
export const acceptanceTestCollectionSchema = z.array(acceptanceTestSchema);

export type MergeRequest = z.infer<typeof mergeRequestSchema>;
export type UserStory = z.infer<typeof userStorySchema>;
export type AcceptanceTest = z.infer<typeof acceptanceTestSchema>;
export type InvestChecklist = z.infer<typeof investChecklistSchema>;

export interface StoryTreeNode {
  story: UserStory;
  children: StoryTreeNode[];
  tests: AcceptanceTest[];
}

export type StoryTree = StoryTreeNode[];

export interface RollupResult {
  storyId: string;
  status: 'Draft' | 'Ready' | 'Approved';
  tests: AcceptanceTest[];
  children: RollupResult[];
}

export interface InvestValidationOptions {
  smallChildrenThreshold?: number;
  smallEstimateDays?: number;
  policy?: 'warn' | 'block';
}
