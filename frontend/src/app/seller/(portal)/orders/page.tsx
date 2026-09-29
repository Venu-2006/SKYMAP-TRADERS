'use client';

import { toast } from 'sonner';
import { StatusBadge } from '@/components/account/order-status';
import { DataTable, PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import type { OrderStatus } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Line {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  commission: string;
  status: OrderStatus;
  order: { orderNumber: string; createdAt: string; shippingAddress: { fullName: string; city: string; pincode: string } };
}

export default function SellerOrdersPage() {
  const { data, loading, error, reload } = useApi<Line[]>('/seller/orders');

  const mark = async (l: Line, status: 'PROCESSING' | 'SHIPPED') => {
    try {
      await api(`/seller/orders/${l.id}`, { method: 'PATCH', body: { status } });
      toast.success(`Marked ${status.toLowerCase()}`);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader title="Orders" description="Pack and dispatch items from your pickup address" />
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Order</th>
            <th>Item</th>
            <th>Ship to</th>
            <th className="text-right">Amount</th>
            <th className="text-right">You earn</th>
            <th>Status</th>
            <th className="text-right">Action</th>
          </tr>
        }
      >
        {data?.map((l) => (
          <tr key={l.id}>
            <td>
              <p className="font-mono text-xs font-semibold">{l.order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">{new Date(l.order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            </td>
            <td>
              <p className="line-clamp-1">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {l.sku} · qty {l.quantity}
              </p>
            </td>
            <td>
              {l.order.shippingAddress.fullName}
              <p className="text-xs text-muted-foreground">
                {l.order.shippingAddress.city} {l.order.shippingAddress.pincode}
              </p>
            </td>
            <td className="text-right tabular-nums">{formatPrice(l.lineTotal)}</td>
            <td className="text-right font-semibold tabular-nums">{formatPrice(Number(l.lineTotal) - Number(l.commission))}</td>
            <td>
              <StatusBadge status={l.status} />
            </td>
            <td className="text-right">
              {l.status === 'CONFIRMED' && (
                <Button size="sm" variant="outline" onClick={() => mark(l, 'PROCESSING')}>
                  Start packing
                </Button>
              )}
              {l.status === 'PROCESSING' && (
                <Button size="sm" onClick={() => mark(l, 'SHIPPED')}>
                  Mark shipped
                </Button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
