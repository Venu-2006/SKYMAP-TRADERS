import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; email: string };
    }
  }
}

const readBearer = (req: Request) => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
};

const attach = (req: Request, payload: AccessTokenPayload) => {
  req.user = { id: payload.sub, role: payload.role, email: payload.email };
};

/** Requires a valid access token in the Authorization header. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    attach(req, verifyAccessToken(token));
    next();
  } catch (err) {
    next(err instanceof jwt.TokenExpiredError ? new ApiError(401, 'Access token expired') : ApiError.unauthorized('Invalid token'));
  }
}

/** Attaches the user when a valid token is present; never rejects. Used for personalization. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token) {
    try {
      attach(req, verifyAccessToken(token));
    } catch {
      /* anonymous */
    }
  }
  next();
}

/** Role-based access control. SUPER_ADMIN passes every check. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'SUPER_ADMIN' || roles.includes(req.user.role)) return next();
    next(ApiError.forbidden());
  };
