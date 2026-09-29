'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductsTable } from '@/components/admin/products-table';

function Products() {
  return <ProductsTable mode="admin" initialStatus={useSearchParams().get('status') ?? undefined} />;
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}
