'use client';

import { PageHeader } from '@/components/admin/panel';
import { ProductForm } from '@/components/admin/product-form';

export default function SellerNewProductPage() {
  return (
    <>
      <PageHeader title="Add product" description="New listings go live after a quick review by our team." />
      <ProductForm mode="seller" backHref="/seller/products" />
    </>
  );
}
