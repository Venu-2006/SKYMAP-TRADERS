import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
    issuer: 'skymap-traders',
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'skymap-traders' }) as AccessTokenPayload & jwt.JwtPayload;

/** Opaque random token. Only its SHA-256 hash is persisted. */
export const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Short uppercase referral code, e.g. SKY7F3K9Q */
export const generateReferralCode = () =>
  'SKY' + crypto.randomBytes(4).toString('base64url').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
