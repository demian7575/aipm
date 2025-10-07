import morgan from 'morgan';
import { Request } from 'express';

defineMorganTokens();

export const httpLogger = morgan((tokens, req: Request, res) => {
  const payload = {
    requestId: tokens['req'](req, res, 'x-request-id'),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    durationMs: Number(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length')
  };
  return JSON.stringify(payload);
});

function defineMorganTokens() {
  morgan.token('req', (req, res, field) => req.headers[field ?? ''] as string);
}
