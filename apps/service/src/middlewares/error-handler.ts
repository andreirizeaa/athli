import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// Patterns that indicate sensitive information in error messages
const SENSITIVE_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // UUIDs
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
  // Database connection strings
  /postgres(ql)?:\/\/[^\s]+/gi,
  // API keys (generic pattern)
  /\b(sk_|pk_|api_|key_)[a-zA-Z0-9]{20,}\b/g,
  // Supabase service role key patterns
  /\bservice_role\b/gi,
  // File paths that might reveal server structure
  /\/(?:home|var|usr|etc|opt)\/[^\s]+/g,
];

// Database/Supabase error patterns that should be genericized
const DATABASE_ERROR_PATTERNS = [
  /duplicate key value violates unique constraint/i,
  /violates foreign key constraint/i,
  /violates check constraint/i,
  /relation "[^"]+" does not exist/i,
  /column "[^"]+" does not exist/i,
  /function [^\s]+ does not exist/i,
  /permission denied for/i,
  /authentication failed/i,
  /connection refused/i,
  /timeout expired/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
];

// Generic messages for database errors
const GENERIC_DATABASE_ERROR = 'A database error occurred. Please try again later.';
const GENERIC_SERVER_ERROR = 'An unexpected error occurred. Please try again later.';

/**
 * Sanitizes error messages by removing sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

/**
 * Checks if an error message contains database-related information
 */
function isDatabaseError(message: string): boolean {
  return DATABASE_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Gets a safe error message for production environments
 */
function getProductionSafeMessage(err: unknown, statusCode: number): string {
  // For AppErrors that are operational (expected errors), we can show the message
  if (err instanceof AppError && err.isOperational) {
    return sanitizeErrorMessage(err.message);
  }

  // For 4xx client errors, show generic but informative messages
  if (statusCode >= 400 && statusCode < 500) {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'The request could not be processed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      default:
        return 'Invalid request. Please try again.';
    }
  }

  // For 5xx server errors, always use generic message
  return GENERIC_SERVER_ERROR;
}

/**
 * Extracts a safe error message from various error types
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Unknown error';
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isProduction = env.NODE_ENV === 'production';

  // Extract the raw error message for logging
  const rawMessage = extractErrorMessage(err);

  // Log the full error details (including stack trace) - this stays on the server
  logger.error({
    err,
    statusCode,
    isAppError,
    message: rawMessage,
  }, 'Unhandled error');

  // Determine the message to send to the client
  let clientMessage: string;

  if (isProduction) {
    // In production, use safe messages
    if (isDatabaseError(rawMessage)) {
      clientMessage = GENERIC_DATABASE_ERROR;
    } else {
      clientMessage = getProductionSafeMessage(err, statusCode);
    }
  } else {
    // In development, show more details but still sanitize sensitive data
    clientMessage = sanitizeErrorMessage(rawMessage);
  }

  // Build the response
  const response: { error: { message: string; details?: unknown; code?: string } } = {
    error: {
      message: clientMessage,
    },
  };

  // Only include details in development for AppErrors
  if (!isProduction && isAppError && err.details) {
    // Sanitize details if they're a string
    if (typeof err.details === 'string') {
      response.error.details = sanitizeErrorMessage(err.details);
    } else {
      response.error.details = err.details;
    }
  }

  // Add a generic error code for client-side handling (not revealing internals)
  if (statusCode >= 500) {
    response.error.code = 'SERVER_ERROR';
  } else if (statusCode === 401) {
    response.error.code = 'UNAUTHORIZED';
  } else if (statusCode === 403) {
    response.error.code = 'FORBIDDEN';
  } else if (statusCode === 404) {
    response.error.code = 'NOT_FOUND';
  } else if (statusCode === 429) {
    response.error.code = 'RATE_LIMITED';
  }

  res.status(statusCode).json(response);
}

