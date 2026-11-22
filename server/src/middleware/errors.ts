import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function fail(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  response.status(status).json({ success: false, error: { code, message } });
}

export function databaseUnavailable() {
  return new ApiError(
    503,
    'DATABASE_UNAVAILABLE',
    'The account service is temporarily unavailable. Please try again shortly.',
  );
}

export const notFound: RequestHandler = (_request, response) => {
  fail(response, 404, 'NOT_FOUND', 'Route not found.');
};

export const handleError: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(new Error('Response interrupted.'));
    return;
  }
  if (error instanceof ApiError) {
    fail(response, error.status, error.code, error.message);
    return;
  }
  if (error instanceof mongoose.mongo.MongoError) {
    console.warn('account.database_operation_failed');
    const unavailable = databaseUnavailable();
    fail(response, unavailable.status, unavailable.code, unavailable.message);
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    switch (error.type) {
      case 'entity.parse.failed':
        fail(response, 400, 'INVALID_JSON', 'Send a valid JSON request.');
        return;
      case 'entity.too.large':
        fail(response, 413, 'BODY_TOO_LARGE', 'The request body is too large.');
        return;
      case 'encoding.unsupported':
      case 'charset.unsupported':
        fail(response, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Use UTF-8 JSON.');
        return;
    }
  }
  console.error('api.unexpected_error');
  fail(
    response,
    500,
    'INTERNAL_ERROR',
    'Something went wrong. Please try again.',
  );
};
