import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Filters, Pagination, SortSelect } from '@/components/product/filters';
import { ProductGrid } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { serverFetch } from '@/lib/api';
import type { Category, ListingMeta, ProductCard } from '@/lib/types';
import { T } from '@/components/t';

type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, category } = await searchParams;
  if (q) return { title: `Results for “${q}”`, robots: { index: false } };
  if (category) return { title: category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  return { title: 'All products' };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [listing, categories] = await Promise.all([
    serverFetch<ProductCard[], ListingMeta>(
      '/products',
      {
        q: sp.q,
        category: sp.category,
        brands: sp.brands,
        minPrice: sp.minPrice,
        maxPrice: sp.maxPrice,
        rating: sp.rating,
        inStock: sp.inStock,
        sort: sp.sort,
        page: sp.page,
      },
      30,
    ),
    serverFetch<Category[]>('/categories', undefined, 300),
  ]);
  const meta = listing.meta!;
  const activeCategory = categories.data.flatMap((c) => [c, ...c.children]).find((c) => c.slug === sp.category);
  const heading = sp.q ? `Results for “${sp.q}”` : (activeCategory?.name ?? 'All products');

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>{' '}
        / <span className="text-foreground">{heading}</span>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <Filters categories={categories.data} facets={meta.facets} />
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">{heading}</h1>
              <p className="text-sm text-muted-foreground">
                <T k="product.results" vars={{ count: meta.total.toLocaleString('en-IN') }} />
              </p>
            </div>
            <SortSelect />
          </div>

          {listing.data.length ? (
            <>
              <ProductGrid products={listing.data} />
              <Pagination page={meta.page} totalPages={meta.totalPages} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
              <SearchX className="size-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">
                  <T k="product.noResults" />
                </p>
                <p className="text-sm text-muted-foreground">
                  <T k="product.noResultsSub" />
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/products">
                  <T k="product.clearFilters" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
