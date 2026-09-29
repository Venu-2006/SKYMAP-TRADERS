import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/** General API limiter: 300 requests / 15 min per IP. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Strict limiter for credential endpoints to slow brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes.' },
});

export const CSRF_COOKIE = 'skymap_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit-cookie CSRF protection.
 *
 * Access tokens travel in the Authorization header (not CSRF-prone), but the
 * refresh token is an httpOnly cookie, so any route that authenticates via
 * cookie must also receive a matching X-CSRF-Token header. A cross-site page
 * cannot read our cookie, so it cannot forge the header.
 */
export function issueCsrfToken(res: Response) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by our frontend JS
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (
    !cookie ||
    !header ||
    cookie.length !== header.length ||
    !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
  ) {
    return next(ApiError.forbidden('Invalid CSRF token'));
  }
  next();
}
