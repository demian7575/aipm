import { extendZodWithOpenApi, OpenAPIGenerator, OpenAPIRegistry } from 'zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const StatusSchema = z.enum(['draft', 'in_progress', 'review', 'done', 'blocked']).openapi({
  description: 'Workflow status value'
});

export const MergeRequestSchema = z
  .object({
    id: z.string().openapi({ example: 'MR-9000' }),
    title: z.string(),
    description: z.string().default(''),
    status: StatusSchema.default('draft'),
    repo: z.string().openapi({ description: 'Repository full name' }),
    branch: z.string(),
    drift: z.boolean().default(false),
    lastSyncAt: z.string().datetime().nullable().optional()
  })
  .openapi('MergeRequest');

export const StorySchema = z
  .object({
    id: z.string(),
    mergeRequestId: z.string(),
    parentId: z.string().nullable().optional(),
    title: z.string(),
    role: z.string(),
    goal: z.string(),
    benefit: z.string(),
    status: StatusSchema.default('draft'),
    order: z.number().int().nonnegative().default(0)
  })
  .openapi('Story');

export const AcceptanceTestSchema = z
  .object({
    id: z.string(),
    storyId: z.string(),
    given: z.string(),
    when: z.string(),
    then: z.string(),
    status: StatusSchema.default('draft')
  })
  .openapi('AcceptanceTest');

export const registry = new OpenAPIRegistry();
registry.register('MergeRequest', MergeRequestSchema);
registry.register('Story', StorySchema);
registry.register('AcceptanceTest', AcceptanceTestSchema);

export const generator = new OpenAPIGenerator(registry.definitions, '3.0.0');
