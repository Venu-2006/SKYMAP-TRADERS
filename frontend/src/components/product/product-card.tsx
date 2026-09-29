'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductCard as Product } from '@/lib/types';
import { cn, discountPercent, effectivePrice, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useShopStore } from '@/store/shop-store';
import { Skeleton } from '@/components/ui/misc';
import { RatingPill } from './rating';
import { useT } from '@/lib/i18n';

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const t = useT();
  const add = useCartStore((s) => s.add);
  const price = effectivePrice(product);
  const off = discountPercent(product.mrp, price);
  const onFlash = price < Number(product.price);
  const [primary, hover] = product.images;
  const outOfStock = product.stock <= 0;

  const wishlisted = useShopStore((s) => s.wishlist.includes(product.id));
  const toggleWishlist = useShopStore((s) => s.toggleWishlist);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    const added = await add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: primary?.url,
      price,
      mrp: Number(product.mrp),
      stock: product.stock,
    });
    if (added) toast.success(t('product.addToCart'), { description: product.name });
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-xl',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {primary && (
          <Image
            src={primary.url}
            alt={primary.alt ?? product.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
            className={cn('object-cover transition duration-500 group-hover:scale-105', hover && 'group-hover:opacity-0')}
          />
        )}
        {hover && (
          <Image src={hover.url} alt="" fill sizes="20vw" className="object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {off > 0 && (
          <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{t('product.off', { percent: off })}</span>
        )}
          {onFlash && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-warning px-2 py-0.5 text-xs font-bold text-black">
              <Zap className="size-3 fill-current" /> Flash
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id).catch(() => toast.error('Could not update wishlist'));
          }}
          className={cn(
            'absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/90 shadow transition',
            wishlisted ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          )}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
        >
          <Heart className={cn('size-4', wishlisted && 'fill-primary text-primary')} />
        </button>
        {outOfStock && <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm font-semibold">{t('product.outOfStock')}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.brand && <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{product.brand.name}</span>}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <RatingPill value={product.ratingAvg} count={product.ratingCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-base font-bold">{formatPrice(price)}</span>
            {off > 0 && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</span>}
          </div>
          <button
            onClick={addToCart}
            disabled={outOfStock}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="size-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} className="animate-fade-up" />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
