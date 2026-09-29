import { Router } from 'express';
import { z } from 'zod';
import { razorpayConfigured } from '../../lib/razorpay';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok } from '../../utils/http';
import { ordersService } from './orders.service';

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().cuid() });

/**
 * @openapi
 * tags:
 *   - name: Orders
 * /orders/checkout-options:
 *   get:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Shipping methods and available payment methods
 */
router.get(
  '/checkout-options',
  asyncHandler(async (_req, res) =>
    ok(res, { shipping: ordersService.shippingOptions(), payments: { razorpay: razorpayConfigured(), cod: true } }),
  ),
);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Order history
 *   post:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Place an order from the cart (returns Razorpay checkout data for online payment)
 */
router.get(
  '/',
  validate(z.object({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) }) })),
  asyncHandler(async (req, res) => {
    const { items, meta } = await ordersService.list(req.user!.id, Number(req.query.page), Number(req.query.limit));
    ok(res, items, meta);
  }),
);

router.post(
  '/',
  validate(
    z.object({
      body: z.object({
        addressId: z.string().cuid(),
        shippingMethod: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
        paymentMethod: z.enum(['RAZORPAY', 'COD']),
        notes: z.string().trim().max(500).optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await ordersService.checkout(req.user!.id, req.body), undefined, 201)),
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Order detail with tracking timeline
 * /orders/{id}/verify-payment:
 *   post:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Verify the Razorpay payment signature and confirm the order
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Cancel before shipping (auto-refund for online payments)
 * /orders/{id}/return:
 *   post:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Request a return within 7 days of delivery
 * /orders/{id}/invoice:
 *   get:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: GST tax invoice (printable HTML)
 */
router.get('/:id', validate(z.object({ params: idParam })), asyncHandler(async (req, res) => ok(res, await ordersService.get(req.user!.id, req.params.id))));

router.post(
  '/:id/verify-payment',
  validate(
    z.object({
      params: idParam,
      body: z.object({ razorpayOrderId: z.string().min(5), razorpayPaymentId: z.string().min(5), razorpaySignature: z.string().min(10) }),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await ordersService.verifyPayment(req.user!.id, req.params.id, req.body))),
);

router.post(
  '/:id/cancel',
  validate(z.object({ params: idParam, body: z.object({ reason: z.string().trim().min(3).max(300) }) })),
  asyncHandler(async (req, res) => ok(res, await ordersService.cancel(req.user!.id, req.params.id, req.body.reason))),
);

router.post(
  '/:id/return',
  validate(z.object({ params: idParam, body: z.object({ reason: z.string().trim().min(3).max(300), details: z.string().trim().max(2000).optional() }) })),
  asyncHandler(async (req, res) => ok(res, await ordersService.requestReturn(req.user!.id, req.params.id, req.body.reason, req.body.details))),
);

router.get(
  '/:id/invoice',
  validate(z.object({ params: idParam })),
  asyncHandler(async (req, res) => {
    const isStaff = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    res.type('html').send(await ordersService.invoiceHtml(isStaff ? null : req.user!.id, req.params.id));
  }),
);

export default router;
