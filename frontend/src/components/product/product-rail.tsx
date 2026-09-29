'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductCard as Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProductCard } from './product-card';
import { useT } from '@/lib/i18n';

/** Horizontally scrolling product row with arrow controls (snap-scroll on touch). */
export function ProductRail({
  title,
  subtitle,
  products,
  href,
  accessory,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  products: Product[];
  href?: string;
  accessory?: React.ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  if (!products.length) return null;

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
            {accessory}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {href && (
            <Link href={href} className="text-sm font-semibold text-primary hover:underline">
              {t('home.viewAll')}
            </Link>
          )}
          <Button variant="outline" size="icon" className="hidden size-9 sm:inline-flex" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="hidden size-9 sm:inline-flex" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[18.5%]" />
        ))}
      </div>
    </section>
  );
}
