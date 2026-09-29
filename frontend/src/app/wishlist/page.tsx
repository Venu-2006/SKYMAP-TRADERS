'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ProductCard } from '@/lib/types';
import { useShopStore } from '@/store/shop-store';

function Wishlist() {
  const [items, setItems] = useState<ProductCard[] | null>(null);
  const ids = useShopStore((s) => s.wishlist);

  useEffect(() => {
    api<ProductCard[]>('/cart/wishlist')
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, []);

  // Hide items un-hearted on this page without refetching.
  const visible = items?.filter((p) => ids.includes(p.id)) ?? null;

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-extrabold">
        My wishlist {visible && <span className="text-base font-medium text-muted-foreground">({visible.length})</span>}
      </h1>
      {visible === null ? (
        <ProductGridSkeleton count={5} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Heart className="size-12 text-muted-foreground" />
          <p className="font-semibold">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
          <Button asChild>
            <Link href="/products">Explore products</Link>
          </Button>
        </div>
      ) : (
        <ProductGrid products={visible} />
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <RequireAuth>
      <Wishlist />
    </RequireAuth>
  );
}
