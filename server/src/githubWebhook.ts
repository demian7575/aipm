import { Request, Response } from 'express';
import { z } from 'zod';
import { mindmapSnapshot } from './mockData.js';
import { MergeRequestRoot } from './types.js';

const mergeRequestSchema = z.object({
  action: z.string(),
  pull_request: z
    .object({
      id: z.number(),
      title: z.string(),
      body: z.string().optional(),
      html_url: z.string().url(),
      updated_at: z.string(),
      created_at: z.string(),
      user: z.object({ login: z.string() }).optional(),
    })
    .optional(),
});

export function githubWebhookHandler(req: Request, res: Response) {
  const parseResult = mergeRequestSchema.safeParse(req.body);

  if (!parseResult.success || !parseResult.data.pull_request) {
    return res.status(202).json({ status: 'ignored', reason: 'Unsupported payload' });
  }

  const { pull_request: pr } = parseResult.data;

  const newRoot: MergeRequestRoot = {
    id: `mr-${pr.id}`,
    type: 'MR',
    title: pr.title,
    description:
      pr.body ?? 'No description provided. Update the merge request body to generate better story drafts.',
    status: 'draft',
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    userStories: [],
  };

  mindmapSnapshot.root = newRoot;

  return res.status(201).json({ status: 'queued', message: 'MR payload captured for processing', rootId: newRoot.id });
}
