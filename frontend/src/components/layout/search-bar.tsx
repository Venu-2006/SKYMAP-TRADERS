'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Tag, TrendingUp, LayoutGrid } from 'lucide-react';
import { api } from '@/lib/api';
import type { Suggestions } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useT } from '@/lib/i18n';

type Option = { key: string; label: string; href: string; kind: 'query' | 'product' | 'category' | 'brand'; image?: string; price?: string };

/** Global search with debounced autocomplete and full keyboard navigation. */
export function SearchBar({ className, initial = '' }: { className?: string; initial?: string }) {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [data, setData] = useState<Suggestions | null>(null);
  const [trending, setTrending] = useState<string[]>([]);
  const debounced = useDebounce(q.trim(), 200);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<Suggestions>('/products/suggest', { query: { q: debounced } })
      .then((r) => !cancelled && setData(r.data))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const loadTrending = () => {
    if (trending.length) return;
    api<string[]>('/products/trending-searches').then((r) => setTrending(r.data)).catch(() => undefined);
  };

  const options: Option[] = data
    ? [
        ...data.queries.map((s) => ({ key: `q-${s}`, label: s, kind: 'query' as const, href: `/products?q=${encodeURIComponent(s)}` })),
        ...data.categories.map((c) => ({ key: `c-${c.slug}`, label: c.name, kind: 'category' as const, href: `/products?category=${c.slug}` })),
        ...data.brands.map((b) => ({ key: `b-${b.slug}`, label: b.name, kind: 'brand' as const, href: `/products?brands=${b.slug}` })),
        ...data.products.map((p) => ({
          key: `p-${p.id}`,
          label: p.name,
          kind: 'product' as const,
          href: `/products/${p.slug}`,
          image: p.images[0]?.url,
          price: p.price,
        })),
      ]
    : trending.map((s) => ({ key: `t-${s}`, label: s, kind: 'query' as const, href: `/products?q=${encodeURIComponent(s)}` }));

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].href);
    if (q.trim()) go(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const Icon = { query: TrendingUp, category: LayoutGrid, brand: Tag, product: Search };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <form onSubmit={submit} role="search">
        <div className="flex h-11 items-center rounded-xl border bg-card pl-3 shadow-sm transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              setOpen(true);
              loadTrending();
            }}
            onKeyDown={onKeyDown}
            placeholder={t('nav.searchPlaceholder')}
            className="h-full flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
            aria-controls="search-suggestions"
          />
          {loading && <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />}
          <button type="submit" className="h-full rounded-r-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t('nav.search')}
          </button>
        </div>
      </form>

      {open && options.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-fade-up"
        >
          {!data && <li className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('nav.trendingSearches')}</li>}
          {options.map((o, i) => {
            const I = Icon[o.kind];
            return (
              <li key={o.key} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(o.href)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm', i === active && 'bg-muted')}
                >
                  {o.image ? (
                    <Image src={o.image} alt="" width={36} height={36} className="size-9 rounded-md object-cover" />
                  ) : (
                    <I className="size-4 text-muted-foreground" />
                  )}
                  <span className="line-clamp-1 flex-1">{o.label}</span>
                  {o.kind !== 'product' && o.kind !== 'query' && <span className="text-xs capitalize text-muted-foreground">{o.kind}</span>}
                  {o.price && <span className="text-xs font-semibold">{formatPrice(o.price)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
