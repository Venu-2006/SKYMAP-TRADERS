'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookmarkPlus, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { OrderSummary } from '@/components/cart/order-summary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { localSummary, useCartStore, type CartLine } from '@/store/cart-store';
import { useT } from '@/lib/i18n';

interface CouponOffer {
  code: string;
  description: string | null;
}

function Line({ line }: { line: CartLine }) {
  const t = useT();
  const { remove, setQuantity, toggleSaveForLater } = useCartStore.getState();
  const [busy, setBusy] = useState(false);
  const act = (fn: () => Promise<void>) => {
    setBusy(true);
    fn()
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className={cn('flex gap-4 p-4 transition', busy && 'opacity-60')}>
      <Link href={`/products/${line.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {line.image && <Image src={line.image} alt="" fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/products/${line.slug}`} className="line-clamp-2 font-medium hover:text-primary">
          {line.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="font-bold">{formatPrice(line.price)}</span>
          {line.mrp > line.price && <span className="text-xs text-muted-foreground line-through">{formatPrice(line.mrp)}</span>}
        </div>
        {line.available === false && <p className="text-xs font-semibold text-destructive">Only {line.stock} in stock — reduce quantity</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {!line.savedForLater && (
            <div className="flex items-center rounded-lg border">
              <button
                className="grid size-8 place-items-center disabled:opacity-40"
                disabled={busy || line.quantity <= 1}
                onClick={() => act(() => setQuantity(line.productId, line.quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
              <button
                className="grid size-8 place-items-center disabled:opacity-40"
                disabled={busy || line.quantity >= line.stock}
                onClick={() => act(() => setQuantity(line.productId, line.quantity + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(() => toggleSaveForLater(line.productId))}>
            <BookmarkPlus /> {t(line.savedForLater ? 'cart.moveToCart' : 'cart.saveForLater')}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} className="text-destructive" onClick={() => act(() => remove(line.productId))}>
            <Trash2 /> {t('cart.remove')}
          </Button>
        </div>
      </div>
      <div className="hidden text-right font-bold sm:block">{formatPrice(line.price * line.quantity)}</div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const t = useT();
  const signedIn = useAuthStore((s) => !!s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const { items, coupon, serverSummary, loading, applyCoupon, removeCoupon } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState('');
  const [offers, setOffers] = useState<CouponOffer[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (signedIn) api<CouponOffer[]>('/cart/coupons').then((r) => setOffers(r.data)).catch(() => undefined);
  }, [signedIn]);

  if (!mounted || !hydrated || (signedIn && loading && !items.length)) {
    return (
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const active = items.filter((i) => !i.savedForLater);
  const saved = items.filter((i) => i.savedForLater);
  const summary = signedIn && serverSummary ? serverSummary : localSummary(items);

  const submitCoupon = async (c: string) => {
    if (!c.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(c.trim());
      setCode('');
    } catch {
      /* toast shown by store */
    } finally {
      setApplying(false);
    }
  };

  if (!items.length) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag className="size-16 text-muted-foreground" strokeWidth={1.3} />
        <h1 className="text-2xl font-extrabold">{t('cart.empty')}</h1>
        <p className="text-muted-foreground">{t('cart.emptySub')}</p>
        <Button asChild size="lg">
          <Link href="/products">{t('cart.startShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-extrabold">
        {t('cart.title')} <span className="text-base font-medium text-muted-foreground">({summary.itemCount} items)</span>
      </h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {active.length > 0 ? (
            <div className="divide-y rounded-2xl border bg-card">
              {active.map((l) => (
                <Line key={l.productId} line={l} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No items in your cart. Move something from “Saved for later”.</p>
          )}

          {saved.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">
                {t('cart.savedForLater')} ({saved.length})
              </h2>
              <div className="divide-y rounded-2xl border bg-card">
                {saved.map((l) => (
                  <Line key={l.productId} line={l} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          {signedIn ? (
            <div className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="flex items-center gap-2 font-bold">
                <Tag className="size-4 text-primary" /> {t('cart.coupons')}
              </h2>
              {coupon ? (
                <div className={cn('flex items-center justify-between rounded-lg border border-dashed p-3', coupon.error ? 'border-destructive' : 'border-success')}>
                  <div>
                    <p className="font-mono font-bold">{coupon.code}</p>
                    <p className={cn('text-xs', coupon.error ? 'text-destructive' : 'text-success')}>{coupon.error ?? 'Applied'}</p>
                  </div>
                  <button onClick={() => removeCoupon()} aria-label="Remove coupon">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitCoupon(code);
                    }}
                  >
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('cart.couponPlaceholder')} className="uppercase" />
                    <Button type="submit" variant="secondary" loading={applying}>
                      {t('cart.apply')}
                    </Button>
                  </form>
                  {offers.length > 0 && (
                    <ul className="space-y-2">
                      {offers.map((o) => (
                        <li key={o.code} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
                          <span>
                            <span className="font-mono font-bold">{o.code}</span> — {o.description}
                          </span>
                          <button className="font-semibold text-primary" onClick={() => submitCoupon(o.code)}>
                            Apply
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="rounded-2xl border bg-card p-4 text-sm">
              <Link href="/login?next=/cart" className="font-semibold text-primary">
                Sign in
              </Link>{' '}
              to apply coupons and check out. Your cart will be saved.
            </p>
          )}

          <OrderSummary summary={summary}>
            <Button
              size="lg"
              className="w-full"
              disabled={!active.length || active.some((l) => l.available === false)}
              onClick={() => router.push(signedIn ? '/checkout' : '/login?next=/checkout')}
            >
              {t('cart.checkout')}
            </Button>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
