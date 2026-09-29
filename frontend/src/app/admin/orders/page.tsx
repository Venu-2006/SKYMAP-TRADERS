'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/components/account/order-status';
import { DataTable, PageHeader, Pager, selectClass } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { ORDER_STATUS_LABEL, type Order, type PageMeta } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

type Row = Order & { user: { name: string; email: string }; _count: { items: number } };

function Orders() {
  const [status, setStatus] = useState(useSearchParams().get('status') ?? '');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error } = useApi<Row[], PageMeta>('/admin/orders', { status: status || undefined, q: search || undefined, page });

  return (
    <>
      <PageHeader title="Orders" description={meta ? `${meta.total} orders` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, customer name or email" className="max-w-sm" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Items</th>
            <th>Payment</th>
            <th>Status</th>
            <th className="text-right">Total</th>
          </tr>
        }
      >
        {data?.map((o) => (
          <tr key={o.id} className="hover:bg-muted/40">
            <td>
              <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-primary hover:underline">
                {o.orderNumber}
              </Link>
            </td>
            <td>
              <p>{o.user.name}</p>
              <p className="text-xs text-muted-foreground">{o.user.email}</p>
            </td>
            <td>{new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
            <td>{o._count.items}</td>
            <td>{o.paymentMethod === 'COD' ? 'COD' : 'Online'}</td>
            <td>
              <StatusBadge status={o.status} />
            </td>
            <td className="text-right font-semibold tabular-nums">{formatPrice(o.total)}</td>
          </tr>
        ))}
      </DataTable>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}
