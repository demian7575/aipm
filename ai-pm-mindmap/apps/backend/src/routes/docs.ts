import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '../docs/document';

const router = Router();
const document = buildOpenApiDocument();

router.get('/openapi.json', (_req, res) => {
  res.json(document);
});

router.use('/docs', swaggerUi.serve, swaggerUi.setup(document));

export { router };
