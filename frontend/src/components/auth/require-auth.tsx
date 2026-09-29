'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { Skeleton } from '@/components/ui/misc';
import { useAuthStore } from '@/store/auth-store';

/**
 * Client-side guard for account/admin/seller areas. The API enforces the
 * real authorization; this only avoids rendering pages the user can't use.
 */
export function RequireAuth({ roles, children, fallback = '/' }: { roles?: Role[]; children: React.ReactNode; fallback?: string }) {
  const { user, accessToken, hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!user && !!accessToken && (!roles || user.role === 'SUPER_ADMIN' || roles.includes(user.role));

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) router.replace(fallback);
  }, [hydrated, user, accessToken, allowed, pathname, router, fallback]);

  if (!hydrated || !allowed) {
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
