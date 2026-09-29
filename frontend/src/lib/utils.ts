import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Formats Prisma Decimal strings or numbers as ₹1,23,456 */
export const formatPrice = (value: number | string) => inr.format(Number(value));

export const discountPercent = (mrp: number | string, price: number | string) => {
  const m = Number(mrp);
  return m > 0 ? Math.round(((m - Number(price)) / m) * 100) : 0;
};

/** Current selling price, honoring an active flash sale. */
export const effectivePrice = (p: { price: string | number; flashSalePrice?: string | number | null; flashSaleEndsAt?: string | null }) =>
  p.flashSalePrice && p.flashSaleEndsAt && new Date(p.flashSaleEndsAt) > new Date() ? Number(p.flashSalePrice) : Number(p.price);
