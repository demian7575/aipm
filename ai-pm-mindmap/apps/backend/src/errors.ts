export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'ERROR', public details?: unknown) {
    super(message);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export const notFound = (message = 'Not found') => new ApiError(404, message, 'NOT_FOUND');
export const badRequest = (message = 'Bad request', details?: unknown) =>
  new ApiError(400, message, 'BAD_REQUEST', details);
export const conflict = (message = 'Conflict', details?: unknown) =>
  new ApiError(409, message, 'CONFLICT', details);
