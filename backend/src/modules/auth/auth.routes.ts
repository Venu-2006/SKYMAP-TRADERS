import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authLimiter, csrfProtection } from '../../middleware/security';
import { authController as c } from './auth.controller';
import {
  emailOnlySchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from './auth.schema';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Registration, login, sessions and account recovery
 * components:
 *   schemas:
 *     Session:
 *       type: object
 *       properties:
 *         user: { $ref: '#/components/schemas/User' }
 *         accessToken: { type: string }
 *         csrfToken: { type: string }
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account and send a verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               phone: { type: string }
 *               referralCode: { type: string }
 *     responses:
 *       201: { description: Session created }
 *       409: { description: Email already registered }
 */
router.post('/register', authLimiter, validate(registerSchema), c.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Session created }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(loginSchema), c.login);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with a Google Identity Services ID token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string }
 *     responses:
 *       200: { description: Session created }
 */
router.post('/google', authLimiter, validate(googleSchema), c.google);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh cookie and issue a new access token
 *     description: Requires the httpOnly refresh cookie and an X-CSRF-Token header matching the skymap_csrf cookie.
 *     responses:
 *       200: { description: New session }
 *       401: { description: Session expired }
 */
router.post('/refresh', csrfProtection, c.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current refresh token
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', csrfProtection, c.logout);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm an email address with the emailed token
 */
router.post('/verify-email', validate(tokenSchema), c.verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Re-send the verification email
 */
router.post('/resend-verification', authLimiter, validate(emailOnlySchema), c.resendVerification);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Email a password reset link
 */
router.post('/forgot-password', authLimiter, validate(emailOnlySchema), c.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password with the emailed token
 */
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), c.resetPassword);

export default router;
