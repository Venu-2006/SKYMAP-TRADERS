'use client';

import { Fragment, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GitCompare, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { RatingPill } from '@/components/product/rating';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import type { ProductCard, SpecGroup } from '@/lib/types';
import { discountPercent, effectivePrice, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useShopStore } from '@/store/shop-store';

type CompareProduct = ProductCard & { specifications: SpecGroup[]; gstRate: string; shortDescription: string | null };

export default function ComparePage() {
  const { compare, toggleCompare, clearCompare } = useShopStore();
  const add = useCartStore((s) => s.add);
  const [items, setItems] = useState<CompareProduct[] | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const key = compare.join(',');
  useEffect(() => {
    if (!mounted) return;
    if (!key) return setItems([]);
    api<CompareProduct[]>('/products/compare', { query: { ids: key } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [key, mounted]);

  if (!mounted || items === null) return <Skeleton className="container-page my-8 h-96" />;

  if (!items.length) {
    return (
      <div className="container-page flex flex-col items-center gap-3 py-24 text-center">
        <GitCompare className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-extrabold">Compare products</h1>
        <p className="text-muted-foreground">Open any product and tap “Compare” to add up to 4 products side by side.</p>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  // Union of spec labels across products, grouped.
  const groups = new Map<string, Set<string>>();
  items.forEach((p) => p.specifications.forEach((g) => g.items.forEach((it) => (groups.get(g.group) ?? groups.set(g.group, new Set()).get(g.group)!).add(it.label))));
  const spec = (p: CompareProduct, group: string, label: string) => p.specifications.find((g) => g.group === group)?.items.find((i) => i.label === label)?.value ?? '—';

  const rows: [string, (p: CompareProduct) => React.ReactNode][] = [
    ['Price', (p) => <span className="font-bold">{formatPrice(effectivePrice(p))}</span>],
    ['MRP', (p) => <span className="text-muted-foreground line-through">{formatPrice(p.mrp)}</span>],
    ['Discount', (p) => `${discountPercent(p.mrp, effectivePrice(p))}%`],
    ['Rating', (p) => (p.ratingCount ? <RatingPill value={p.ratingAvg} count={p.ratingCount} /> : 'No ratings')],
    ['Brand', (p) => p.brand?.name ?? '—'],
    ['Category', (p) => p.category.name],
    ['GST', (p) => `${Number(p.gstRate)}%`],
    ['Availability', (p) => (p.stock > 0 ? <span className="text-success">In stock</span> : <span className="text-destructive">Out of stock</span>)],
  ];

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Compare products ({items.length})</h1>
        <Button variant="ghost" size="sm" onClick={clearCompare}>
          Clear all
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-40 p-4" />
              {items.map((p) => (
                <th key={p.id} className="relative p-4 text-left align-top font-normal">
                  <button className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted" aria-label={`Remove ${p.name}`} onClick={() => toggleCompare(p.id)}>
                    <X className="size-4" />
                  </button>
                  <Link href={`/products/${p.slug}`} className="block">
                    <div className="relative mb-3 aspect-square w-full max-w-40 overflow-hidden rounded-xl bg-muted">
                      {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="160px" className="object-cover" />}
                    </div>
                    <span className="line-clamp-2 font-semibold hover:text-primary">{p.name}</span>
                  </Link>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={p.stock < 1}
                    onClick={async () => {
                      const ok = await add({
                        productId: p.id,
                        slug: p.slug,
                        name: p.name,
                        image: p.images[0]?.url,
                        price: effectivePrice(p),
                        mrp: Number(p.mrp),
                        stock: p.stock,
                      });
                      if (ok) toast.success('Added to cart');
                    }}
                  >
                    <ShoppingCart /> Add to cart
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(([label, render]) => (
              <tr key={label}>
                <th className="bg-muted/40 p-4 text-left font-medium text-muted-foreground">{label}</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4">
                    {render(p)}
                  </td>
                ))}
              </tr>
            ))}
            {[...groups.entries()].map(([group, labels]) => (
              <Fragment key={group}>
                <tr>
                  <th colSpan={items.length + 1} className="bg-muted p-3 text-left text-xs font-bold uppercase tracking-wide">
                    {group}
                  </th>
                </tr>
                {[...labels].map((label) => (
                  <tr key={`${group}-${label}`}>
                    <th className="bg-muted/40 p-4 text-left font-medium text-muted-foreground">{label}</th>
                    {items.map((p) => (
                      <td key={p.id} className="p-4">
                        {spec(p, group, label)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
