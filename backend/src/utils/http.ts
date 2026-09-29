import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Forwards rejected promises from async route handlers to the error middleware. */
export const asyncHandler =
  <R extends Request = Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as R, res, next)).catch(next);
  };

/** Uniform success envelope: { success, data, meta? } */
export const ok = (res: Response, data: unknown, meta?: Record<string, unknown>, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export const paginate = (page = 1, limit = 20): Pagination => {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  return { page: p, limit: l, skip: (p - 1) * l };
};

export const pageMeta = ({ page, limit }: Pagination, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
