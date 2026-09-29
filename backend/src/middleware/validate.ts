import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates { body, query, params } against a zod object schema and replaces
 * them with the parsed (coerced, stripped) values.
 */
export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) Object.defineProperty(req, 'query', { value: parsed.query, writable: true });
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest(
            'Validation failed',
            err.issues.map((i) => ({ path: i.path.slice(1).join('.'), message: i.message })),
          ),
        );
      }
      next(err);
    }
  };
