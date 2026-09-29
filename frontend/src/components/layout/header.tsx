'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { selectCartCount, useCartStore } from '@/store/cart-store';
import { SearchBar } from './search-bar';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { useT } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';

const NAV = [
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Industrial', slug: 'industrial-equipment' },
  { label: 'Electrical', slug: 'electrical-components' },
  { label: 'Safety', slug: 'safety-products' },
  { label: 'Tools & Hardware', slug: 'tools-hardware' },
  { label: 'Office Supplies', slug: 'office-supplies' },
  { label: 'Construction', slug: 'construction-materials' },
];

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="SKYMAP TRADERS home">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-orange-500 font-display text-lg font-extrabold text-white shadow-md">
        S
      </span>
      <span className="hidden font-display text-lg font-extrabold leading-none sm:block">
        SKYMAP<span className="text-primary"> TRADERS</span>
      </span>
    </Link>
  );
}

export function Header() {
  const t = useT();
  const count = useCartStore(selectCartCount);
  // Cart lives in localStorage — render the badge only after mount to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="bg-foreground py-1.5 text-center text-xs font-medium text-background">{t('nav.topBar')}</div>
      <div className="container-page flex h-16 items-center gap-3 md:gap-6">
        <Logo />
        <SearchBar className="hidden flex-1 md:block" />
        <nav className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" aria-label={t('nav.wishlist')}>
            <Link href="/wishlist">
              <Heart />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label={`Cart, ${count} items`} className="relative">
            <Link href="/cart">
              <ShoppingCart />
              {mounted && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </Button>
          <UserMenu />
        </nav>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchBar />
      </div>
      <nav className="border-t" aria-label="Categories">
        <ul className="container-page scrollbar-none flex gap-1 overflow-x-auto py-1.5 text-sm">
          {NAV.map((n) => (
            <li key={n.slug}>
              <Link
                href={`/products?category=${n.slug}`}
                className="block whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/categories" className="block whitespace-nowrap rounded-md px-3 py-1.5 font-semibold text-primary hover:bg-accent">
              {t('nav.allCategories')}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
