import type { Metadata } from 'next';
import { RequireAuth } from '@/components/auth/require-auth';
import { AccountNav } from '@/components/account/account-nav';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AccountNav />
      {children}
    </RequireAuth>
  );
}
