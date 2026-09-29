import type { Metadata } from 'next';
import Link from 'next/link';
import { serverFetch } from '@/lib/api';
import type { Category } from '@/lib/types';

export const metadata: Metadata = { title: 'All categories' };
export const revalidate = 300;

export default async function CategoriesPage() {
  // Tolerate the API being unreachable at build time; ISR fills the page on the next request.
  const categories = await serverFetch<Category[]>('/categories', undefined, 300)
    .then((r) => r.data)
    .catch(() => [] as Category[]);
  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl font-extrabold">All categories</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-card p-5">
            <Link href={`/products?category=${c.slug}`} className="text-lg font-bold hover:text-primary">
              {c.name}
            </Link>
            <p className="text-xs text-muted-foreground">{c._count?.products ?? 0} products</p>
            {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
            {c.children.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.children.map((s) => (
                  <li key={s.id}>
                    <Link href={`/products?category=${s.slug}`} className="rounded-full border px-3 py-1 text-xs hover:border-primary hover:text-primary">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
