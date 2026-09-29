import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok, pageMeta, paginate } from '../../utils/http';

const router = Router();

/** Recomputes the denormalized rating on the product after any review change. */
async function refreshRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
  });
}

/**
 * @openapi
 * tags:
 *   - name: Reviews
 * /reviews/product/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Reviews for a product with rating distribution
 *     parameters:
 *       - { in: query, name: sort, schema: { type: string, enum: [recent, helpful, rating_high, rating_low] } }
 *       - { in: query, name: rating, schema: { type: integer } }
 */
router.get(
  '/product/:productId',
  validate(
    z.object({
      params: z.object({ productId: z.string().cuid() }),
      query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
        sort: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).default('recent'),
        rating: z.coerce.number().int().min(1).max(5).optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { page, limit, sort, rating } = req.query as unknown as { page: number; limit: number; sort: string; rating?: number };
    const pg = paginate(page, limit);
    const where = { productId: req.params.productId, isApproved: true, ...(rating ? { rating } : {}) };
    const orderBy = {
      recent: { createdAt: 'desc' as const },
      helpful: { helpfulCount: 'desc' as const },
      rating_high: { rating: 'desc' as const },
      rating_low: { rating: 'asc' as const },
    }[sort];

    const [items, total, dist] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip: pg.skip,
        take: pg.limit,
        include: { user: { select: { name: true, avatarUrl: true } } },
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: req.params.productId, isApproved: true },
        _count: { _all: true },
      }),
    ]);
    const distribution = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: dist.find((d) => d.rating === r)?._count._all ?? 0 }));
    ok(res, items, { ...pageMeta(pg, total), distribution });
  }),
);

/**
 * @openapi
 * /reviews/latest:
 *   get:
 *     tags: [Reviews]
 *     summary: Recent 4–5 star reviews for the home page testimonials rail
 */
router.get(
  '/latest',
  asyncHandler(async (_req, res) =>
    ok(
      res,
      await prisma.review.findMany({
        where: { isApproved: true, rating: { gte: 4 }, comment: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 9,
        include: { user: { select: { name: true, avatarUrl: true } }, product: { select: { name: true, slug: true } } },
      }),
    ),
  ),
);

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create or update your review for a product
 */
router.post(
  '/',
  authenticate,
  validate(
    z.object({
      body: z.object({
        productId: z.string().cuid(),
        rating: z.coerce.number().int().min(1).max(5),
        title: z.string().trim().max(120).optional(),
        comment: z.string().trim().max(3000).optional(),
        images: z.array(z.string().url()).max(5).default([]),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { productId, ...data } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw ApiError.notFound('Product not found');

    const purchased = await prisma.orderItem.count({
      where: { productId, order: { userId: req.user!.id, status: 'DELIVERED' } },
    });
    const review = await prisma.review.upsert({
      where: { productId_userId: { productId, userId: req.user!.id } },
      create: { ...data, productId, userId: req.user!.id, isVerified: purchased > 0 },
      update: { ...data, isVerified: purchased > 0 },
    });
    await refreshRating(productId);
    ok(res, review, undefined, 201);
  }),
);

/**
 * @openapi
 * /reviews/{id}/helpful:
 *   post:
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     summary: Mark a review as helpful
 */
router.post(
  '/:id/helpful',
  authenticate,
  validate(z.object({ params: z.object({ id: z.string().cuid() }) })),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({ where: { id: req.params.id }, data: { helpfulCount: { increment: 1 } } });
    ok(res, { helpfulCount: review.helpfulCount });
  }),
);

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete your review (admins may delete any)
 */
router.delete(
  '/:id',
  authenticate,
  validate(z.object({ params: z.object({ id: z.string().cuid() }) })),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) throw ApiError.notFound('Review not found');
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    if (review.userId !== req.user!.id && !isAdmin) throw ApiError.forbidden();
    await prisma.review.delete({ where: { id: review.id } });
    await refreshRating(review.productId);
    ok(res, { message: 'Review deleted' });
  }),
);

export default router;
