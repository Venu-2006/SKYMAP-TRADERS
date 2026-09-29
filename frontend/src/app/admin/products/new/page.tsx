'use client';

import { PageHeader } from '@/components/admin/panel';
import { ProductForm } from '@/components/admin/product-form';

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Add product" />
      <ProductForm mode="admin" backHref="/admin/products" />
    </>
  );
}
