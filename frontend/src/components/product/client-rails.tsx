'use client';

import { useEffect, useState } from 'react';
import { api, getSessionId } from '@/lib/api';
import type { ProductCard } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { ProductRail } from './product-rail';
import { useT } from '@/lib/i18n';

/** Records the view once the viewer's identity (token or anonymous session id) is known. */
export function ViewTracker({ slug }: { slug: string }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    const sid = getSessionId();
    api(`/products/${slug}/view`, { method: 'POST', headers: sid ? { 'X-Session-Id': sid } : {} }).catch(() => undefined);
  }, [slug, hydrated]);
  return null;
}

/** AI-powered "Recommended for you" rail — only renders for signed-in users with history. */
export function ForYouRail() {
  const t = useT();
  const { accessToken, user } = useAuthStore();
  const [items, setItems] = useState<ProductCard[]>([]);
  useEffect(() => {
    if (!accessToken) return setItems([]);
    api<ProductCard[]>('/products/recommended')
      .then((r) => setItems(r.data))
      .catch(() => undefined);
  }, [accessToken]);
  if (!user) return null;
  return <ProductRail title={`${t('home.forYou')}, ${user.name.split(' ')[0]}`} subtitle={t('home.forYouSub')} products={items} />;
}

/** Frequently bought together, mined from order co-occurrence. */
export function BoughtTogetherRail({ slug }: { slug: string }) {
  const t = useT();
  const [items, setItems] = useState<ProductCard[]>([]);
  useEffect(() => {
    api<ProductCard[]>(`/products/${slug}/bought-together`)
      .then((r) => setItems(r.data))
      .catch(() => undefined);
  }, [slug]);
  return <ProductRail title={t('product.boughtTogether')} subtitle={t('product.boughtTogetherSub')} products={items} />;
}
