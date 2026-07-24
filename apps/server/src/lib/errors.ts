/**
 * Server-side error constructor + the single place API errors are serialized.
 * Throw an `AppError` (built from the shared `ERROR_CATALOG`) instead of
 * `reply.code(...).send({ error })`. `registerErrorHandling` turns every
 * failure into the uniform `{ error: { code, message, details? } }` envelope.
 */

import { ERROR_CATALOG, type ApiError, type ErrorCode } from '@firecare/types';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, options?: { message?: string; details?: unknown }) {
    const entry = ERROR_CATALOG[code];
    super(options?.message ?? entry.message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = entry.status;
    this.details = options?.details;
  }

  static of(code: ErrorCode, details?: unknown): AppError {
    return new AppError(code, { details });
  }
  static unauthenticated(details?: unknown): AppError {
    return new AppError('UNAUTHENTICATED', { details });
  }
  static roleNotAllowed(details?: unknown): AppError {
    return new AppError('ROLE_NOT_ALLOWED', { details });
  }
  static notFound(details?: unknown): AppError {
    return new AppError('RESOURCE_NOT_FOUND', { details });
  }
  static conflict(details?: unknown): AppError {
    return new AppError('CONFLICT', { details });
  }
  static duplicate(details?: unknown): AppError {
    return new AppError('DUPLICATE_RESOURCE', { details });
  }
  static badRequest(details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', { details });
  }
}

function envelope(code: ErrorCode, message: string, details?: unknown): ApiError {
  return { error: { code, message, details } };
}

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

export function registerErrorHandling(app: FastifyInstance, isProduction: boolean): void {
  app.setNotFoundHandler((_req, reply) => {
    const entry = ERROR_CATALOG.RESOURCE_NOT_FOUND;
    reply.code(entry.status).send(envelope('RESOURCE_NOT_FOUND', entry.message));
  });

  app.setErrorHandler((error: FastifyError, req, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send(envelope(error.code, error.message, error.details));
      return;
    }
    if (error instanceof ZodError) {
      reply
        .code(ERROR_CATALOG.VALIDATION_ERROR.status)
        .send(envelope('VALIDATION_ERROR', ERROR_CATALOG.VALIDATION_ERROR.message, error.issues));
      return;
    }
    if (error.validation) {
      reply
        .code(ERROR_CATALOG.VALIDATION_ERROR.status)
        .send(
          envelope('VALIDATION_ERROR', ERROR_CATALOG.VALIDATION_ERROR.message, error.validation),
        );
      return;
    }
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      const code = STATUS_TO_CODE[error.statusCode] ?? 'VALIDATION_ERROR';
      reply
        .code(error.statusCode)
        .send(envelope(code, ERROR_CATALOG[code].message, isProduction ? undefined : error.message));
      return;
    }
    // Unexpected: log server-side, never leak internals in production.
    req.log.error(error);
    reply
      .code(ERROR_CATALOG.INTERNAL.status)
      .send(
        envelope('INTERNAL', ERROR_CATALOG.INTERNAL.message, isProduction ? undefined : error.message),
      );
  });
}
