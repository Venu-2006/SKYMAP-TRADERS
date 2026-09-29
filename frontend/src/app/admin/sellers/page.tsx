'use client';

import { toast } from 'sonner';
import { DataTable, PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';

interface Seller {
  id: string;
  businessName: string;
  gstin: string | null;
  phone: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  commissionRate: string;
  pickupAddress: { city: string; state: string };
  createdAt: string;
  user: { name: string; email: string };
  _count: { products: number; orderItems: number };
}

const TONE = { PENDING: 'warning', APPROVED: 'success', SUSPENDED: 'secondary', REJECTED: 'secondary' } as const;

export default function AdminSellersPage() {
  const { data, loading, error, reload } = useApi<Seller[]>('/admin/sellers');

  const patch = async (s: Seller, body: { status?: Seller['status']; commissionRate?: number }, msg: string) => {
    try {
      await api(`/admin/sellers/${s.id}`, { method: 'PATCH', body });
      toast.success(msg);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader title="Sellers" description="Approve applications and set commission rates" />
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Business</th>
            <th>Contact</th>
            <th>Location</th>
            <th>Products</th>
            <th>Commission</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        }
      >
        {data?.map((s) => (
          <tr key={s.id}>
            <td>
              <p className="font-medium">{s.businessName}</p>
              <p className="text-xs text-muted-foreground">{s.gstin ? `GSTIN ${s.gstin}` : 'No GSTIN'}</p>
            </td>
            <td>
              <p>{s.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {s.user.email} · {s.phone}
              </p>
            </td>
            <td>
              {s.pickupAddress.city}, {s.pickupAddress.state}
            </td>
            <td>{s._count.products}</td>
            <td>
              <select
                defaultValue={Number(s.commissionRate)}
                onChange={(e) => patch(s, { commissionRate: Number(e.target.value) }, 'Commission updated')}
                className="h-8 rounded-md border bg-card px-2 text-xs"
                aria-label="Commission rate"
              >
                {[5, 8, 10, 12, 15, 20].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </td>
            <td>
              <Badge variant={TONE[s.status]}>{s.status}</Badge>
            </td>
            <td>
              <div className="flex justify-end gap-1">
                {s.status !== 'APPROVED' && (
                  <Button size="sm" onClick={() => patch(s, { status: 'APPROVED' }, 'Seller approved')}>
                    Approve
                  </Button>
                )}
                {s.status === 'PENDING' && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => patch(s, { status: 'REJECTED' }, 'Application rejected')}>
                    Reject
                  </Button>
                )}
                {s.status === 'APPROVED' && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => patch(s, { status: 'SUSPENDED' }, 'Seller suspended')}>
                    Suspend
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
