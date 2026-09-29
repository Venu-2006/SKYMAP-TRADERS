'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  ['/account', 'Profile'],
  ['/account/orders', 'Orders'],
  ['/account/addresses', 'Addresses'],
  ['/wishlist', 'Wishlist'],
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="container-page pt-6" aria-label="Account">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto border-b">
        {LINKS.map(([href, label]) => {
          const active = href === '/account' ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  '-mb-px block whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium',
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
