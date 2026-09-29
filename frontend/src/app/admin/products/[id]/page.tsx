'use client';

import { use } from 'react';
import { PageHeader } from '@/components/admin/panel';
import { ProductForm } from '@/components/admin/product-form';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Edit product" />
      <ProductForm mode="admin" productId={id} backHref="/admin/products" />
    </>
  );
}
