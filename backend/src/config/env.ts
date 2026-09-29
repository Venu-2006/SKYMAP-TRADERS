import 'dotenv/config';
import { z } from 'zod';

/**
 * Validates process.env once at boot. The app refuses to start with a bad
 * configuration instead of failing later at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(30),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('SKYMAP TRADERS <no-reply@skymaptraders.com>'),

  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  COMPANY_NAME: z.string().default('SKYMAP TRADERS'),
  COMPANY_GSTIN: z.string().optional().default(''),
  COMPANY_ADDRESS: z.string().default('India'),
  COMPANY_STATE: z.string().default('Tamil Nadu'),
  COMPANY_PHONE: z.string().default('+91 7010942325'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()),
};
