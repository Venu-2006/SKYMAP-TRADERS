'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, PageHeader, StatCard } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { API_URL } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface Report {
  totals: { orders: number; revenue: number; tax: number; discount: number; shipping: number };
  daily: { day: string; orders: number; revenue: number; tax: number }[];
  byCategory: { category: string; quantity: number; revenue: number }[];
  byPayment: { method: string; orders: number; revenue: number }[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminReportsPage() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const { data, loading, error } = useApi<Report>('/admin/reports/sales', { from, to });

  const downloadCsv = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/reports/sales?from=${from}&to=${to}&format=csv`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: `sales-${from}-to-${to}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download report');
    }
  };

  const maxCat = Math.max(...(data?.byCategory.map((c) => c.revenue) ?? [1]), 1);

  return (
    <>
      <PageHeader
        title="Sales reports"
        description="Confirmed and fulfilled orders (cancelled and unpaid orders are excluded)"
        actions={
          <Button variant="outline" onClick={downloadCsv}>
            <Download /> Export CSV
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From</span>
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">To</span>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Revenue" value={formatPrice(data.totals.revenue)} />
            <StatCard label="Orders" value={data.totals.orders} hint={data.totals.orders ? `Avg ${formatPrice(data.totals.revenue / data.totals.orders)}` : undefined} />
            <StatCard label="GST collected" value={formatPrice(data.totals.tax)} />
            <StatCard label="Discounts given" value={formatPrice(data.totals.discount)} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 font-bold">Revenue by category</h2>
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales in this period.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {data.byCategory.map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex justify-between">
                        <span>{c.category}</span>
                        <span className="font-semibold tabular-nums">
                          {formatPrice(c.revenue)} <span className="font-normal text-muted-foreground">· {c.quantity} units</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(c.revenue / maxCat) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 font-bold">By payment method</h2>
              <ul className="space-y-2 text-sm">
                {data.byPayment.map((p) => (
                  <li key={p.method} className="flex justify-between">
                    <span>{p.method === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)'}</span>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(p.revenue)} <span className="font-normal text-muted-foreground">· {p.orders} orders</span>
                    </span>
                  </li>
                ))}
                {!data.byPayment.length && <li className="text-muted-foreground">No sales in this period.</li>}
              </ul>
            </section>
          </div>
          <DataTable
            loading={loading}
            empty={!data.daily.length}
            head={
              <tr>
                <th>Date</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">GST</th>
              </tr>
            }
          >
            {data.daily.map((d) => (
              <tr key={d.day} className="tabular-nums">
                <td>{new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                <td className="text-right">{d.orders}</td>
                <td className="text-right">{formatPrice(d.revenue)}</td>
                <td className="text-right">{formatPrice(d.tax)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </>
  );
}
