import { Router } from 'express';
import { z } from 'zod';
import { githubWebhookHandler } from './githubWebhook.js';
import { mindmapSnapshot } from './mockData.js';
import {
  AcceptanceTestDraft,
  MergeRequestRoot,
  MindmapSnapshot,
  ReferenceRepositoryConfig,
  UserStoryNode,
} from './types.js';

const router = Router();

router.get('/mindmap', (_req, res) => {
  const payload: MindmapSnapshot = mindmapSnapshot;
  res.json(payload);
});

const createStorySchema = z.object({
  parentId: z.string(),
  parentType: z.enum(['mr', 'userStory']).default('userStory'),
  asA: z.string().min(3),
  iWant: z.string().min(3),
  soThat: z.string().min(3),
  acceptanceTest: z.object({
    given: z.string().min(3),
    when: z.string().min(3),
    then: z.string().min(3),
  }),
});

const referenceRepositorySchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
});

router.post('/mindmap/nodes', (req, res) => {
  const parseResult = createStorySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(422).json({ status: 'error', issues: parseResult.error.issues });
  }

  const { parentId, parentType, asA, iWant, soThat, acceptanceTest } = parseResult.data;
  const container =
    parentType === 'mr'
      ? findMergeRequestById(mindmapSnapshot.mergeRequests, parentId)
      : findStoryById(mindmapSnapshot.mergeRequests, parentId);

  if (!container) {
    return res.status(404).json({ status: 'error', message: 'Parent node not found' });
  }

  const newStory: UserStoryNode = {
    id: `us-${Date.now()}`,
    parentId: parentType === 'mr' ? null : container.id,
    type: 'UserStory',
    title: `${asA} — ${iWant.substring(0, 42)}…`,
    asA,
    iWant,
    soThat,
    status: 'draft',
    acceptanceTests: [],
    children: [],
  };

  const newAcceptanceTest: AcceptanceTestDraft = {
    id: `at-${Date.now()}`,
    parentUserStoryId: newStory.id,
    name: 'Draft acceptance test',
    description: `Auto-generated for ${newStory.title}`,
    status: 'draft',
    given: acceptanceTest.given,
    when: acceptanceTest.when,
    then: acceptanceTest.then,
  };

  newStory.acceptanceTests.push(newAcceptanceTest);

  if (parentType === 'mr') {
    container.userStories.push(newStory);
  } else {
    container.children.push(newStory);
  }

  return res.status(201).json({ status: 'created', story: newStory, acceptanceTest: newAcceptanceTest });
});

router.patch('/mindmap/reference-repository', (req, res) => {
  const parseResult = referenceRepositorySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(422).json({ status: 'error', issues: parseResult.error.issues });
  }

  const config: ReferenceRepositoryConfig = parseResult.data;
  mindmapSnapshot.referenceRepository = config;

  return res.status(200).json({ status: 'updated', referenceRepository: config });
});

router.post('/github/webhook', githubWebhookHandler);

function findStoryById(mergeRequests: MergeRequestRoot[], id: string): UserStoryNode | undefined {
  for (const mr of mergeRequests) {
    const match = traverseStories(mr.userStories, id);
    if (match) {
      return match;
    }
  }

  return undefined;
}

function traverseStories(stories: UserStoryNode[], id: string): UserStoryNode | undefined {
  for (const story of stories) {
    if (story.id === id) {
      return story;
    }

    const childHit = traverseStories(story.children, id);
    if (childHit) {
      return childHit;
    }
  }

  return undefined;
}

function findMergeRequestById(mergeRequests: MergeRequestRoot[], id: string): MergeRequestRoot | undefined {
  return mergeRequests.find((mr) => mr.id === id);
}

export default router;
