'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, GitCompare, Heart, Minus, Plus, RotateCcw, Share2, ShoppingCart, Truck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import type { ProductDetail } from '@/lib/types';
import { discountPercent, effectivePrice, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useShopStore } from '@/store/shop-store';
import { useT } from '@/lib/i18n';

function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left <= 0) return null;
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <span className="font-mono tabular-nums">
      {parts[0] > 0 && `${parts[0]}d `}
      {parts.slice(1).map((n) => String(n).padStart(2, '0')).join(':')}
    </span>
  );
}

/** Price, quantity and buy actions on the product detail page. */
export function PurchasePanel({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const t = useT();
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(product.minOrderQty);
  const price = effectivePrice(product);
  const off = discountPercent(product.mrp, price);
  const onFlash = price < Number(product.price);
  const inStock = product.stock > 0;
  const gst = Number(product.gstRate);
  const basePrice = price / (1 + gst / 100);

  const wishlisted = useShopStore((s) => s.wishlist.includes(product.id));
  const comparing = useShopStore((s) => s.compare.includes(product.id));
  const { toggleWishlist, toggleCompare } = useShopStore.getState();

  const addToCart = () =>
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0]?.url,
        price,
        mrp: Number(product.mrp),
        stock: product.stock,
      },
      qty,
    );

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: product.name, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  return (
    <div className="space-y-5">
      {onFlash && product.flashSaleEndsAt && (
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-warning to-orange-400 px-4 py-2.5 text-sm font-semibold text-black">
          <span className="flex items-center gap-1.5">
            <Zap className="size-4 fill-current" /> Flash sale ends in
          </span>
          <Countdown until={product.flashSaleEndsAt} />
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-extrabold">{formatPrice(price)}</span>
          {off > 0 && (
            <>
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
              <Badge variant="success" className="text-sm">
                {off}% off
              </Badge>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Inclusive of {gst}% GST ({formatPrice(basePrice)} + {formatPrice(price - basePrice)} tax){product.hsnCode && ` · HSN ${product.hsnCode}`}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {inStock ? (
          <span className="font-semibold text-success">{product.stock <= 10 ? t('product.onlyLeft', { count: product.stock }) : t('product.inStock')}</span>
        ) : (
          <span className="font-semibold text-destructive">{t('product.outOfStock')}</span>
        )}
      </div>

      {inStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t('product.quantity')}</span>
          <div className="flex items-center rounded-lg border">
            <button className="grid size-9 place-items-center disabled:opacity-40" onClick={() => setQty((q) => q - 1)} disabled={qty <= product.minOrderQty} aria-label="Decrease quantity">
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button className="grid size-9 place-items-center disabled:opacity-40" onClick={() => setQty((q) => q + 1)} disabled={qty >= product.stock} aria-label="Increase quantity">
              <Plus className="size-4" />
            </button>
          </div>
          {product.minOrderQty > 1 && <span className="text-xs text-muted-foreground">Min. order {product.minOrderQty}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          variant="outline"
          disabled={!inStock}
          onClick={async () => {
            if (await addToCart()) toast.success(t('product.addToCart'), { action: { label: t('nav.cart'), onClick: () => router.push('/cart') } });
          }}
        >
          <ShoppingCart /> {t('product.addToCart')}
        </Button>
        <Button
          size="lg"
          disabled={!inStock}
          onClick={async () => {
            if (await addToCart()) router.push('/checkout');
          }}
        >
          <Zap /> {t('product.buyNow')}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlisted}>
          <Heart className={wishlisted ? 'fill-primary text-primary' : ''} /> {wishlisted ? 'Wishlisted' : 'Wishlist'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => toggleCompare(product.id)} aria-pressed={comparing}>
          <GitCompare className={comparing ? 'text-primary' : ''} /> {t('product.compare')}
        </Button>
        <Button variant="ghost" size="sm" onClick={share}>
          <Share2 /> {t('product.share')}
        </Button>
      </div>

      <ul className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <li className="flex items-center gap-2">
          <Truck className="size-5 text-primary" /> {t('product.freeDelivery')}
        </li>
        <li className="flex items-center gap-2">
          <RotateCcw className="size-5 text-primary" /> {t('product.returns')}
        </li>
        <li className="flex items-center gap-2">
          <BadgeCheck className="size-5 text-primary" /> {t('product.gstInvoice')}
        </li>
      </ul>
    </div>
  );
}
