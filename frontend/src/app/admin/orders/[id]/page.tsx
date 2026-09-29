'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { OrderTimeline, StatusBadge } from '@/components/account/order-status';
import { PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Skeleton } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import { openInvoice } from '@/lib/invoice';
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

/** Mirrors the backend transition rules so only valid next steps are offered. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: ['REFUNDED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, setData, error } = useApi<Order>(`/admin/orders/${id}`);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!order) return <Skeleton className="h-96" />;

  const options = NEXT[order.status];
  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    setBusy(true);
    try {
      const { data } = await api<Order>(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status, note: note || undefined, courier: courier || undefined, trackingNumber: tracking || undefined },
      });
      setData(data);
      setStatus('');
      setNote('');
      toast.success(`Order marked ${ORDER_STATUS_LABEL[data.status].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };
  const a = order.shippingAddress;

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            {!['PENDING', 'CANCELLED'].includes(order.status) && (
              <Button variant="outline" size="sm" onClick={() => openInvoice(order.id)}>
                <FileText /> Invoice
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Items</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.sku} · GST {Number(i.gstRate)}% · {ORDER_STATUS_LABEL[i.status]}
                      </p>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPrice(i.unitPrice)} × {i.quantity}
                    </td>
                    <td className="w-28 py-2 text-right font-semibold tabular-nums">{formatPrice(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <dt>Discount {order.coupon?.code}</dt>
                  <dd>−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Shipping ({order.shippingMethod.toLowerCase()})</dt>
                <dd>{formatPrice(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 font-bold">Timeline</h2>
            <OrderTimeline order={order} />
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Update status</h2>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">This order is closed.</p>
            ) : (
              <form onSubmit={update} className="space-y-3">
                <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="h-10 w-full rounded-lg border bg-card px-3 text-sm" aria-label="New status">
                  <option value="">Choose next status…</option>
                  {options.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                {(status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Courier" htmlFor="courier">
                      <Input id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={order.courier ?? 'Delhivery'} />
                    </FormField>
                    <FormField label="Tracking no." htmlFor="tracking">
                      <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={order.trackingNumber ?? ''} />
                    </FormField>
                  </div>
                )}
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note shown to customer (optional)" />
                <Button type="submit" className="w-full" loading={busy} disabled={!status}>
                  Update
                </Button>
              </form>
            )}
          </section>
          <section className="space-y-1 rounded-2xl border bg-card p-5 text-sm">
            <h2 className="mb-2 font-bold">Customer</h2>
            <p className="font-semibold">{order.user?.name}</p>
            <p className="text-muted-foreground">{order.user?.email}</p>
            <h3 className="pt-3 font-semibold">Ship to</h3>
            <p>{a.fullName} · {a.phone}</p>
            <p className="text-muted-foreground">
              {[a.line1, a.line2, a.landmark, a.city, a.state].filter(Boolean).join(', ')} — {a.pincode}
            </p>
            {a.gstin && <p className="text-muted-foreground">GSTIN {a.gstin}</p>}
          </section>
          <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm">
            <h2 className="font-bold">Payments</h2>
            {order.payments?.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {p.provider} · {p.status}
                  {p.razorpayPaymentId && <span className="block font-mono text-xs text-muted-foreground">{p.razorpayPaymentId}</span>}
                </span>
                <span className="font-semibold">{formatPrice(p.amount)}</span>
              </div>
            ))}
          </section>
          {!!order.returnRequests?.length && (
            <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm">
              <h2 className="font-bold">Requests</h2>
              {order.returnRequests.map((r) => (
                <p key={r.id}>
                  <span className="font-semibold">{r.type}</span> — {r.reason} <span className="text-muted-foreground">({r.status})</span>
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
