import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { TokenType, User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { emails, sendMail } from '../../utils/mailer';
import { generateReferralCode, randomToken, sha256, signAccessToken } from '../../utils/tokens';
import type { RegisterInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/** Fields safe to return to clients. */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
  provider: true,
  emailVerified: true,
  locale: true,
  referralCode: true,
  walletBalance: true,
  createdAt: true,
} as const;

export type PublicUser = Pick<User, keyof typeof publicUserSelect>;

const toPublic = (u: User): PublicUser => {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(publicUserSelect)) out[k] = u[k as keyof User];
  return out as PublicUser;
};

interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/** Issues a short-lived access token plus a rotating, DB-backed refresh token. */
async function createSession(user: User, meta: SessionMeta) {
  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 86_400_000),
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    user: toPublic(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role, email: user.email }),
    refreshToken,
  };
}

async function createOneTimeToken(userId: string, type: TokenType, ttlMs: number) {
  // Invalidate earlier unused tokens of the same type.
  await prisma.verificationToken.deleteMany({ where: { userId, type, usedAt: null } });
  const token = randomToken();
  await prisma.verificationToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function consumeOneTimeToken(token: string, type: TokenType) {
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('This link is invalid or has expired');
  }
  await prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}

async function sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'name'>) {
  const token = await createOneTimeToken(user.id, 'EMAIL_VERIFICATION', 24 * 3_600_000);
  await sendMail(user.email, 'Verify your SKYMAP TRADERS account', emails.verify(user.name, `${env.CLIENT_URL}/verify-email?token=${token}`));
}

async function resolveReferrer(code?: string) {
  if (!code) return undefined;
  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  return referrer?.id;
}

async function uniqueReferralCode() {
  for (;;) {
    const code = generateReferralCode();
    if (!(await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } }))) return code;
  }
}

export const authService = {
  async register(input: RegisterInput, meta: SessionMeta) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw ApiError.conflict('An account with this email already exists');

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        referralCode: await uniqueReferralCode(),
        referredById: await resolveReferrer(input.referralCode),
        cart: { create: {} },
      },
    });
    await sendVerificationEmail(user);
    return createSession(user, meta);
  },

  async login(email: string, password: string, meta: SessionMeta) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Compare against a dummy hash when the user is missing to keep timing uniform.
    const hash = user?.passwordHash ?? '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5cHnC9kS0Cq0Q9bM1b5L3oGz1Yp5r6e';
    const valid = await bcrypt.compare(password, hash);
    if (!user || !user.passwordHash || !valid) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.forbidden('Your account has been suspended. Please contact support.');
    return createSession(user, meta);
  },

  async googleLogin(credential: string, referralCode: string | undefined, meta: SessionMeta) {
    if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Google Sign-In is not configured');
    const ticket = await googleClient
      .verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID })
      .catch(() => {
        throw ApiError.unauthorized('Google authentication failed');
      });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) throw ApiError.unauthorized('Google account email is not verified');

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email }] } });

    if (user) {
      if (!user.isActive) throw ApiError.forbidden('Your account has been suspended');
      // Link Google to an existing email account.
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, emailVerified: true, avatarUrl: user.avatarUrl ?? payload.picture },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name ?? email.split('@')[0],
          avatarUrl: payload.picture,
          googleId: payload.sub,
          provider: 'GOOGLE',
          emailVerified: true,
          referralCode: await uniqueReferralCode(),
          referredById: await resolveReferrer(referralCode),
          cart: { create: {} },
        },
      });
    }
    return createSession(user, meta);
  },

  /** Rotates the refresh token. Reuse of a revoked token revokes every session (theft detection). */
  async refresh(refreshToken: string, meta: SessionMeta) {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!record) throw ApiError.unauthorized('Session expired, please log in again');
    if (record.revokedAt) {
      await prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw ApiError.unauthorized('Session expired, please log in again');
    }
    if (record.expiresAt < new Date() || !record.user.isActive) throw ApiError.unauthorized('Session expired, please log in again');

    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return createSession(record.user, meta);
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async verifyEmail(token: string) {
    const userId = await consumeOneTimeToken(token, 'EMAIL_VERIFICATION');
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  },

  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) await sendVerificationEmail(user);
  },

  /** Always resolves, so the endpoint does not reveal which emails are registered. */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return;
    const token = await createOneTimeToken(user.id, 'PASSWORD_RESET', 30 * 60_000);
    await sendMail(user.email, 'Reset your SKYMAP TRADERS password', emails.reset(user.name, `${env.CLIENT_URL}/reset-password?token=${token}`));
  },

  async resetPassword(token: string, password: string) {
    const userId = await consumeOneTimeToken(token, 'PASSWORD_RESET');
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } }),
      // Sign out every device after a password reset.
      prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash && !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) } });
  },
};
