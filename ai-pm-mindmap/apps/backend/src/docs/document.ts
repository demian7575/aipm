import {
  AcceptanceTestSchema,
  ErrorResponseSchema,
  MergeRequestSchema,
  UserStorySchema,
  createOpenApiBuilder,
} from '@ai-pm-mindmap/shared';

export const buildOpenApiDocument = () => {
  const builder = createOpenApiBuilder({
    title: 'AI PM Mindmap API',
    version: '1.0.0',
    description:
      'API powering the AI PM Mindmap experience. Provides Merge Request, Story, Test, and tree operations.',
  });

  builder.registerSchema('MergeRequest', MergeRequestSchema);
  builder.registerSchema('UserStory', UserStorySchema);
  builder.registerSchema('AcceptanceTest', AcceptanceTestSchema);
  builder.registerSchema('ErrorResponse', ErrorResponseSchema);

  const paths = {
    '/api/merge-requests': {
      get: {
        summary: 'List merge requests',
        responses: {
          '200': {
            description: 'List of merge requests',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/MergeRequest' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create merge request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/MergeRequest' }],
                required: ['title', 'description', 'repository', 'branch'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created merge request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MergeRequest' },
              },
            },
          },
        },
      },
    },
    '/api/merge-requests/{id}/status': {
      patch: {
        summary: 'Update merge request status',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['open', 'merged', 'closed'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated merge request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MergeRequest' },
              },
            },
          },
        },
      },
    },
    '/api/stories': {
      get: {
        summary: 'List stories',
        parameters: [
          {
            name: 'mrId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            required: false,
          },
        ],
        responses: {
          '200': {
            description: 'Array of stories',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/UserStory' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create story',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/UserStory' }],
                required: ['title', 'asA', 'iWant', 'soThat', 'mrId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created story with analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    story: { $ref: '#/components/schemas/UserStory' },
                    analysis: {
                      type: 'object',
                      properties: {
                        invest: { type: 'object' },
                        ambiguity: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/stories/{id}/move': {
      patch: {
        summary: 'Move story',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['index'],
                properties: {
                  parentId: { type: 'string', format: 'uuid', nullable: true },
                  index: { type: 'integer', minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Moved story',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    story: { $ref: '#/components/schemas/UserStory' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tests': {
      post: {
        summary: 'Create acceptance test',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/AcceptanceTest' }],
                required: ['title', 'given', 'when', 'then', 'storyId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created test',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AcceptanceTest' },
              },
            },
          },
        },
      },
    },
  };

  return builder.build(paths);
};
