'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import type { PageMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar layout shared by the admin panel and seller portal. */
export function PanelShell({ title, nav, children }: { title: string; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const root = nav[0].href;
  return (
    <div className="container-page flex flex-col gap-6 py-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="mb-3 hidden px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground lg:block">{title}</p>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:sticky lg:top-36 lg:flex-col">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === root ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        {Icon && <Icon className="size-4" />}
      </div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Table wrapper with loading / empty / error states. */
export function DataTable({
  loading,
  error,
  empty,
  head,
  children,
}: {
  loading: boolean;
  error?: string | null;
  empty: boolean;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[720px] text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground">
        <thead className="border-b bg-muted/40">{head}</thead>
        <tbody className="divide-y">
          {loading && empty ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                <td colSpan={20}>
                  <Skeleton className="h-6" />
                </td>
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={20} className="py-10 text-center text-destructive">
                {error}
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={20} className="py-10 text-center text-muted-foreground">
                Nothing here yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ meta, onPage }: { meta: PageMeta | null; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <span className="text-muted-foreground">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </Button>
      <Button size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Next
      </Button>
    </div>
  );
}

export const selectClass = 'h-10 rounded-lg border bg-card px-3 text-sm';
