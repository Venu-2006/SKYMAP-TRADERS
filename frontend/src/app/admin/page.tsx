'use client';

import Link from 'next/link';
import { AlertTriangle, IndianRupee, Package, ShoppingBag, Store, Users } from 'lucide-react';
import { StatusBadge } from '@/components/account/order-status';
import { PageHeader, StatCard } from '@/components/admin/panel';
import { RevenueChart, type DailyPoint } from '@/components/admin/revenue-chart';
import { Skeleton } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Stats {
  kpis: {
    revenue: number;
    paidOrders: number;
    orders30: number;
    customers: number;
    products: number;
    pendingOrders: number;
    pendingSellers: number;
    pendingProducts: number;
  };
  daily: DailyPoint[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number }[];
  recentOrders: (Order & { user: { name: string } })[];
}

export default function AdminDashboard() {
  const { data, error } = useApi<Stats>('/admin/stats');

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  const k = data.kpis;
  const alerts = [
    k.pendingOrders > 0 && { href: '/admin/orders?status=CONFIRMED', text: `${k.pendingOrders} order(s) waiting to be shipped` },
    k.pendingProducts > 0 && { href: '/admin/products?status=PENDING_APPROVAL', text: `${k.pendingProducts} seller product(s) awaiting approval` },
    k.pendingSellers > 0 && { href: '/admin/sellers', text: `${k.pendingSellers} seller application(s) to review` },
    data.lowStock.length > 0 && { href: '/admin/inventory?low=1', text: `${data.lowStock.length} product(s) low on stock` },
  ].filter(Boolean) as { href: string; text: string }[];

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="Store performance at a glance" />

      {alerts.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {alerts.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="flex items-center gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm font-medium hover:bg-warning/20">
                <AlertTriangle className="size-4 shrink-0" /> {a.text}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatPrice(k.revenue)} hint={`${k.paidOrders} confirmed orders`} icon={IndianRupee} />
        <StatCard label="Orders (30 days)" value={k.orders30} icon={ShoppingBag} />
        <StatCard label="Customers" value={k.customers} icon={Users} />
        <StatCard label="Live products" value={k.products} hint={`${k.pendingSellers} pending sellers`} icon={Package} />
      </div>

      <RevenueChart data={data.daily} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-primary">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                    <span className="font-mono text-xs">{o.orderNumber}</span>
                    <span className="flex-1 truncate">{o.user.name}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Top products</h2>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sales will appear here.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {data.topProducts.map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-3">
                    <span className="w-4 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground">{p.quantity} sold</span>
                    <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Low stock</h2>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well stocked.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <Link href={`/admin/products/${p.id}`} className="truncate hover:text-primary">
                      {p.name}
                    </Link>
                    <span className={p.stock === 0 ? 'font-semibold text-destructive' : 'font-semibold'}>{p.stock} left</span>
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
