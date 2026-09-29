'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { StatusBadge } from '@/components/account/order-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import type { Order, PageMeta } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export default function OrdersPage() {
  const t = useT();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<Order[], PageMeta>('/orders', { query: { page, limit: 10 } })
      .then((r) => {
        setOrders((prev) => (page === 1 ? r.data : [...(prev ?? []), ...r.data]));
        setMeta(r.meta!);
      })
      .catch(() => setOrders([]));
  }, [page]);

  return (
    <div className="container-page max-w-4xl space-y-4 py-8">
      <h1 className="text-2xl font-extrabold">{t('orders.title')}</h1>
      {orders === null ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <PackageOpen className="size-12 text-muted-foreground" />
          <p className="font-semibold">{t('orders.empty')}</p>
          <Button asChild>
            <Link href="/products">{t('cart.startShopping')}</Link>
          </Button>
        </div>
      ) : (
        orders.map((o) => (
          <Link key={o.id} href={`/account/orders/${o.id}`} className="block rounded-2xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-md">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-mono font-semibold">{o.orderNumber}</span>
              <StatusBadge status={o.status} />
              <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              <span className="ml-auto font-bold">{formatPrice(o.total)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {o.items.slice(0, 4).map((i) => (
                  <div key={i.id} className="relative size-14 overflow-hidden rounded-lg border-2 border-card bg-muted">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                ))}
              </div>
              <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                {o.items.map((i) => i.name).join(', ')}
              </p>
              <ChevronRight className="size-5 text-muted-foreground" />
            </div>
          </Link>
        ))
      )}
      {meta && page < meta.totalPages && (
        <Button variant="outline" className="w-full" onClick={() => setPage((p) => p + 1)}>
          Load more
        </Button>
      )}
    </div>
  );
}
