'use client';

import Link from 'next/link';
import { Boxes, IndianRupee, Percent, Wallet } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Stats {
  seller: { businessName: string; commissionRate: string };
  kpis: { gross: number; commission: number; net: number; unitsSold: number; orderLines: number; pending: number };
  products: Record<string, number>;
  lowStock: { id: string; name: string; stock: number }[];
  recent: { id: string; name: string; quantity: number; lineTotal: string; status: OrderStatus; order: { orderNumber: string; createdAt: string } }[];
}

export default function SellerDashboard() {
  const { data, error } = useApi<Stats>('/seller/stats');
  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <Skeleton className="h-96" />;
  const k = data.kpis;

  return (
    <div className="space-y-5">
      <PageHeader
        title={data.seller.businessName}
        description={`Commission rate ${Number(data.seller.commissionRate)}% on each sale`}
        actions={
          <Button asChild>
            <Link href="/seller/products/new">Add product</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Gross sales" value={formatPrice(k.gross)} hint={`${k.unitsSold} units`} icon={IndianRupee} />
        <StatCard label="Commission" value={formatPrice(k.commission)} icon={Percent} />
        <StatCard label="Net earnings" value={formatPrice(k.net)} icon={Wallet} />
        <StatCard label="To fulfil" value={k.pending} hint="order lines" icon={Boxes} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link href="/seller/orders" className="text-sm font-semibold text-primary">
              View all
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-xs">{r.order.orderNumber}</span>
                  <span className="flex-1 truncate">
                    {r.name} × {r.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground">{ORDER_STATUS_LABEL[r.status]}</span>
                  <span className="font-semibold">{formatPrice(r.lineTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Listings</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {Object.entries(data.products).map(([status, n]) => (
                <span key={status}>
                  <strong>{n}</strong> {status.replace('_', ' ').toLowerCase()}
                </span>
              ))}
              {!Object.keys(data.products).length && <span className="text-muted-foreground">No products yet.</span>}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Low stock</h2>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All good.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <Link href={`/seller/products/${p.id}`} className="truncate hover:text-primary">
                      {p.name}
                    </Link>
                    <span className="font-semibold">{p.stock} left</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
