'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import type { PageMeta } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { DataTable, PageHeader, Pager, selectClass } from './panel';

interface Row {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: string;
  stock: number;
  status: string;
  images: { url: string }[];
  category: { name: string };
  brand: { name: string } | null;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'secondary' | 'default'> = {
  ACTIVE: 'success',
  PENDING_APPROVAL: 'warning',
  DRAFT: 'secondary',
  INACTIVE: 'secondary',
  REJECTED: 'default',
};

/** Product list for admin (all products, with approve/reject) and sellers (own products). */
export function ProductsTable({ mode, initialStatus }: { mode: 'admin' | 'seller'; initialStatus?: string }) {
  const base = mode === 'admin' ? '/admin/products' : '/seller/products';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus ?? '');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi<Row[], PageMeta>('/products/manage/list', { q: search || undefined, status: status || undefined, page, limit: 20 });

  const setProductStatus = async (id: string, next: string) => {
    try {
      await api(`/products/manage/${id}`, { method: 'PATCH', body: { status: next } });
      toast.success(next === 'ACTIVE' ? 'Product approved and live' : 'Product updated');
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete “${row.name}”? Products with orders are archived instead.`)) return;
    try {
      const { data: r } = await api<{ archived: boolean }>(`/products/manage/${row.id}`, { method: 'DELETE' });
      toast.success(r.archived ? 'Product has orders, so it was archived (inactive)' : 'Product deleted');
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <PageHeader
        title={mode === 'admin' ? 'Products' : 'My products'}
        description={meta ? `${meta.total} products` : undefined}
        actions={
          <Button asChild>
            <Link href={`${base}/new`}>
              <Plus /> Add product
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
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
          <option value="ACTIVE">Active</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        }
      >
        {data?.map((p) => (
          <tr key={p.id}>
            <td>
              <div className="flex items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku}
                    {p.brand && ` · ${p.brand.name}`}
                  </p>
                </div>
              </div>
            </td>
            <td>{p.category.name}</td>
            <td className="tabular-nums">{formatPrice(p.price)}</td>
            <td className={p.stock === 0 ? 'font-semibold text-destructive' : ''}>{p.stock}</td>
            <td>
              <Badge variant={STATUS_TONE[p.status] ?? 'secondary'}>{p.status.replace('_', ' ')}</Badge>
            </td>
            <td>
              <div className="flex justify-end gap-1">
                {mode === 'admin' && p.status === 'PENDING_APPROVAL' && (
                  <>
                    <Button size="sm" variant="outline" className="text-success" onClick={() => setProductStatus(p.id, 'ACTIVE')}>
                      <Check /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setProductStatus(p.id, 'REJECTED')} aria-label="Reject">
                      <X />
                    </Button>
                  </>
                )}
                <Button asChild size="icon" variant="ghost" className="size-8" aria-label="Edit">
                  <Link href={`${base}/${p.id}`}>
                    <Pencil />
                  </Link>
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Delete" onClick={() => remove(p)}>
                  <Trash2 />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
