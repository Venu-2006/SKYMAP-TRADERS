'use client';

import { LayoutDashboard, Package, ShoppingBag } from 'lucide-react';
import { PanelShell, type NavItem } from '@/components/admin/panel';
import { RequireAuth } from '@/components/auth/require-auth';

const NAV: NavItem[] = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Products', icon: Package },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['SELLER']} fallback="/seller/register">
      <PanelShell title="Seller portal" nav={NAV}>
        {children}
      </PanelShell>
    </RequireAuth>
  );
}
