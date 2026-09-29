'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import type { ProductCard } from '@/lib/types';
import { ProductRail } from '@/components/product/product-rail';
import { useT } from '@/lib/i18n';

function useCountdown(target?: string) {
  const [now, setNow] = useState<number | null>(null); // null on server to avoid hydration mismatch
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target || now === null) return null;
  const s = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));
}

export function FlashSale({ products }: { products: ProductCard[] }) {
  // Products are sorted by soonest end — the first one drives the timer.
  const t = useT();
  const parts = useCountdown(products[0]?.flashSaleEndsAt ?? undefined);
  if (!products.length) return null;
  return (
    <div className="bg-gradient-to-b from-accent/60 to-transparent">
      <ProductRail
        title={t('home.flashSale')}
        subtitle={t('home.flashSaleSub')}
        products={products}
        accessory={
          parts && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-background">
              <Zap className="size-3.5 fill-warning text-warning" /> {t('home.endsIn')} {parts.join(':')}
            </span>
          )
        }
      />
    </div>
  );
}
