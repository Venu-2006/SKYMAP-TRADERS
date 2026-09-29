import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { imageUpload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok } from '../../utils/http';
import {
  createProductSchema,
  idParamSchema,
  listProductsSchema,
  slugParamSchema,
  stockSchema,
  suggestSchema,
  updateProductSchema,
  type ListProductsQuery,
} from './products.schema';
import { productCardSelect, productsService } from './products.service';
import { prisma } from '../../lib/prisma';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Products
 *     description: Catalog browsing, search and management
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Search and filter products
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string }, description: Category slug (includes sub-categories) }
 *       - { in: query, name: brands, schema: { type: string }, description: Comma-separated brand slugs }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: rating, schema: { type: number, minimum: 1, maximum: 5 } }
 *       - { in: query, name: inStock, schema: { type: boolean } }
 *       - { in: query, name: sort, schema: { type: string, enum: [relevance, price_asc, price_desc, newest, rating, popular, discount] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, maximum: 60 } }
 *     responses:
 *       200: { description: Paginated products with brand and price facets }
 */
router.get(
  '/',
  optionalAuth,
  validate(listProductsSchema),
  asyncHandler(async (req, res) => {
    const { items, meta, facets } = await productsService.list(req.query as unknown as ListProductsQuery, req.user?.id);
    ok(res, items, { ...meta, facets });
  }),
);

/**
 * @openapi
 * /products/suggest:
 *   get:
 *     tags: [Products]
 *     summary: Autocomplete suggestions (products, categories, brands, popular queries)
 *     parameters:
 *       - { in: query, name: q, required: true, schema: { type: string } }
 */
router.get('/suggest', validate(suggestSchema), asyncHandler(async (req, res) => ok(res, await productsService.suggest(String(req.query.q)))));

/**
 * @openapi
 * /products/trending-searches:
 *   get:
 *     tags: [Products]
 *     summary: Most frequent searches in the last 7 days
 */
router.get('/trending-searches', asyncHandler(async (_req, res) => ok(res, await productsService.trendingSearches())));

/**
 * @openapi
 * /products/home:
 *   get:
 *     tags: [Products]
 *     summary: Home page rails (featured, trending, flash sale, best sellers, new arrivals, personalized)
 */
router.get('/home', optionalAuth, asyncHandler(async (req, res) => ok(res, await productsService.homeSections(req.user?.id))));

/**
 * @openapi
 * /products/recommended:
 *   get:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Personalized recommendations from browsing history
 */
router.get('/recommended', authenticate, asyncHandler(async (req, res) => ok(res, await productsService.recommendedFor(req.user!.id))));

/**
 * @openapi
 * /products/compare:
 *   get:
 *     tags: [Products]
 *     summary: Up to 4 products with specifications for side-by-side comparison
 *     parameters:
 *       - { in: query, name: ids, required: true, schema: { type: string }, description: Comma-separated product ids }
 */
router.get(
  '/compare',
  validate(z.object({ query: z.object({ ids: z.string().max(200) }) })),
  asyncHandler(async (req, res) => {
    const ids = String(req.query.ids).split(',').filter(Boolean).slice(0, 4);
    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      select: { ...productCardSelect, specifications: true, gstRate: true, shortDescription: true },
    });
    ok(res, ids.map((i) => rows.find((r) => r.id === i)).filter(Boolean));
  }),
);

// ───────────── Management (admin + approved sellers) ─────────────

const manage = [authenticate, authorize('ADMIN', 'SELLER')];

/**
 * @openapi
 * /products/manage/list:
 *   get:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Admin sees all products; sellers see their own
 */
router.get(
  '/manage/list',
  ...manage,
  validate(listProductsSchema.extend({ query: listProductsSchema.shape.query.extend({ status: z.string().optional() }) })),
  asyncHandler(async (req, res) => {
    const { items, meta } = await productsService.adminList(req.user!, req.query as unknown as ListProductsQuery & { status?: string });
    ok(res, items, meta);
  }),
);

/**
 * @openapi
 * /products/manage/{id}:
 *   get:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Full product for the edit form (any status)
 */
router.get(
  '/manage/:id',
  ...manage,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { images: { orderBy: { sortOrder: 'asc' } } } });
    if (!product) throw ApiError.notFound('Product not found');
    if (req.user!.role === 'SELLER') {
      const seller = await prisma.seller.findUnique({ where: { userId: req.user!.id } });
      if (!seller || product.sellerId !== seller.id) throw ApiError.forbidden('You can only manage your own products');
    }
    ok(res, product);
  }),
);

/**
 * @openapi
 * /products/manage/images:
 *   post:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Upload up to 10 images (multipart field "images") to Cloudinary
 */
router.post(
  '/manage/images',
  ...manage,
  imageUpload.array('images', 10),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) throw ApiError.badRequest('Attach at least one image in the "images" field');
    ok(res, await productsService.uploadImages(files), undefined, 201);
  }),
);

/**
 * @openapi
 * /products/manage:
 *   post:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a product (seller products go to PENDING_APPROVAL)
 */
router.post(
  '/manage',
  ...manage,
  validate(createProductSchema),
  asyncHandler(async (req, res) => ok(res, await productsService.create(req.user!, req.body), undefined, 201)),
);

/**
 * @openapi
 * /products/manage/{id}:
 *   patch:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a product
 *   delete:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete a product (archived instead when it has orders)
 */
router.patch(
  '/manage/:id',
  ...manage,
  validate(updateProductSchema),
  asyncHandler(async (req, res) => ok(res, await productsService.update(req.user!, req.params.id, req.body))),
);
router.delete(
  '/manage/:id',
  ...manage,
  validate(idParamSchema),
  asyncHandler(async (req, res) => ok(res, await productsService.remove(req.user!, req.params.id))),
);

/**
 * @openapi
 * /products/manage/{id}/stock:
 *   post:
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     summary: Adjust stock with an inventory log entry
 */
router.post(
  '/manage/:id/stock',
  ...manage,
  validate(stockSchema),
  asyncHandler(async (req, res) =>
    ok(res, await productsService.adjustStock(req.user!, req.params.id, req.body.change, req.body.reason, req.body.reference)),
  ),
);

// ───────────── Public detail routes (keep last: /:slug is a catch-all) ─────────────

/**
 * @openapi
 * /products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Product detail
 * /products/{slug}/view:
 *   post:
 *     tags: [Products]
 *     summary: Record a product view (send X-Session-Id for anonymous visitors)
 * /products/{slug}/similar:
 *   get:
 *     tags: [Products]
 *     summary: Similar (same category, close price) and related (same brand / tags) products
 * /products/{slug}/bought-together:
 *   get:
 *     tags: [Products]
 *     summary: Frequently bought together, mined from order history
 */
router.get('/:slug', validate(slugParamSchema), asyncHandler(async (req, res) => ok(res, await productsService.getBySlug(req.params.slug))));
router.post(
  '/:slug/view',
  optionalAuth,
  validate(slugParamSchema),
  asyncHandler(async (req, res) => {
    await productsService.trackView(req.params.slug, { userId: req.user?.id, sessionId: req.get('x-session-id') });
    res.status(204).end();
  }),
);
router.get('/:slug/similar', validate(slugParamSchema), asyncHandler(async (req, res) => ok(res, await productsService.similarAndRelated(req.params.slug))));
router.get(
  '/:slug/bought-together',
  validate(slugParamSchema),
  asyncHandler(async (req, res) => ok(res, await productsService.frequentlyBoughtTogether(req.params.slug))),
);

export default router;
