import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const razorpayConfigured = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
const rz = () => {
  if (!razorpayConfigured()) throw new ApiError(503, 'Online payments are not configured. Please choose Cash on Delivery.');
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
};

/** Creates a Razorpay order; amount is in rupees and converted to paise. */
export const createRazorpayOrder = (amountInr: number, receipt: string) =>
  rz().orders.create({ amount: Math.round(amountInr * 100), currency: 'INR', receipt, payment_capture: true });

/** Verifies the checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const refundPayment = (paymentId: string, amountInr: number) =>
  rz().payments.refund(paymentId, { amount: Math.round(amountInr * 100) });
