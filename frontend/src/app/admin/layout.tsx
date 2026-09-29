'use client';

import { BarChart3, Boxes, FolderTree, Image as ImageIcon, LayoutDashboard, Package, ShoppingBag, Store, TicketPercent, Users } from 'lucide-react';
import { PanelShell, type NavItem } from '@/components/admin/panel';
import { RequireAuth } from '@/components/auth/require-auth';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/sellers', label: 'Sellers', icon: Store },
  { href: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/reports', label: 'Sales reports', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['ADMIN']}>
      <PanelShell title="Admin" nav={NAV}>
        {children}
      </PanelShell>
    </RequireAuth>
  );
}
