'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, CreditCard, Lock, MapPin, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { AddressManager } from '@/components/account/address-manager';
import { RequireAuth } from '@/components/auth/require-auth';
import { OrderSummary } from '@/components/cart/order-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { payWithRazorpay, type RazorpayCheckoutData } from '@/lib/razorpay';
import type { Address, Order } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useT } from '@/lib/i18n';

interface Options {
  shipping: { id: 'STANDARD' | 'EXPRESS'; label: string; fee: number; freeAbove: number | null }[];
  payments: { razorpay: boolean; cod: boolean };
}

function Section({ step, title, icon: Icon, children }: { step: number; title: React.ReactNode; icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">{step}</span>
        <Icon className="size-5 text-muted-foreground" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Checkout() {
  const router = useRouter();
  const t = useT();
  const { items, serverSummary, loading, load } = useCartStore();
  const [options, setOptions] = useState<Options | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [shipping, setShipping] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [payment, setPayment] = useState<'RAZORPAY' | 'COD'>('COD');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    load().catch(() => undefined);
    api<Options>('/orders/checkout-options')
      .then((r) => {
        setOptions(r.data);
        if (r.data.payments.razorpay) setPayment('RAZORPAY');
      })
      .catch(() => toast.error('Could not load checkout options'));
  }, [load]);

  const active = items.filter((i) => !i.savedForLater);

  if (!options || !serverSummary || (loading && !items.length)) {
    return (
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!active.length) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <Package className="size-14 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Nothing to check out</h1>
        <Button asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const method = options.shipping.find((s) => s.id === shipping)!;
  const afterDiscount = serverSummary.subtotal - serverSummary.discount;
  const shippingFee = method.freeAbove !== null && afterDiscount >= method.freeAbove ? 0 : method.fee;

  const placeOrder = async () => {
    if (!address) return toast.error('Please select a delivery address');
    setPlacing(true);
    try {
      const { data } = await api<{ order: Order; razorpay: RazorpayCheckoutData | null }>('/orders', {
        method: 'POST',
        body: { addressId: address.id, shippingMethod: shipping, paymentMethod: payment },
      });

      if (data.razorpay) {
        try {
          const paid = await payWithRazorpay(data.razorpay, `Order ${data.order.orderNumber}`);
          await api(`/orders/${data.order.id}/verify-payment`, {
            method: 'POST',
            body: { razorpayOrderId: paid.razorpay_order_id, razorpayPaymentId: paid.razorpay_payment_id, razorpaySignature: paid.razorpay_signature },
          });
        } catch (e) {
          toast.error(`${e instanceof Error ? e.message : 'Payment failed'}. You can retry from your orders page.`);
          router.push(`/account/orders/${data.order.id}`);
          return;
        }
      }
      await load();
      router.replace(`/checkout/success?order=${data.order.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not place order');
      load().catch(() => undefined);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-extrabold">{t('checkout.title')}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section step={1} title={t('checkout.address')} icon={MapPin}>
            <AddressManager selectedId={address?.id} onSelect={setAddress} />
          </Section>

          <Section step={2} title={t('checkout.speed')} icon={Truck}>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.shipping.map((s) => {
                const fee = s.freeAbove !== null && afterDiscount >= s.freeAbove ? 0 : s.fee;
                return (
                  <label
                    key={s.id}
                    className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4', shipping === s.id && 'border-primary ring-2 ring-primary/20')}
                  >
                    <input type="radio" name="shipping" checked={shipping === s.id} onChange={() => setShipping(s.id)} className="mt-1 accent-[var(--primary)]" />
                    <span className="text-sm">
                      <span className="block font-semibold">{s.label}</span>
                      <span className={fee ? '' : 'font-semibold text-success'}>{fee ? formatPrice(fee) : 'FREE'}</span>
                      {s.freeAbove !== null && fee > 0 && <span className="block text-xs text-muted-foreground">Free above {formatPrice(s.freeAbove)}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>

          <Section step={3} title={t('checkout.payment')} icon={CreditCard}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4',
                  options.payments.razorpay ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                  payment === 'RAZORPAY' && 'border-primary ring-2 ring-primary/20',
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  disabled={!options.payments.razorpay}
                  checked={payment === 'RAZORPAY'}
                  onChange={() => setPayment('RAZORPAY')}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span className="text-sm">
                  <span className="block font-semibold">{t('checkout.online')}</span>
                  <span className="text-muted-foreground">{options.payments.razorpay ? 'Secure payment via Razorpay' : 'Online payment not available yet'}</span>
                </span>
              </label>
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4', payment === 'COD' && 'border-primary ring-2 ring-primary/20')}>
                <input type="radio" name="payment" checked={payment === 'COD'} onChange={() => setPayment('COD')} className="mt-1 accent-[var(--primary)]" />
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Banknote className="size-4" /> {t('checkout.cod')}
                  </span>
                  <span className="text-muted-foreground">{t('checkout.codSub')}</span>
                </span>
              </label>
            </div>
          </Section>

          <Section step={4} title={`${t('checkout.review')} (${active.length})`} icon={Package}>
            <ul className="divide-y">
              {active.map((l) => (
                <li key={l.productId} className="flex items-center gap-3 py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <span className="line-clamp-2 flex-1 text-sm">{l.name}</span>
                  <span className="text-sm text-muted-foreground">× {l.quantity}</span>
                  <span className="w-24 text-right text-sm font-semibold">{formatPrice(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <OrderSummary summary={serverSummary} shippingOverride={shippingFee}>
            <Button size="lg" className="w-full" loading={placing} disabled={!address} onClick={placeOrder}>
              <Lock /> {payment === 'COD' ? t('checkout.placeOrder') : t('checkout.pay', { amount: formatPrice(afterDiscount + shippingFee) })}
            </Button>
            <p className="text-center text-xs text-muted-foreground">By placing the order you agree to our Terms of Use.</p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  );
}
