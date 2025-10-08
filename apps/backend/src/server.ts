import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { openApiDocument } from '@ai-pm/shared';
import { registerMergeRequestRoutes } from './routes/merge-requests.js';
import { registerStoryRoutes } from './routes/stories.js';
import { registerTestRoutes } from './routes/tests.js';
import { store } from './store.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard'
    }
  }
});

export async function buildServer() {
  const server = Fastify({
    logger
  });

  await server.register(cors, { origin: true });
  await server.register(sensible);

  server.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] ?? randomUUID();
    reply.header('x-request-id', requestId);
  });

  await server.register(swagger, {
    openapi: openApiDocument
  });
  await server.register(swaggerUi, {
    routePrefix: '/api/docs'
  });

  registerMergeRequestRoutes(server);
  registerStoryRoutes(server);
  registerTestRoutes(server);

  server.setErrorHandler((error, request, reply) => {
    const statusCode = 'code' in error ? 400 : error.statusCode ?? 500;
    reply.status(statusCode).send({
      code: (error as any).code ?? 'internal',
      message: error.message,
      details: (error as any).details
    });
  });

  server.get('/api/openapi.json', async () => openApiDocument);
  server.get('/api/state', async () => store.getState());
  server.post('/api/reset', async () => {
    store.seed();
    return { ok: true };
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  store.seed();
  buildServer()
    .then((server) =>
      server.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' }).then(() => {
        console.log('Backend running on http://localhost:4000');
      })
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
