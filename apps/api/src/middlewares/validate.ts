import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape } from 'zod';
import { AppError } from './error-handler';

export const validate =
  (schema: ZodObject<ZodRawShape>): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(
        new AppError(400, 'Validation error', result.error.format())
      );
    }

    next();
  };

