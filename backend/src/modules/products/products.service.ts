import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { prisma } from '../../lib/prisma';
import { deleteImage, uploadBuffer } from '../../lib/cloudinary';
import { ApiError } from '../../utils/ApiError';
import { pageMeta, paginate } from '../../utils/http';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.schema';

/** Compact projection used by every product card on the storefront. */
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  mrp: true,
  price: true,
  flashSalePrice: true,
  flashSaleEndsAt: true,
  ratingAvg: true,
  ratingCount: true,
  stock: true,
  isFeatured: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' }, take: 2 },
} satisfies Prisma.ProductSelect;

const ACTIVE: Prisma.ProductWhereInput = { status: 'ACTIVE' };

const SORT_MAP: Record<ListProductsQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  relevance: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  popular: [{ soldCount: 'desc' }, { viewCount: 'desc' }],
  discount: [{ mrp: 'desc' }], // refined in-memory below
};

/** Collects a category and all of its descendants (categories are shallow, so a BFS is cheap). */
async function categoryWithDescendants(slug: string) {
  const root = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!root) return [];
  const ids = [root.id];
  let frontier = [root.id];
  while (frontier.length) {
    const children = await prisma.category.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

function searchWhere(q: string): Prisma.ProductWhereInput {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  // Every term must match somewhere (name, SKU, brand, category, or tag).
  return {
    AND: terms.map((t) => ({
      OR: [
        { name: { contains: t, mode: 'insensitive' } },
        { sku: { contains: t, mode: 'insensitive' } },
        { tags: { has: t } },
        { brand: { name: { contains: t, mode: 'insensitive' } } },
        { category: { name: { contains: t, mode: 'insensitive' } } },
      ],
    })),
  };
}

const uniqueSlug = async (name: string, excludeId?: string) => {
  const base = slugify(name, { lower: true, strict: true }).slice(0, 80);
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
};

export interface Actor {
  id: string;
  role: string;
}

/** Resolves the seller profile for SELLER actors; admins act on any product. */
async function sellerScope(actor: Actor) {
  if (actor.role !== 'SELLER') return undefined;
  const seller = await prisma.seller.findUnique({ where: { userId: actor.id } });
  if (!seller || seller.status !== 'APPROVED') throw ApiError.forbidden('Your seller account is not approved yet');
  return seller;
}

async function assertCanEdit(actor: Actor, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');
  const seller = await sellerScope(actor);
  if (seller && product.sellerId !== seller.id) throw ApiError.forbidden('You can only manage your own products');
  return { product, seller };
}

export const productsService = {
  async list(query: ListProductsQuery, userId?: string) {
    const pg = paginate(query.page, query.limit);
    const where: Prisma.ProductWhereInput = { AND: [ACTIVE] };
    const and = where.AND as Prisma.ProductWhereInput[];

    if (query.q) and.push(searchWhere(query.q));
    if (query.category) and.push({ categoryId: { in: await categoryWithDescendants(query.category) } });
    if (query.brands?.length) and.push({ brand: { slug: { in: query.brands } } });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      and.push({ price: { gte: query.minPrice, lte: query.maxPrice } });
    }
    if (query.rating) and.push({ ratingAvg: { gte: query.rating } });
    if (query.inStock) and.push({ stock: { gt: 0 } });

    // Facets ignore the brand/price filters themselves so users can widen them again.
    const facetWhere: Prisma.ProductWhereInput = {
      AND: and.filter((c) => !('brand' in c) && !('price' in c)),
    };

    const [items, total, brandGroups, priceAgg] = await Promise.all([
      prisma.product.findMany({
        where,
        select: productCardSelect,
        orderBy: SORT_MAP[query.sort],
        skip: pg.skip,
        take: pg.limit,
      }),
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ['brandId'], where: facetWhere, _count: { _all: true } }),
      prisma.product.aggregate({ where: facetWhere, _min: { price: true }, _max: { price: true } }),
    ]);

    const brandIds = brandGroups.map((b) => b.brandId).filter((id): id is string => !!id);
    const brands = await prisma.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, slug: true } });
    const brandFacets = brands
      .map((b) => ({ ...b, count: brandGroups.find((g) => g.brandId === b.id)?._count._all ?? 0 }))
      .sort((a, b) => b.count - a.count);

    if (query.sort === 'discount') {
      const pct = (p: (typeof items)[number]) => 1 - Number(p.price) / Number(p.mrp);
      items.sort((a, b) => pct(b) - pct(a));
    }

    // Log searches for "trending searches" and smart suggestions.
    if (query.q && pg.page === 1) {
      prisma.searchQuery.create({ data: { query: query.q.toLowerCase(), userId, resultCount: total } }).catch(() => undefined);
    }

    return {
      items,
      meta: pageMeta(pg, total),
      facets: {
        brands: brandFacets,
        price: { min: Number(priceAgg._min.price ?? 0), max: Number(priceAgg._max.price ?? 0) },
      },
    };
  },

  /** Autocomplete: matching products, categories, brands and popular past queries. */
  async suggest(q: string) {
    const contains = { contains: q, mode: 'insensitive' as const };
    const [products, categories, brands, popular] = await Promise.all([
      prisma.product.findMany({
        where: { ...ACTIVE, OR: [{ name: contains }, { tags: { has: q.toLowerCase() } }] },
        select: { id: true, name: true, slug: true, price: true, images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } } },
        orderBy: { soldCount: 'desc' },
        take: 6,
      }),
      prisma.category.findMany({ where: { isActive: true, name: contains }, select: { name: true, slug: true }, take: 4 }),
      prisma.brand.findMany({ where: { name: contains }, select: { name: true, slug: true }, take: 4 }),
      prisma.searchQuery.groupBy({
        by: ['query'],
        where: { query: { startsWith: q.toLowerCase() }, resultCount: { gt: 0 } },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 5,
      }),
    ]);
    return { products, categories, brands, queries: popular.map((p) => p.query) };
  },

  async trendingSearches() {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const rows = await prisma.searchQuery.groupBy({
      by: ['query'],
      where: { createdAt: { gte: since }, resultCount: { gt: 0 } },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 8,
    });
    return rows.map((r) => r.query);
  },

  /** All storefront home rails in a single round-trip. */
  async homeSections(userId?: string) {
    const now = new Date();
    const take = 12;
    const [featured, trending, flashSale, bestSellers, newArrivals, forYou] = await Promise.all([
      prisma.product.findMany({ where: { ...ACTIVE, isFeatured: true }, select: productCardSelect, take, orderBy: { updatedAt: 'desc' } }),
      prisma.product.findMany({ where: { ...ACTIVE, isTrending: true }, select: productCardSelect, take, orderBy: { viewCount: 'desc' } }),
      prisma.product.findMany({
        where: { ...ACTIVE, flashSalePrice: { not: null }, flashSaleEndsAt: { gt: now } },
        select: productCardSelect,
        take,
        orderBy: { flashSaleEndsAt: 'asc' },
      }),
      prisma.product.findMany({ where: ACTIVE, select: productCardSelect, take, orderBy: { soldCount: 'desc' } }),
      prisma.product.findMany({ where: ACTIVE, select: productCardSelect, take, orderBy: { createdAt: 'desc' } }),
      userId ? this.recommendedFor(userId, take) : Promise.resolve([]),
    ]);
    return { featured, trending, flashSale, bestSellers, newArrivals, forYou };
  },

  /**
   * Personalized recommendations: products from the categories the user
   * viewed most recently, excluding what they've already viewed.
   */
  async recommendedFor(userId: string, take = 12) {
    const views = await prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { productId: true, product: { select: { categoryId: true } } },
    });
    if (!views.length) return [];
    const weight = new Map<string, number>();
    views.forEach((v, i) => weight.set(v.product.categoryId, (weight.get(v.product.categoryId) ?? 0) + (50 - i)));
    const topCategories = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
    return prisma.product.findMany({
      where: { ...ACTIVE, categoryId: { in: topCategories }, id: { notIn: views.map((v) => v.productId) } },
      select: productCardSelect,
      orderBy: [{ ratingAvg: 'desc' }, { soldCount: 'desc' }],
      take,
    });
  },

  async getBySlug(slug: string) {
    const product = await prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        brand: true,
        category: { include: { parent: { select: { name: true, slug: true } } } },
        seller: { select: { businessName: true, slug: true, rating: true } },
      },
    });
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  /**
   * Records a product view for popularity and personalization. Called by the
   * client (the detail page itself is server-rendered and cached).
   * Repeat views by the same viewer within 30 minutes are ignored.
   */
  async trackView(slug: string, viewer: { userId?: string; sessionId?: string }) {
    if (!viewer.userId && !viewer.sessionId) return;
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw ApiError.notFound('Product not found');
    const recent = await prisma.productView.findFirst({
      where: {
        productId: product.id,
        createdAt: { gte: new Date(Date.now() - 30 * 60_000) },
        ...(viewer.userId ? { userId: viewer.userId } : { sessionId: viewer.sessionId }),
      },
      select: { id: true },
    });
    if (recent) return;
    await prisma.$transaction([
      prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }),
      prisma.productView.create({ data: { productId: product.id, userId: viewer.userId, sessionId: viewer.sessionId?.slice(0, 64) } }),
    ]);
  },

  /** Similar = same category, close price. Related = same brand or overlapping tags. */
  async similarAndRelated(slug: string) {
    const p = await prisma.product.findUnique({ where: { slug }, select: { id: true, categoryId: true, brandId: true, price: true, tags: true } });
    if (!p) throw ApiError.notFound('Product not found');
    const price = Number(p.price);
    const [similar, related] = await Promise.all([
      prisma.product.findMany({
        where: { ...ACTIVE, id: { not: p.id }, categoryId: p.categoryId, price: { gte: price * 0.6, lte: price * 1.4 } },
        select: productCardSelect,
        orderBy: { ratingAvg: 'desc' },
        take: 12,
      }),
      prisma.product.findMany({
        where: {
          ...ACTIVE,
          id: { not: p.id },
          categoryId: { not: p.categoryId },
          OR: [...(p.brandId ? [{ brandId: p.brandId }] : []), { tags: { hasSome: p.tags } }],
        },
        select: productCardSelect,
        orderBy: { soldCount: 'desc' },
        take: 12,
      }),
    ]);
    return { similar, related };
  },

  /** Frequently bought together: products co-occurring in the same orders, ranked by frequency. */
  async frequentlyBoughtTogether(slug: string) {
    const p = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!p) throw ApiError.notFound('Product not found');
    const rows = await prisma.$queryRaw<{ productId: string; freq: bigint }[]>`
      SELECT oi2."productId", COUNT(*) AS freq
      FROM "OrderItem" oi1
      JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi2."productId" <> oi1."productId"
      WHERE oi1."productId" = ${p.id}
      GROUP BY oi2."productId"
      ORDER BY freq DESC
      LIMIT 4`;
    if (!rows.length) return [];
    const products = await prisma.product.findMany({
      where: { ...ACTIVE, id: { in: rows.map((r) => r.productId) } },
      select: productCardSelect,
    });
    return rows.map((r) => products.find((x) => x.id === r.productId)).filter(Boolean);
  },

  // ───────────── Admin / seller management ─────────────

  async adminList(actor: Actor, query: ListProductsQuery & { status?: string }) {
    const seller = await sellerScope(actor);
    const pg = paginate(query.page, query.limit);
    const where: Prisma.ProductWhereInput = {
      ...(seller ? { sellerId: seller.id } : {}),
      ...(query.q ? searchWhere(query.q) : {}),
      ...(query.status ? { status: query.status as Prisma.EnumProductStatusFilter['equals'] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, category: { select: { name: true } }, brand: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, meta: pageMeta(pg, total) };
  },

  async create(actor: Actor, input: CreateProductInput) {
    const seller = await sellerScope(actor);
    const { images, specifications, ...data } = input;
    return prisma.product.create({
      data: {
        ...data,
        specifications: specifications as Prisma.InputJsonValue,
        slug: await uniqueSlug(data.name),
        sellerId: seller?.id,
        // Seller listings require admin approval; they may only save drafts or submit.
        status: seller ? (data.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL') : (data.status ?? 'ACTIVE'),
        isFeatured: seller ? false : data.isFeatured,
        isTrending: seller ? false : data.isTrending,
        images: { create: images.map((img, i) => ({ ...img, sortOrder: i })) },
        inventoryLogs: data.stock ? { create: { change: data.stock, reason: 'RESTOCK', reference: 'initial' } } : undefined,
      },
      include: { images: true },
    });
  },

  async update(actor: Actor, id: string, input: UpdateProductInput) {
    const { product, seller } = await assertCanEdit(actor, id);
    const { images, specifications, stock, ...data } = input;

    if (seller) {
      delete data.isFeatured;
      delete data.isTrending;
      if (data.status && !['DRAFT', 'PENDING_APPROVAL', 'INACTIVE'].includes(data.status)) delete data.status;
    }

    return prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: images.map((img, i) => ({ ...img, productId: id, sortOrder: i })) });
      }
      if (stock !== undefined && stock !== product.stock) {
        await tx.inventoryLog.create({ data: { productId: id, change: stock - product.stock, reason: 'ADJUSTMENT' } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          ...(stock !== undefined ? { stock } : {}),
          ...(specifications ? { specifications: specifications as Prisma.InputJsonValue } : {}),
          ...(data.name && data.name !== product.name ? { slug: await uniqueSlug(data.name, id) } : {}),
        },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  },

  async remove(actor: Actor, id: string) {
    await assertCanEdit(actor, id);
    const ordered = await prisma.orderItem.count({ where: { productId: id } });
    if (ordered) {
      // Keep order history intact: archive instead of deleting.
      await prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
      return { archived: true };
    }
    const images = await prisma.productImage.findMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    await Promise.allSettled(images.filter((i) => i.publicId).map((i) => deleteImage(i.publicId!)));
    return { archived: false };
  },

  async adjustStock(actor: Actor, id: string, change: number, reason: string, reference?: string) {
    const { product } = await assertCanEdit(actor, id);
    if (product.stock + change < 0) throw ApiError.badRequest(`Stock cannot go below zero (current: ${product.stock})`);
    const [updated] = await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { stock: { increment: change } } }),
      prisma.inventoryLog.create({ data: { productId: id, change, reason, reference } }),
    ]);
    return updated;
  },

  async uploadImages(files: Express.Multer.File[]) {
    const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer, 'products', f.mimetype)));
    return results.map((r) => ({ url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height }));
  },
};
