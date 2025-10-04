import { Router } from 'express';
import { z } from 'zod';
import { githubWebhookHandler } from './githubWebhook.js';
import { mindmapSnapshot } from './mockData.js';
import { AcceptanceTestDraft, MindmapSnapshot, UserStoryNode } from './types.js';

const router = Router();

router.get('/mindmap', (_req, res) => {
  const payload: MindmapSnapshot = mindmapSnapshot;
  res.json(payload);
});

const createStorySchema = z.object({
  parentId: z.string(),
  asA: z.string().min(3),
  iWant: z.string().min(3),
  soThat: z.string().min(3),
  acceptanceTest: z.object({
    given: z.string().min(3),
    when: z.string().min(3),
    then: z.string().min(3),
  }),
});

router.post('/mindmap/nodes', (req, res) => {
  const parseResult = createStorySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(422).json({ status: 'error', issues: parseResult.error.issues });
  }

  const { parentId, asA, iWant, soThat, acceptanceTest } = parseResult.data;
  const parentStory = findStoryById(mindmapSnapshot.root.userStories, parentId);

  if (!parentStory) {
    return res.status(404).json({ status: 'error', message: 'Parent story not found' });
  }

  const newStory: UserStoryNode = {
    id: `us-${Date.now()}`,
    parentId: parentStory.id,
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
  parentStory.children.push(newStory);

  return res.status(201).json({ status: 'created', story: newStory, acceptanceTest: newAcceptanceTest });
});

router.post('/github/webhook', githubWebhookHandler);

function findStoryById(stories: UserStoryNode[], id: string): UserStoryNode | undefined {
  for (const story of stories) {
    if (story.id === id) {
      return story;
    }

    const childHit = findStoryById(story.children, id);
    if (childHit) {
      return childHit;
    }
  }

  return undefined;
}

export default router;
