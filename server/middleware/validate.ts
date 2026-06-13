import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Express middleware that parses req.body against a Zod schema.
 * On success, attaches the parsed+coerced result to req.validatedBody.
 * On failure, returns 400 with human-readable field errors.
 *
 * Always omit userId, organizationId, status, and reviewedBy from the schema
 * so callers cannot inject those fields — handlers inject them server-side.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: fromZodError(result.error).message });
    }
    (req as Request & { validatedBody: T }).validatedBody = result.data;
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
    }
  }
}
