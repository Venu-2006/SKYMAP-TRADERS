import { z } from 'zod';
import { password } from '../auth/auth.schema';

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: phone.nullable(),
      locale: z.enum(['en', 'hi', 'ta', 'te', 'kn', 'mr', 'bn']),
    })
    .partial(),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().max(72).default(''), newPassword: password }),
});

const addressBody = z.object({
  type: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  fullName: z.string().trim().min(2).max(80),
  phone,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN')
    .optional(),
  isDefault: z.boolean().default(false),
});

export const createAddressSchema = z.object({ body: addressBody });
export const updateAddressSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: addressBody.partial(),
});
export const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });
