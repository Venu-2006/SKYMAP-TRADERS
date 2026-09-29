'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { ImageUploader, type UploadedImage } from './image-uploader';

const schema = z
  .object({
    name: z.string().trim().min(3, 'At least 3 characters').max(200),
    sku: z.string().trim().min(3, 'At least 3 characters').max(60),
    shortDescription: z.string().trim().max(500).optional(),
    description: z.string().trim().min(10, 'At least 10 characters'),
    categoryId: z.string().min(1, 'Select a category'),
    brandId: z.string().optional(),
    mrp: z.coerce.number().positive('Enter the MRP'),
    price: z.coerce.number().positive('Enter the selling price'),
    gstRate: z.coerce.number(),
    hsnCode: z.string().trim().regex(/^(\d{4,8})?$/, '4–8 digits').optional(),
    stock: z.coerce.number().int().min(0),
    lowStockAlert: z.coerce.number().int().min(0),
    minOrderQty: z.coerce.number().int().min(1),
    tags: z.string().optional(),
    status: z.string(),
    isFeatured: z.boolean(),
    isTrending: z.boolean(),
    flashSalePrice: z.string().optional(),
    flashSaleEndsAt: z.string().optional(),
    specifications: z.array(z.object({ group: z.string().trim().min(1, 'Group name'), label: z.string().trim().min(1, 'Label'), value: z.string().trim().min(1, 'Value') })),
  })
  .refine((v) => v.price <= v.mrp, { path: ['price'], message: 'Price cannot exceed MRP' });
type Values = z.infer<typeof schema>;

interface Option {
  id: string;
  name: string;
}

interface ProductRecord extends Omit<Values, 'specifications' | 'tags' | 'mrp' | 'price' | 'gstRate' | 'flashSalePrice' | 'flashSaleEndsAt'> {
  id: string;
  mrp: string;
  price: string;
  gstRate: string;
  flashSalePrice: string | null;
  flashSaleEndsAt: string | null;
  tags: string[];
  specifications: { group: string; items: { label: string; value: string }[] }[];
  images: UploadedImage[];
}

/** Create / edit product form used by both the admin panel and the seller portal. */
export function ProductForm({ productId, mode, backHref }: { productId?: string; mode: 'admin' | 'seller'; backHref: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loaded, setLoaded] = useState(!productId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      gstRate: 18,
      stock: 0,
      lowStockAlert: 5,
      minOrderQty: 1,
      status: mode === 'admin' ? 'ACTIVE' : 'PENDING_APPROVAL',
      isFeatured: false,
      isTrending: false,
      specifications: [],
    },
  });
  const specs = useFieldArray({ control, name: 'specifications' });

  useEffect(() => {
    api<Option[]>(mode === 'admin' ? '/categories/admin/all' : '/categories')
      .then((r) => {
        // Flatten the public tree for sellers.
        const flat: Option[] = [];
        const walk = (list: (Option & { children?: Option[] })[], prefix = '') =>
          list.forEach((c) => {
            flat.push({ id: c.id, name: prefix + c.name });
            if (c.children) walk(c.children, `${prefix}${c.name} › `);
          });
        walk(r.data);
        setCategories(flat);
      })
      .catch(() => undefined);
    api<Option[]>('/brands').then((r) => setBrands(r.data)).catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    if (!productId) return;
    api<ProductRecord>(`/products/manage/${productId}`)
      .then(({ data: p }) => {
        reset({
          name: p.name,
          sku: p.sku,
          shortDescription: p.shortDescription ?? '',
          description: p.description,
          categoryId: p.categoryId,
          brandId: p.brandId ?? '',
          mrp: Number(p.mrp),
          price: Number(p.price),
          gstRate: Number(p.gstRate),
          hsnCode: p.hsnCode ?? '',
          stock: p.stock,
          lowStockAlert: p.lowStockAlert,
          minOrderQty: p.minOrderQty,
          tags: p.tags.join(', '),
          status: p.status,
          isFeatured: p.isFeatured,
          isTrending: p.isTrending,
          flashSalePrice: p.flashSalePrice ? String(Number(p.flashSalePrice)) : '',
          flashSaleEndsAt: p.flashSaleEndsAt ? p.flashSaleEndsAt.slice(0, 16) : '',
          specifications: p.specifications.flatMap((g) => g.items.map((i) => ({ group: g.group, label: i.label, value: i.value }))),
        });
        setImages(p.images.map((i) => ({ url: i.url, publicId: i.publicId ?? undefined, alt: i.alt ?? undefined })));
        setLoaded(true);
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Could not load product'));
  }, [productId, reset]);

  const onSubmit = async (v: Values) => {
    if (!images.length) return toast.error('Add at least one product image');
    const grouped = new Map<string, { label: string; value: string }[]>();
    v.specifications.forEach((s) => grouped.set(s.group, [...(grouped.get(s.group) ?? []), { label: s.label, value: s.value }]));
    const body = {
      name: v.name,
      sku: v.sku,
      shortDescription: v.shortDescription || undefined,
      description: v.description,
      categoryId: v.categoryId,
      brandId: v.brandId || null,
      mrp: v.mrp,
      price: v.price,
      gstRate: v.gstRate,
      hsnCode: v.hsnCode || undefined,
      stock: v.stock,
      lowStockAlert: v.lowStockAlert,
      minOrderQty: v.minOrderQty,
      tags: (v.tags ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      status: v.status,
      ...(mode === 'admin' ? { isFeatured: v.isFeatured, isTrending: v.isTrending } : {}),
      flashSalePrice: v.flashSalePrice ? Number(v.flashSalePrice) : null,
      flashSaleEndsAt: v.flashSaleEndsAt ? new Date(v.flashSaleEndsAt).toISOString() : null,
      specifications: [...grouped.entries()].map(([group, items]) => ({ group, items })),
      images: images.map((i) => ({ url: i.url, publicId: i.publicId, alt: v.name })),
    };
    try {
      if (productId) await api(`/products/manage/${productId}`, { method: 'PATCH', body });
      else await api('/products/manage', { method: 'POST', body });
      toast.success(productId ? 'Product updated' : mode === 'seller' ? 'Product submitted for approval' : 'Product created');
      router.push(backHref);
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.details?.[0] ? `${e.details[0].path}: ${e.details[0].message}` : e.message) : 'Could not save');
    }
  };

  if (!loaded) return <Skeleton className="h-[600px]" />;

  const card = 'space-y-4 rounded-2xl border bg-card p-5';
  const sel = 'h-10 w-full rounded-lg border bg-card px-3 text-sm';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[1fr_340px]" noValidate>
      <div className="space-y-5">
        <section className={card}>
          <h2 className="font-bold">Basic information</h2>
          <FormField label="Product name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="SKU" htmlFor="sku" error={errors.sku?.message}>
              <Input id="sku" className="uppercase" {...register('sku')} />
            </FormField>
            <FormField label="Tags (comma separated)" htmlFor="tags">
              <Input id="tags" placeholder="drill, power tool" {...register('tags')} />
            </FormField>
          </div>
          <FormField label="Short description" htmlFor="shortDescription" error={errors.shortDescription?.message}>
            <Input id="shortDescription" {...register('shortDescription')} />
          </FormField>
          <FormField label="Full description" htmlFor="description" error={errors.description?.message}>
            <textarea id="description" rows={7} className="w-full rounded-lg border bg-card p-3 text-sm" {...register('description')} />
          </FormField>
        </section>

        <section className={card}>
          <h2 className="font-bold">Images</h2>
          <ImageUploader value={images} onChange={setImages} />
        </section>

        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Specifications</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => specs.append({ group: specs.fields.at(-1)?.group ?? 'General', label: '', value: '' })}>
              <Plus /> Add row
            </Button>
          </div>
          {specs.fields.length === 0 && <p className="text-sm text-muted-foreground">e.g. General → Power → 500 W</p>}
          {specs.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
              <Input placeholder="Group" aria-label="Spec group" {...register(`specifications.${i}.group`)} />
              <Input placeholder="Label" aria-label="Spec label" {...register(`specifications.${i}.label`)} />
              <Input placeholder="Value" aria-label="Spec value" {...register(`specifications.${i}.value`)} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove row" onClick={() => specs.remove(i)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </section>
      </div>

      <div className="space-y-5">
        <section className={card}>
          <h2 className="font-bold">Organisation</h2>
          <FormField label="Status" htmlFor="status">
            <select id="status" className={sel} {...register('status')}>
              {mode === 'admin' ? (
                <>
                  <option value="ACTIVE">Active (live)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_APPROVAL">Pending approval</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="REJECTED">Rejected</option>
                </>
              ) : (
                <>
                  <option value="PENDING_APPROVAL">Submit for approval</option>
                  <option value="DRAFT">Save as draft</option>
                  <option value="INACTIVE">Inactive</option>
                </>
              )}
            </select>
          </FormField>
          <FormField label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
            <select id="categoryId" className={sel} {...register('categoryId')}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Brand" htmlFor="brandId">
            <select id="brandId" className={sel} {...register('brandId')}>
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          {mode === 'admin' && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" {...register('isFeatured')} className="accent-[var(--primary)]" /> Featured
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" {...register('isTrending')} className="accent-[var(--primary)]" /> Trending
              </label>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className="font-bold">Pricing &amp; tax</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="MRP (₹)" htmlFor="mrp" error={errors.mrp?.message}>
              <Input id="mrp" type="number" step="0.01" {...register('mrp')} />
            </FormField>
            <FormField label="Selling price (₹)" htmlFor="price" error={errors.price?.message}>
              <Input id="price" type="number" step="0.01" {...register('price')} />
            </FormField>
            <FormField label="GST rate" htmlFor="gstRate">
              <select id="gstRate" className={sel} {...register('gstRate')}>
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="HSN code" htmlFor="hsnCode" error={errors.hsnCode?.message}>
              <Input id="hsnCode" inputMode="numeric" {...register('hsnCode')} />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">Prices include GST.</p>
          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <FormField label="Flash sale price" htmlFor="flashSalePrice">
              <Input id="flashSalePrice" type="number" step="0.01" placeholder="Optional" {...register('flashSalePrice')} />
            </FormField>
            <FormField label="Flash sale ends" htmlFor="flashSaleEndsAt">
              <Input id="flashSaleEndsAt" type="datetime-local" {...register('flashSaleEndsAt')} />
            </FormField>
          </div>
        </section>

        <section className={card}>
          <h2 className="font-bold">Inventory</h2>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Stock" htmlFor="stock" error={errors.stock?.message}>
              <Input id="stock" type="number" {...register('stock')} />
            </FormField>
            <FormField label="Low alert" htmlFor="lowStockAlert">
              <Input id="lowStockAlert" type="number" {...register('lowStockAlert')} />
            </FormField>
            <FormField label="Min. qty" htmlFor="minOrderQty">
              <Input id="minOrderQty" type="number" {...register('minOrderQty')} />
            </FormField>
          </div>
        </section>

        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1" loading={isSubmitting}>
            {productId ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => router.push(backHref)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
