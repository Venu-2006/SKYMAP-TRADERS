'use client';

import { use } from 'react';
import { PageHeader } from '@/components/admin/panel';
import { ProductForm } from '@/components/admin/product-form';

export default function SellerEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Edit product" />
      <ProductForm mode="seller" productId={id} backHref="/seller/products" />
    </>
  );
}
