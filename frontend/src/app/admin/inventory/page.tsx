'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable, PageHeader, Pager } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import type { PageMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockAlert: number;
  status: string;
  soldCount: number;
}
interface Log {
  id: string;
  change: number;
  reason: string;
  reference: string | null;
  createdAt: string;
  product: { name: string };
}

function StockAdjust({ item, onDone }: { item: Item; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const change = Number(qty);
    if (!change) return;
    setBusy(true);
    try {
      await api(`/products/manage/${item.id}/stock`, { method: 'POST', body: { change, reason: change > 0 ? 'RESTOCK' : 'ADJUSTMENT' } });
      toast.success(`Stock ${change > 0 ? 'added' : 'reduced'}`);
      setQty('');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex justify-end gap-1">
      <Input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d-]/g, ''))} placeholder="+/- qty" className="h-8 w-24" aria-label={`Adjust stock for ${item.name}`} />
      <Button size="sm" variant="secondary" loading={busy} disabled={!Number(qty)}>
        Apply
      </Button>
    </form>
  );
}

function Inventory() {
  const [lowOnly, setLowOnly] = useState(useSearchParams().get('low') === '1');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi<{ items: Item[]; logs: Log[] }, PageMeta>('/admin/inventory', {
    q: search || undefined,
    lowOnly: lowOnly ? 'true' : undefined,
    page,
  });

  return (
    <>
      <PageHeader title="Inventory" description="Stock levels, low-stock alerts and recent stock movements" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="max-w-sm" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => {
              setPage(1);
              setLowOnly(e.target.checked);
            }}
            className="accent-[var(--primary)]"
          />
          Low stock only
        </label>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div>
          <DataTable
            loading={loading}
            error={error}
            empty={!data?.items.length}
            head={
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Alert at</th>
                <th>Sold</th>
                <th className="text-right">Adjust</th>
              </tr>
            }
          >
            {data?.items.map((i) => (
              <tr key={i.id}>
                <td>
                  <Link href={`/admin/products/${i.id}`} className="font-medium hover:text-primary">
                    {i.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{i.sku}</p>
                </td>
                <td className={cn('font-semibold tabular-nums', i.stock === 0 ? 'text-destructive' : i.stock <= i.lowStockAlert && 'text-warning')}>{i.stock}</td>
                <td>{i.lowStockAlert}</td>
                <td>{i.soldCount}</td>
                <td>
                  <StockAdjust item={i} onDone={reload} />
                </td>
              </tr>
            ))}
          </DataTable>
          <Pager meta={meta} onPage={setPage} />
        </div>
        <section className="self-start rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-bold">Recent movements</h2>
          <ul className="space-y-2.5 text-sm">
            {data?.logs.map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className={cn('w-12 shrink-0 text-right font-mono font-semibold', l.change > 0 ? 'text-success' : 'text-destructive')}>
                  {l.change > 0 ? `+${l.change}` : l.change}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-1">{l.product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {l.reason} · {new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense>
      <Inventory />
    </Suspense>
  );
}
