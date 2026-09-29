/** Minimal typings + loader for Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js). */

export interface RazorpayCheckoutData {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  prefill: { name: string; email: string; contact: string };
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (resp: { error: { description: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

export function loadRazorpay() {
  loader ??= new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error('Could not load Razorpay'));
    };
    document.body.appendChild(s);
  });
  return loader;
}

/** Opens Razorpay Checkout; resolves with the signed payment or rejects if dismissed/failed. */
export async function payWithRazorpay(data: RazorpayCheckoutData, description: string) {
  await loadRazorpay();
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: data.keyId,
      order_id: data.orderId,
      amount: data.amount,
      currency: data.currency,
      name: data.name,
      description,
      prefill: data.prefill,
      theme: { color: '#e11d48' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rz.on('payment.failed', (r) => reject(new Error(r.error.description)));
    rz.open();
  });
}
