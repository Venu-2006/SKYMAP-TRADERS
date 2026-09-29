import { Router } from 'express';
import type { OrderStatus } from '@prisma/client';
import slugify from 'slugify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok } from '../../utils/http';

/**
 * @openapi
 * tags:
 *   - name: Seller
 *     description: Seller onboarding, dashboard and order fulfilment
 */
const router = Router();
router.use(authenticate);

const EARNING: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

async function mySeller(userId: string) {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw ApiError.notFound('You have not registered as a seller yet');
  return seller;
}

/**
 * @openapi
 * /seller/register:
 *   post:
 *     tags: [Seller]
 *     security: [{ bearerAuth: [] }]
 *     summary: Apply to become a seller (admin approval required)
 */
router.post(
  '/register',
  validate(
    z.object({
      body: z.object({
        businessName: z.string().trim().min(2).max(120),
        phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
        gstin: z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN').optional(),
        pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN').optional(),
        description: z.string().trim().max(1000).optional(),
        pickupAddress: z.object({
          line1: z.string().trim().min(3).max(200),
          city: z.string().trim().min(2).max(80),
          state: z.string().trim().min(2).max(80),
          pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid PIN code'),
        }),
        bank: z
          .object({
            accountName: z.string().trim().min(2).max(120),
            accountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number'),
            ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC'),
          })
          .optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (await prisma.seller.findUnique({ where: { userId: req.user!.id } })) throw ApiError.conflict('You have already applied as a seller');
    const { bank, ...data } = req.body;
    let slug = slugify(data.businessName, { lower: true, strict: true });
    if (await prisma.seller.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const seller = await prisma.seller.create({
      data: {
        ...data,
        slug,
        userId: req.user!.id,
        // Only the last 4 digits are stored; payouts are settled out of band.
        bankAccount: bank ? { accountName: bank.accountName, accountNumberLast4: bank.accountNumber.slice(-4), ifsc: bank.ifsc } : undefined,
      },
    });
    ok(res, seller, undefined, 201);
  }),
);

/**
 * @openapi
 * /seller/me:
 *   get:
 *     tags: [Seller]
 *     security: [{ bearerAuth: [] }]
 *     summary: Your seller profile and application status (null if not applied)
 */
router.get('/me', asyncHandler(async (req, res) => ok(res, await prisma.seller.findUnique({ where: { userId: req.user!.id } }))));

// Everything below needs an approved seller account.
router.use(authorize('SELLER'));

/**
 * @openapi
 * /seller/stats:
 *   get:
 *     tags: [Seller]
 *     security: [{ bearerAuth: [] }]
 *     summary: Revenue, commission, net earnings, stock alerts
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const seller = await mySeller(req.user!.id);
    const [earn, products, lowStock, pending, recent] = await Promise.all([
      prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: { in: EARNING } }, _sum: { lineTotal: true, commission: true, quantity: true }, _count: true }),
      prisma.product.groupBy({ by: ['status'], where: { sellerId: seller.id }, _count: true }),
      prisma.product.findMany({ where: { sellerId: seller.id, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, take: 10 }),
      prisma.orderItem.count({ where: { sellerId: seller.id, status: { in: ['CONFIRMED', 'PROCESSING'] } } }),
      prisma.orderItem.findMany({ where: { sellerId: seller.id }, orderBy: { order: { createdAt: 'desc' } }, take: 8, include: { order: { select: { orderNumber: true, createdAt: true } } } }),
    ]);
    const gross = Number(earn._sum.lineTotal ?? 0);
    const commission = Number(earn._sum.commission ?? 0);
    ok(res, {
      seller,
      kpis: { gross, commission, net: gross - commission, unitsSold: earn._sum.quantity ?? 0, orderLines: earn._count, pending },
      products: Object.fromEntries(products.map((p) => [p.status, p._count])),
      lowStock,
      recent,
    });
  }),
);

/**
 * @openapi
 * /seller/orders:
 *   get:
 *     tags: [Seller]
 *     security: [{ bearerAuth: [] }]
 *     summary: Order lines containing your products
 * /seller/orders/{itemId}:
 *   patch:
 *     tags: [Seller]
 *     security: [{ bearerAuth: [] }]
 *     summary: Mark one of your order lines as PROCESSING or SHIPPED
 */
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const seller = await mySeller(req.user!.id);
    ok(
      res,
      await prisma.orderItem.findMany({
        where: { sellerId: seller.id, order: { status: { not: 'PENDING' } } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 200,
        include: { order: { select: { id: true, orderNumber: true, createdAt: true, status: true, shippingAddress: true } } },
      }),
    );
  }),
);
router.patch(
  '/orders/:itemId',
  validate(z.object({ params: z.object({ itemId: z.string().cuid() }), body: z.object({ status: z.enum(['PROCESSING', 'SHIPPED']) }) })),
  asyncHandler(async (req, res) => {
    const seller = await mySeller(req.user!.id);
    const item = await prisma.orderItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.sellerId !== seller.id) throw ApiError.notFound('Order item not found');
    if (!['CONFIRMED', 'PROCESSING'].includes(item.status)) throw ApiError.badRequest(`Item is already ${item.status.toLowerCase()}`);
    ok(res, await prisma.orderItem.update({ where: { id: item.id }, data: { status: req.body.status } }));
  }),
);

export default router;
