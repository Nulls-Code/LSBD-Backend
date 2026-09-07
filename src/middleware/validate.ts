import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * Validation middleware factory for Zod schemas.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema), controller.create);
 *
 * Validates `req.body`, `req.query`, and `req.params` against the provided schema.
 * The schema should be a Zod object with optional `body`, `query`, and `params` keys.
 *
 * On failure, throws a ValidationError with field-level error details.
 */

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        mergeZodErrors(result.error, errors, 'body');
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        mergeZodErrors(result.error, errors, 'query');
      } else {
        req.query = result.data as unknown as Request['query'];
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        mergeZodErrors(result.error, errors, 'params');
      } else {
        req.params = result.data as unknown as Request['params'];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    next();
  };
}

/**
 * Merge Zod errors into a flat field → messages map.
 * Prefixes field paths with the source (body, query, params) for clarity.
 */
function mergeZodErrors(
  zodError: ZodError,
  target: Record<string, string[]>,
  source: string,
): void {
  for (const issue of zodError.issues) {
    const path = issue.path.length > 0
      ? `${source}.${issue.path.join('.')}`
      : source;

    if (!target[path]) {
      target[path] = [];
    }
    target[path].push(issue.message);
  }
}
