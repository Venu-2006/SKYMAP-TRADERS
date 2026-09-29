'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, FileText, RotateCcw, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { OrderTimeline, StatusBadge } from '@/components/account/order-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { openInvoice } from '@/lib/invoice';
import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const CANCEL_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery is taking too long', 'Need to change address', 'Other'];
const RETURN_REASONS = ['Damaged or defective', 'Wrong item received', 'Item not as described', 'Missing parts or accessories', 'No longer needed'];

function RequestForm({ kind, onSubmit, onCancel }: { kind: 'cancel' | 'return'; onSubmit: (reason: string, details: string) => Promise<void>; onCancel: () => void }) {
  const reasons = kind === 'cancel' ? CANCEL_REASONS : RETURN_REASONS;
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 rounded-xl border bg-muted/40 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(reason, details).finally(() => setBusy(false));
      }}
    >
      <p className="font-semibold">{kind === 'cancel' ? 'Why are you cancelling?' : 'Why are you returning this order?'}</p>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">
        {reasons.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Additional details (optional)"
        className="w-full rounded-lg border bg-card p-3 text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" variant={kind === 'cancel' ? 'destructive' : 'default'} loading={busy}>
          {kind === 'cancel' ? 'Confirm cancellation' : 'Submit return request'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'cancel' | 'return' | null>(null);

  useEffect(() => {
    api<Order>(`/orders/${id}`)
      .then((r) => setOrder(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load order'));
  }, [id]);

  if (error) return <p className="container-page py-16 text-center text-muted-foreground">{error}</p>;
  if (!order) {
    return (
      <div className="container-page max-w-4xl space-y-4 py-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const withinReturn = order.deliveredAt && Date.now() - new Date(order.deliveredAt).getTime() < 7 * 86_400_000;
  const canReturn = order.status === 'DELIVERED' && withinReturn;
  const hasInvoice = !['PENDING', 'CANCELLED'].includes(order.status);
  const a = order.shippingAddress;

  const submit = async (kind: 'cancel' | 'return', reason: string, details: string) => {
    try {
      const { data } = await api<Order>(`/orders/${order.id}/${kind}`, { method: 'POST', body: { reason, ...(kind === 'return' && details ? { details } : {}) } });
      setOrder(data);
      setMode(null);
      toast.success(kind === 'cancel' ? 'Order cancelled' : 'Return requested — we’ll arrange a pickup');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Request failed');
    }
  };

  return (
    <div className="container-page max-w-4xl space-y-5 py-8">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-extrabold sm:text-2xl">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasInvoice && (
          <Button variant="outline" onClick={() => openInvoice(order.id)}>
            <FileText /> {t('orders.downloadInvoice')}
          </Button>
        )}
        {canCancel && mode === null && (
          <Button variant="outline" className="text-destructive" onClick={() => setMode('cancel')}>
            <XCircle /> {t('orders.cancelOrder')}
          </Button>
        )}
        {canReturn && mode === null && (
          <Button variant="outline" onClick={() => setMode('return')}>
            <RotateCcw /> {t('orders.requestReturn')}
          </Button>
        )}
      </div>
      {mode && <RequestForm kind={mode} onCancel={() => setMode(null)} onSubmit={(r, d) => submit(mode, r, d)} />}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <Truck className="size-5" /> {t('orders.tracking')}
        </h2>
        {order.trackingNumber && (
          <p className="mb-4 rounded-lg bg-muted/60 p-3 text-sm">
            {order.courier ?? 'Courier'} · Tracking no. <span className="font-mono font-semibold">{order.trackingNumber}</span>
          </p>
        )}
        <OrderTimeline order={order} />
      </section>

      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-bold">{t('orders.items')}</h2>
          <ul className="divide-y">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="flex-1 text-sm">
                  <p className="line-clamp-2 font-medium">{i.name}</p>
                  <p className="text-muted-foreground">
                    {formatPrice(i.unitPrice)} × {i.quantity} · GST {Number(i.gstRate)}%
                  </p>
                </div>
                <span className="font-semibold">{formatPrice(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 text-sm">
            <h2 className="mb-2 font-bold">Delivery address</h2>
            <p className="font-semibold">{a.fullName}</p>
            <p className="text-muted-foreground">
              {[a.line1, a.line2, a.landmark, a.city, a.state].filter(Boolean).join(', ')} — {a.pincode}
            </p>
            <p className="text-muted-foreground">Phone: {a.phone}</p>
          </section>
          <section className="space-y-1.5 rounded-2xl border bg-card p-5 text-sm">
            <h2 className="mb-2 font-bold">Payment</h2>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon {order.coupon?.code}</span>
                <span>−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{Number(order.shippingFee) ? formatPrice(order.shippingFee) : 'FREE'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST included</span>
              <span>{formatPrice(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <p className="pt-1 text-muted-foreground">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid online via Razorpay'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
