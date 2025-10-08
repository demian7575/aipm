import { OpenAPIObjectBuilder, extendZodWithOpenApi } from 'zod-to-openapi';
import { z } from 'zod';
import {
  acceptanceTestSchema,
  mergeRequestSchema,
  storyCollectionSchema,
  userStorySchema
} from '../schemas.js';

extendZodWithOpenApi(z);

export const openApiBuilder = new OpenAPIObjectBuilder()
  .setInfo({
    title: 'AI Project Manager Mindmap API',
    version: '0.2.0',
    description: 'Shared schemas for Merge Requests, User Stories, and Acceptance Tests.'
  })
  .setVersion('3.1.0')
  .setComponents({
    schemas: {
      MergeRequest: mergeRequestSchema.openapi({ ref: 'MergeRequest' }),
      UserStory: userStorySchema.openapi({ ref: 'UserStory' }),
      AcceptanceTest: acceptanceTestSchema.openapi({ ref: 'AcceptanceTest' }),
      StoryCollection: storyCollectionSchema.openapi({ ref: 'StoryCollection' })
    }
  });

export const openApiDocument = openApiBuilder.getDocument();
