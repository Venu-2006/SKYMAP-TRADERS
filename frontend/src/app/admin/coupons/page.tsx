'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, FormField } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: string;
  maxDiscount: string | null;
  minOrderValue: string;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

const EMPTY = { code: '', description: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED', value: '', maxDiscount: '', minOrderValue: '0', usageLimit: '', perUserLimit: '1', expiresAt: '' };

export default function AdminCouponsPage() {
  const { data, loading, error, reload } = useApi<Coupon[]>('/admin/coupons');
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api('/admin/coupons', {
        method: 'POST',
        body: {
          code: form.code,
          description: form.description || undefined,
          type: form.type,
          value: Number(form.value),
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          minOrderValue: Number(form.minOrderValue || 0),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          perUserLimit: Number(form.perUserLimit || 1),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
      });
      toast.success('Coupon created');
      setForm(null);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : 'Could not create coupon');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: Coupon) => {
    await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } }).catch(() => toast.error('Update failed'));
    reload();
  };
  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }).catch(() => toast.error('Delete failed'));
    reload();
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => f && { ...f, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Coupons"
        actions={
          <Button onClick={() => setForm(EMPTY)}>
            <Plus /> New coupon
          </Button>
        }
      />
      {form && (
        <form onSubmit={create} className="mb-5 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Code" htmlFor="c-code">
            <Input id="c-code" required className="uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </FormField>
          <FormField label="Type" htmlFor="c-type">
            <select id="c-type" value={form.type} onChange={set('type')} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED">Flat ₹ off</option>
            </select>
          </FormField>
          <FormField label={form.type === 'PERCENTAGE' ? 'Percent (%)' : 'Amount (₹)'} htmlFor="c-value">
            <Input id="c-value" type="number" required min={1} value={form.value} onChange={set('value')} />
          </FormField>
          <FormField label="Max discount (₹)" htmlFor="c-max">
            <Input id="c-max" type="number" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" />
          </FormField>
          <FormField label="Min. order value (₹)" htmlFor="c-min">
            <Input id="c-min" type="number" value={form.minOrderValue} onChange={set('minOrderValue')} />
          </FormField>
          <FormField label="Total uses" htmlFor="c-limit">
            <Input id="c-limit" type="number" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" />
          </FormField>
          <FormField label="Uses per customer" htmlFor="c-per">
            <Input id="c-per" type="number" min={1} value={form.perUserLimit} onChange={set('perUserLimit')} />
          </FormField>
          <FormField label="Expires" htmlFor="c-exp">
            <Input id="c-exp" type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3">
            <FormField label="Description (shown to shoppers)" htmlFor="c-desc">
              <Input id="c-desc" value={form.description} onChange={set('description')} />
            </FormField>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={busy}>
              Create
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Min. order</th>
            <th>Used</th>
            <th>Expires</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        }
      >
        {data?.map((c) => (
          <tr key={c.id}>
            <td>
              <p className="font-mono font-bold">{c.code}</p>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </td>
            <td>
              {c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : formatPrice(c.value)}
              {c.maxDiscount && <span className="text-xs text-muted-foreground"> (max {formatPrice(c.maxDiscount)})</span>}
            </td>
            <td>{formatPrice(c.minOrderValue)}</td>
            <td>
              {c.usedCount}
              {c.usageLimit ? ` / ${c.usageLimit}` : ''}
            </td>
            <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Never'}</td>
            <td>
              <button onClick={() => toggle(c)} aria-label="Toggle active">
                <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Paused'}</Badge>
              </button>
            </td>
            <td className="text-right">
              <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Delete" onClick={() => remove(c)}>
                <Trash2 />
              </Button>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
