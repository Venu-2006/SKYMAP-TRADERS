import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Central error handler: maps known errors to HTTP responses and hides internals in production. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      message = `A record with this ${(err.meta?.target as string[] | undefined)?.join(', ') ?? 'value'} already exists`;
    } else if (err.code === 'P2025') {
      status = 404;
      message = 'Resource not found';
    } else if (err.code === 'P2003') {
      status = 400;
      message = 'Related resource does not exist';
    }
  } else if (err instanceof MulterError) {
    status = 400;
    message = err.message;
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(!env.isProd && status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
  });
}
