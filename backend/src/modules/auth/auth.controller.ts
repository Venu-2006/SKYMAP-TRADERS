import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { issueCsrfToken, CSRF_COOKIE } from '../../middleware/security';
import { asyncHandler, ok } from '../../utils/http';
import { authService } from './auth.service';

export const REFRESH_COOKIE = 'skymap_rt';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  // Frontend (Vercel) and API (Railway) live on different sites in production.
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 86_400_000,
};

const meta = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

/** Sets the refresh cookie + CSRF cookie and returns the access token in the body. */
const sendSession = (
  res: Response,
  session: Awaited<ReturnType<typeof authService.login>>,
  status = 200,
) => {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions);
  const csrfToken = issueCsrfToken(res);
  return ok(res, { user: session.user, accessToken: session.accessToken, csrfToken }, undefined, status);
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    sendSession(res, await authService.register(req.body, meta(req)), 201);
  }),

  login: asyncHandler(async (req, res) => {
    sendSession(res, await authService.login(req.body.email, req.body.password, meta(req)));
  }),

  google: asyncHandler(async (req, res) => {
    sendSession(res, await authService.googleLogin(req.body.credential, req.body.referralCode, meta(req)));
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ success: false, message: 'No active session' });
      return;
    }
    sendSession(res, await authService.refresh(token, meta(req)));
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
    res.clearCookie(CSRF_COOKIE);
    ok(res, { message: 'Logged out' });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.body.token);
    ok(res, { message: 'Email verified successfully' });
  }),

  resendVerification: asyncHandler(async (req, res) => {
    await authService.resendVerification(req.body.email);
    ok(res, { message: 'If the account exists and is unverified, a new link has been sent' });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    ok(res, { message: 'If an account exists for this email, a reset link has been sent' });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    ok(res, { message: 'Password updated. Please log in with your new password.' });
  }),
};
