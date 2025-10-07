import { ErrorResponse } from '@ai-pm-mindmap/shared';

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toJSON(): ErrorResponse {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export const notFound = (message = 'Not found', details?: unknown) =>
  new ApiError(404, 'NOT_FOUND', message, details);

export const badRequest = (message = 'Bad request', details?: unknown) =>
  new ApiError(400, 'BAD_REQUEST', message, details);

export const conflict = (message = 'Conflict', details?: unknown) =>
  new ApiError(409, 'CONFLICT', message, details);

export const unprocessable = (message = 'Unprocessable', details?: unknown) =>
  new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details);
