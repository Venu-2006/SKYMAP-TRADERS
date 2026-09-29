import { z } from 'zod';

/** Client-side schemas mirroring backend validation for instant feedback. */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[0-9]/, 'Add a number');

export const emailSchema = z.string().trim().email('Enter a valid email');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password') });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(80),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .regex(/^([6-9]\d{9})?$/, 'Enter a valid 10-digit mobile number')
      .optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    referralCode: z.string().trim().max(20).optional(),
    terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
