import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email');
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt limit
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email,
    password,
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
    referralCode: z.string().trim().toUpperCase().max(20).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1).max(72) }),
});

export const googleSchema = z.object({
  body: z.object({ credential: z.string().min(10), referralCode: z.string().trim().toUpperCase().optional() }),
});

export const emailOnlySchema = z.object({ body: z.object({ email }) });

export const tokenSchema = z.object({ body: z.object({ token: z.string().length(96) }) });

export const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().length(96), password }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
