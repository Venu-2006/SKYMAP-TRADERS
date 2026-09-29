'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Star, X } from 'lucide-react';
import type { Category, ListingMeta } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';

export const SORT_OPTIONS = [
  ['relevance', 'Relevance'],
  ['popular', 'Popularity'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['discount', 'Discount'],
  ['rating', 'Customer rating'],
  ['newest', 'Newest first'],
] as const;

/** Updates URL search params (the single source of truth for listing filters). */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in updates)) next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return { params, set };
}

export function SortSelect() {
  const t = useT();
  const { params, set } = useFilterParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">{t('product.sortBy')}</span>
      <select
        value={params.get('sort') ?? 'relevance'}
        onChange={(e) => set({ sort: e.target.value === 'relevance' ? undefined : e.target.value })}
        className="h-9 rounded-lg border bg-card px-3 text-sm font-medium"
      >
        {SORT_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b py-4 last:border-0">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function FilterBody({ categories, facets }: { categories: Category[]; facets: ListingMeta['facets'] }) {
  const { params, set } = useFilterParams();
  const selectedBrands = params.get('brands')?.split(',').filter(Boolean) ?? [];
  const [min, setMin] = useState(params.get('minPrice') ?? '');
  const [max, setMax] = useState(params.get('maxPrice') ?? '');
  const activeCat = params.get('category');
  const rating = Number(params.get('rating') ?? 0);

  const toggleBrand = (slug: string) => {
    const next = selectedBrands.includes(slug) ? selectedBrands.filter((b) => b !== slug) : [...selectedBrands, slug];
    set({ brands: next.join(',') || undefined });
  };

  return (
    <>
      <Section title="Category">
        <ul className="space-y-1 text-sm">
          <li>
            <button onClick={() => set({ category: undefined })} className={cn('hover:text-primary', !activeCat && 'font-semibold text-primary')}>
              All categories
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => set({ category: c.slug })}
                className={cn('text-left hover:text-primary', activeCat === c.slug && 'font-semibold text-primary')}
              >
                {c.name} <span className="text-xs text-muted-foreground">({c._count?.products ?? 0})</span>
              </button>
              {c.children.length > 0 && (
                <ul className="ml-3 mt-1 space-y-1 border-l pl-3">
                  {c.children.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => set({ category: s.slug })} className={cn('hover:text-primary', activeCat === s.slug && 'font-semibold text-primary')}>
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Price">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ minPrice: min || undefined, maxPrice: max || undefined });
          }}
        >
          <Input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} placeholder={`₹${facets.price.min}`} aria-label="Minimum price" inputMode="numeric" className="h-9" />
          <span className="text-muted-foreground">–</span>
          <Input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} placeholder={`₹${facets.price.max}`} aria-label="Maximum price" inputMode="numeric" className="h-9" />
          <Button size="sm" variant="secondary" type="submit">
            Go
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            [0, 500],
            [500, 2000],
            [2000, 5000],
            [5000, 0],
          ].map(([lo, hi]) => (
            <button
              key={`${lo}-${hi}`}
              onClick={() => {
                setMin(lo ? String(lo) : '');
                setMax(hi ? String(hi) : '');
                set({ minPrice: lo ? String(lo) : undefined, maxPrice: hi ? String(hi) : undefined });
              }}
              className="rounded-full border px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
            >
              {hi ? `${lo ? formatPrice(lo) : 'Under'} ${lo ? '–' : ''} ${formatPrice(hi)}` : `Over ${formatPrice(lo)}`}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Customer rating">
        <div className="space-y-1.5">
          {[4, 3, 2].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="rating"
                checked={rating === r}
                onChange={() => set({ rating: String(r) })}
                className="accent-[var(--primary)]"
              />
              {r} <Star className="size-3.5 fill-warning text-warning" /> &amp; above
            </label>
          ))}
          {rating > 0 && (
            <button onClick={() => set({ rating: undefined })} className="text-xs text-primary hover:underline">
              Clear
            </button>
          )}
        </div>
      </Section>

      {facets.brands.length > 0 && (
        <Section title="Brand">
          <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
            {facets.brands.map((b) => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={selectedBrands.includes(b.slug)} onChange={() => toggleBrand(b.slug)} className="accent-[var(--primary)]" />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => set({ inStock: e.target.checked ? 'true' : undefined })}
            className="accent-[var(--primary)]"
          />
          In stock only
        </label>
      </Section>
    </>
  );
}

/** Sidebar on desktop; slide-over drawer on mobile. */
export function Filters(props: { categories: Category[]; facets: ListingMeta['facets'] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { params, set } = useFilterParams();
  const activeCount = ['brands', 'minPrice', 'maxPrice', 'rating', 'inStock', 'category'].filter((k) => params.get(k)).length;

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-36 rounded-2xl border bg-card px-4">
          <div className="flex items-center justify-between border-b py-3">
            <span className="font-bold">Filters</span>
            {activeCount > 0 && (
              <button
                className="text-xs font-semibold text-primary"
                onClick={() => set({ brands: undefined, minPrice: undefined, maxPrice: undefined, rating: undefined, inStock: undefined, category: undefined })}
              >
                Clear all
              </button>
            )}
          </div>
          <FilterBody {...props} />
        </div>
      </aside>

      <Button variant="outline" size="sm" className="self-start lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal /> {t('product.filters')} {activeCount > 0 && `(${activeCount})`}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-auto bg-background px-4 shadow-2xl animate-fade-up">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background py-3">
              <span className="font-bold">Filters</span>
              <button onClick={() => setOpen(false)} aria-label="Close filters">
                <X />
              </button>
            </div>
            <FilterBody {...props} />
            <div className="sticky bottom-0 bg-background py-3">
              <Button className="w-full" onClick={() => setOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { set } = useFilterParams();
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>
        Previous
      </Button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button variant={p === page ? 'default' : 'ghost'} size="sm" onClick={() => set({ page: String(p) })} aria-current={p === page ? 'page' : undefined}>
            {p}
          </Button>
        </span>
      ))}
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => set({ page: String(page + 1) })}>
        Next
      </Button>
    </nav>
  );
}
