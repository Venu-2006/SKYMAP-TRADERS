import { z } from 'zod';

const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean));

export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'popular', 'discount'] as const;

export const listProductsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(), // category slug (includes sub-categories)
    brands: csv.optional(), // brand slugs
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(1).max(5).optional(),
    inStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    sort: z.enum(SORTS).default('relevance'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(24),
  }),
});
export type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];

export const suggestSchema = z.object({ query: z.object({ q: z.string().trim().min(1).max(100) }) });

export const slugParamSchema = z.object({ params: z.object({ slug: z.string().min(1).max(200) }) });
export const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const specification = z.object({
  group: z.string().trim().min(1).max(60),
  items: z.array(z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(300) })).max(50),
});

const productBody = z
  .object({
    name: z.string().trim().min(3).max(200),
    sku: z.string().trim().toUpperCase().min(3).max(60),
    description: z.string().trim().min(10).max(20_000),
    shortDescription: z.string().trim().max(500).optional(),
    categoryId: z.string().cuid(),
    brandId: z.string().cuid().nullable().optional(),
    mrp: z.coerce.number().positive(),
    price: z.coerce.number().positive(),
    gstRate: z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v), 'GST must be 0, 5, 12, 18 or 28').default(18),
    hsnCode: z.string().trim().regex(/^\d{4,8}$/, 'HSN must be 4–8 digits').optional(),
    stock: z.coerce.number().int().min(0).default(0),
    lowStockAlert: z.coerce.number().int().min(0).default(5),
    minOrderQty: z.coerce.number().int().min(1).default(1),
    weightGrams: z.coerce.number().int().positive().optional(),
    specifications: z.array(specification).max(20).default([]),
    tags: z.array(z.string().trim().toLowerCase().max(40)).max(30).default([]),
    status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
    isFeatured: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    flashSalePrice: z.coerce.number().positive().nullable().optional(),
    flashSaleEndsAt: z.coerce.date().nullable().optional(),
    metaTitle: z.string().trim().max(70).optional(),
    metaDescription: z.string().trim().max(160).optional(),
    images: z
      .array(z.object({ url: z.string().url(), publicId: z.string().optional(), alt: z.string().max(200).optional() }))
      .max(10)
      .default([]),
  });

const priceRule = (b: { mrp?: number; price?: number }) => b.mrp === undefined || b.price === undefined || b.price <= b.mrp;

export const createProductSchema = z.object({
  body: productBody.refine(priceRule, { message: 'Selling price cannot exceed MRP', path: ['price'] }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: productBody.partial().refine(priceRule, { message: 'Selling price cannot exceed MRP', path: ['price'] }),
});

export const stockSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    change: z.coerce.number().int().refine((v) => v !== 0, 'Change cannot be zero'),
    reason: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN']),
    reference: z.string().max(100).optional(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
