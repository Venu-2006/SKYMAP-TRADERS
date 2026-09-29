'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable, PageHeader, Pager, selectClass } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import type { PageMeta, Role } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number };
}

export default function AdminCustomersPage() {
  const me = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi<Customer[], PageMeta>('/admin/customers', { q: search || undefined, status: role || undefined, page });

  const patch = async (c: Customer, body: Partial<Pick<Customer, 'isActive' | 'role'>>, msg: string) => {
    try {
      await api(`/admin/customers/${c.id}`, { method: 'PATCH', body });
      toast.success(msg);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader title="Customers" description={meta ? `${meta.total} accounts` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className="max-w-sm" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass} aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="SELLER">Sellers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>User</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Orders</th>
            <th>Joined</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        }
      >
        {data?.map((c) => {
          const locked = c.id === me?.id || c.role === 'SUPER_ADMIN';
          return (
            <tr key={c.id}>
              <td>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.email} {c.emailVerified ? '' : '· unverified'}
                </p>
              </td>
              <td>{c.phone ?? '—'}</td>
              <td>
                {locked ? (
                  <Badge variant="secondary">{c.role.replace('_', ' ')}</Badge>
                ) : (
                  <select
                    value={c.role}
                    onChange={(e) => patch(c, { role: e.target.value as Role }, 'Role updated')}
                    className="h-8 rounded-md border bg-card px-2 text-xs"
                    aria-label={`Role for ${c.name}`}
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="SELLER">Seller</option>
                    {me?.role === 'SUPER_ADMIN' && <option value="ADMIN">Admin</option>}
                  </select>
                )}
              </td>
              <td>{c._count.orders}</td>
              <td>{new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
              <td>
                <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Suspended'}</Badge>
              </td>
              <td className="text-right">
                {!locked && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={c.isActive ? 'text-destructive' : ''}
                    onClick={() => patch(c, { isActive: !c.isActive }, c.isActive ? 'Account suspended' : 'Account reactivated')}
                  >
                    {c.isActive ? 'Suspend' : 'Reactivate'}
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
