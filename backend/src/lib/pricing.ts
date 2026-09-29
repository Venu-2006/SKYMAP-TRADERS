import type { Coupon, Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

/** Rounds to paise. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Selling price honoring an active flash sale. Prices are GST-inclusive. */
export function unitPrice(p: { price: Prisma.Decimal | number; flashSalePrice: Prisma.Decimal | number | null; flashSaleEndsAt: Date | null }) {
  return p.flashSalePrice && p.flashSaleEndsAt && p.flashSaleEndsAt > new Date() ? Number(p.flashSalePrice) : Number(p.price);
}

/** GST contained in a tax-inclusive amount. */
export const inclusiveTax = (amount: number, gstRate: number) => round2(amount - amount / (1 + gstRate / 100));

export const SHIPPING_METHODS = {
  STANDARD: { label: 'Standard delivery (3–6 days)', fee: 49, freeAbove: 999 },
  EXPRESS: { label: 'Express delivery (1–2 days)', fee: 149, freeAbove: null },
} as const;
export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export function shippingFee(method: ShippingMethod, subtotal: number) {
  const m = SHIPPING_METHODS[method];
  return m.freeAbove !== null && subtotal >= m.freeAbove ? 0 : m.fee;
}

/**
 * Validates a coupon for a user and cart subtotal and returns the discount.
 * Throws a user-facing error explaining why a coupon cannot be used.
 */
export function couponDiscount(coupon: Coupon, subtotal: number, userUsageCount: number) {
  const now = new Date();
  if (!coupon.isActive || coupon.startsAt > now) throw ApiError.badRequest('This coupon is not active');
  if (coupon.expiresAt && coupon.expiresAt < now) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('This coupon has reached its usage limit');
  if (userUsageCount >= coupon.perUserLimit) throw ApiError.badRequest('You have already used this coupon');
  if (subtotal < Number(coupon.minOrderValue)) {
    throw ApiError.badRequest(`Add items worth ₹${round2(Number(coupon.minOrderValue) - subtotal)} more to use this coupon`);
  }
  let discount = coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  return round2(Math.min(discount, subtotal));
}
