import { BadgeCheck, CreditCard, Headphones, Truck } from 'lucide-react';
import { CategoryGrid } from '@/components/home/category-grid';
import { FlashSale } from '@/components/home/flash-sale';
import { Hero, type Banner } from '@/components/home/hero';
import { Newsletter } from '@/components/home/newsletter';
import { Testimonials } from '@/components/home/testimonials';
import { ForYouRail } from '@/components/product/client-rails';
import { ProductRail } from '@/components/product/product-rail';
import { serverFetch } from '@/lib/api';
import type { Category, HomeSections, Review } from '@/lib/types';
import { T } from '@/components/t';

// Rebuild the home page at most once a minute.
export const revalidate = 60;

const TRUST = [
  { Icon: Truck, title: 'home.trust.delivery', sub: 'home.trust.deliverySub' },
  { Icon: BadgeCheck, title: 'home.trust.invoice', sub: 'home.trust.invoiceSub' },
  { Icon: CreditCard, title: 'home.trust.payments', sub: 'home.trust.paymentsSub' },
  { Icon: Headphones, title: 'home.trust.support', sub: 'home.trust.supportSub' },
] as const;

const EMPTY: HomeSections = { featured: [], trending: [], flashSale: [], bestSellers: [], newArrivals: [], forYou: [] };

/** Each section degrades independently so a single failing call never blanks the page. */
const safe = async <T,>(p: Promise<{ data: T }>, fallback: T) => {
  try {
    return (await p).data;
  } catch {
    return fallback;
  }
};

export default async function HomePage() {
  const [sections, categories, reviews, banners] = await Promise.all([
    safe(serverFetch<HomeSections>('/products/home'), EMPTY),
    safe(serverFetch<Category[]>('/categories', undefined, 300), []),
    safe(serverFetch<Review[]>('/reviews/latest', undefined, 600), []),
    safe(serverFetch<Banner[]>('/marketing/banners', { position: 'HERO' }, 300), []),
  ]);

  return (
    <>
      <Hero banners={banners} />

      <section className="container-page mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TRUST.map(({ Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <Icon className="size-7 shrink-0 text-primary" strokeWidth={1.6} />
            <div>
              <p className="text-sm font-semibold">
                <T k={title} />
              </p>
              <p className="text-xs text-muted-foreground">
                <T k={sub} />
              </p>
            </div>
          </div>
        ))}
      </section>

      <CategoryGrid categories={categories} />
      <FlashSale products={sections.flashSale} />
      <ForYouRail />
      <ProductRail title={<T k="home.featured" />} subtitle={<T k="home.featuredSub" />} products={sections.featured} href="/products?sort=relevance" />
      <ProductRail title={<T k="home.trending" />} subtitle={<T k="home.trendingSub" />} products={sections.trending} href="/products?sort=popular" />
      <ProductRail title={<T k="home.bestSellers" />} products={sections.bestSellers} href="/products?sort=popular" />
      <ProductRail title={<T k="home.newArrivals" />} products={sections.newArrivals} href="/products?sort=newest" />
      <Testimonials reviews={reviews} />
      <Newsletter />
    </>
  );
}
