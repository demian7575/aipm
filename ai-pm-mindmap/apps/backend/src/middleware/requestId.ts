import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header('x-request-id') || randomUUID();
  req.headers['x-request-id'] = header;
  res.setHeader('x-request-id', header);
  next();
}
