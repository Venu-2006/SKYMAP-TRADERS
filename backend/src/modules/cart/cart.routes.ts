import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok } from '../../utils/http';
import { productCardSelect } from '../products/products.service';
import { cartService } from './cart.service';

const router = Router();
router.use(authenticate);

const id = z.string().cuid();

/**
 * @openapi
 * tags:
 *   - name: Cart
 * /cart:
 *   get:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Cart with live prices, coupon and totals
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Add a product
 * /cart/items/{id}:
 *   patch:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Change quantity or move to / from "save for later"
 *   delete:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Remove an item
 * /cart/merge:
 *   post:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Merge the guest cart after login
 * /cart/coupon:
 *   post:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Apply a coupon code
 *   delete:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Remove the applied coupon
 * /cart/coupons:
 *   get:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Coupons currently available
 */
router.get('/', asyncHandler(async (req, res) => ok(res, await cartService.get(req.user!.id))));
router.get('/coupons', asyncHandler(async (_req, res) => ok(res, await cartService.availableCoupons())));

router.post(
  '/items',
  validate(z.object({ body: z.object({ productId: id, quantity: z.coerce.number().int().min(1).max(999).default(1) }) })),
  asyncHandler(async (req, res) => ok(res, await cartService.add(req.user!.id, req.body.productId, req.body.quantity))),
);

router.patch(
  '/items/:id',
  validate(
    z.object({
      params: z.object({ id }),
      body: z.object({ quantity: z.coerce.number().int().min(1).max(999).optional(), savedForLater: z.boolean().optional() }),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await cartService.update(req.user!.id, req.params.id, req.body))),
);

router.delete(
  '/items/:id',
  validate(z.object({ params: z.object({ id }) })),
  asyncHandler(async (req, res) => ok(res, await cartService.remove(req.user!.id, req.params.id))),
);

router.post(
  '/merge',
  validate(
    z.object({
      body: z.object({
        items: z.array(z.object({ productId: id, quantity: z.number().int().min(1).max(999), savedForLater: z.boolean().optional() })).max(50),
      }),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await cartService.merge(req.user!.id, req.body.items))),
);

router.post(
  '/coupon',
  validate(z.object({ body: z.object({ code: z.string().trim().min(2).max(40) }) })),
  asyncHandler(async (req, res) => ok(res, await cartService.applyCoupon(req.user!.id, req.body.code))),
);
router.delete('/coupon', asyncHandler(async (req, res) => ok(res, await cartService.removeCoupon(req.user!.id))));

// ───────────── Wishlist (mounted at /cart/wishlist to share auth) ─────────────

/**
 * @openapi
 * /cart/wishlist:
 *   get:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Wishlist products
 * /cart/wishlist/ids:
 *   get:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Wishlisted product ids (for heart icons)
 * /cart/wishlist/{productId}:
 *   post:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Toggle a product in the wishlist
 */
router.get(
  '/wishlist',
  asyncHandler(async (req, res) => {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: productCardSelect } },
    });
    ok(res, rows.map((r) => r.product));
  }),
);

router.get(
  '/wishlist/ids',
  asyncHandler(async (req, res) => {
    const rows = await prisma.wishlistItem.findMany({ where: { userId: req.user!.id }, select: { productId: true } });
    ok(res, rows.map((r) => r.productId));
  }),
);

router.post(
  '/wishlist/:productId',
  validate(z.object({ params: z.object({ productId: id }) })),
  asyncHandler(async (req, res) => {
    const key = { userId_productId: { userId: req.user!.id, productId: req.params.productId } };
    const existing = await prisma.wishlistItem.findUnique({ where: key });
    if (existing) await prisma.wishlistItem.delete({ where: key });
    else await prisma.wishlistItem.create({ data: { userId: req.user!.id, productId: req.params.productId } });
    ok(res, { wishlisted: !existing });
  }),
);

export default router;
