import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Store } from 'lucide-react';
import { BoughtTogetherRail, ViewTracker } from '@/components/product/client-rails';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductRail } from '@/components/product/product-rail';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { RatingPill } from '@/components/product/rating';
import { ReviewsSection } from '@/components/product/reviews-section';
import { Badge } from '@/components/ui/misc';
import { ApiError, serverFetch } from '@/lib/api';
import type { ProductCard, ProductDetail } from '@/lib/types';
import { effectivePrice } from '@/lib/utils';
import { T } from '@/components/t';

type Params = Promise<{ slug: string }>;

async function getProduct(slug: string) {
  try {
    return (await serverFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, undefined, 60)).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  const description = p.metaDescription ?? p.shortDescription ?? p.description.slice(0, 160);
  return {
    title: p.metaTitle ?? p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images.slice(0, 1).map((i) => ({ url: i.url })) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const { similar, related } = (await serverFetch<{ similar: ProductCard[]; related: ProductCard[] }>(`/products/${slug}/similar`, undefined, 300)).data;

  // Structured data for Google Shopping rich results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    description: product.shortDescription ?? product.description.slice(0, 300),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    aggregateRating: product.ratingCount ? { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: effectivePrice(product),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const crumbs = [
    { name: 'Home', href: '/' },
    ...(product.category.parent ? [{ name: product.category.parent.name, href: `/products?category=${product.category.parent.slug}` }] : []),
    { name: product.category.name, href: `/products?category=${product.category.slug}` },
  ];

  return (
    <div className="pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ViewTracker slug={product.slug} />

      <div className="container-page py-6">
        <nav className="mb-5 flex flex-wrap gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.href}>
              <Link href={c.href} className="hover:text-primary">
                {c.name}
              </Link>{' '}
              /
            </span>
          ))}
          <span className="line-clamp-1 text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              {product.brand && (
                <Link href={`/products?brands=${product.brand.slug}`} className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline">
                  {product.brand.name}
                </Link>
              )}
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <a href="#reviews">
                  <RatingPill value={product.ratingAvg} count={product.ratingCount} />
                </a>
                {product.soldCount > 50 && <Badge variant="secondary">{product.soldCount.toLocaleString('en-IN')}+ sold</Badge>}
                <span className="text-muted-foreground">SKU: {product.sku}</span>
              </div>
            </div>

            {product.shortDescription && <p className="text-muted-foreground">{product.shortDescription}</p>}

            <PurchasePanel product={product} />

            {product.seller && (
              <div className="flex items-center gap-3 rounded-xl border p-4 text-sm">
                <Store className="size-5 text-muted-foreground" />
                <span>
                  Sold by <strong>{product.seller.businessName}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_380px]">
          <section>
            <h2 className="mb-4 text-xl font-extrabold">
              <T k="product.description" />
            </h2>
            <div className="whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</div>
          </section>
          {product.specifications.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-extrabold">
                <T k="product.specifications" />
              </h2>
              <div className="overflow-hidden rounded-xl border">
                {product.specifications.map((g) => (
                  <div key={g.group}>
                    <h3 className="bg-muted px-4 py-2 text-sm font-bold">{g.group}</h3>
                    <dl className="divide-y">
                      {g.items.map((it) => (
                        <div key={it.label} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                          <dt className="text-muted-foreground">{it.label}</dt>
                          <dd className="font-medium">{it.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <BoughtTogetherRail slug={product.slug} />
      <ProductRail title={<T k="product.similar" />} products={similar} href={`/products?category=${product.category.slug}`} />

      <div className="container-page py-10">
        <ReviewsSection productId={product.id} ratingAvg={product.ratingAvg} ratingCount={product.ratingCount} />
      </div>

      <ProductRail title={<T k="product.related" />} products={related} />
    </div>
  );
}
