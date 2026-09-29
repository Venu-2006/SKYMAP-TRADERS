import { Router } from 'express';
import { Prisma, type OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok, pageMeta, paginate } from '../../utils/http';
import { ordersService } from '../orders/orders.service';

/**
 * Admin back-office API. Every route requires ADMIN (or SUPER_ADMIN).
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Dashboard analytics and back-office management (ADMIN role)
 */
const router = Router();
router.use(authenticate, authorize('ADMIN'));

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().max(40).optional(),
});
const idParam = z.object({ id: z.string().cuid() });
// Orders count as revenue until a return is actually completed or refunded.
const REVENUE_STATUSES: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'];

// ───────────── Dashboard ─────────────

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: KPIs, 30-day revenue series, top products, low stock, recent orders
 */
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [revenue, orders30, customers, products, pendingOrders, pendingSellers, pendingProducts, lowStock, recent, top, daily] = await Promise.all([
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { total: true }, _count: true }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING'] } } }),
      prisma.seller.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.$queryRaw<{ id: string; name: string; stock: number; lowStockAlert: number }[]>`
        SELECT id, name, stock, "lowStockAlert" FROM "Product" WHERE status = 'ACTIVE' AND stock <= "lowStockAlert" ORDER BY stock ASC LIMIT 10`,
      prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
      prisma.orderItem.groupBy({
        by: ['productId', 'name'],
        where: { order: { status: { in: REVENUE_STATUSES } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
      prisma.$queryRaw<{ day: Date; revenue: Prisma.Decimal; orders: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, SUM(total) AS revenue, COUNT(*) AS orders
        FROM "Order" WHERE "createdAt" >= ${since} AND status::text = ANY(${REVENUE_STATUSES})
        GROUP BY 1 ORDER BY 1`,
    ]);
    ok(res, {
      kpis: {
        revenue: Number(revenue._sum.total ?? 0),
        paidOrders: revenue._count,
        orders30,
        customers,
        products,
        pendingOrders,
        pendingSellers,
        pendingProducts,
      },
      daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), revenue: Number(d.revenue), orders: Number(d.orders) })),
      topProducts: top.map((t) => ({ productId: t.productId, name: t.name, quantity: t._sum.quantity ?? 0, revenue: Number(t._sum.lineTotal ?? 0) })),
      lowStock,
      recentOrders: recent,
    });
  }),
);

// ───────────── Orders ─────────────

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: All orders (filter by status, search by order number / customer)
 * /admin/orders/{id}:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Order detail
 * /admin/orders/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Change order status, add tracking, approve/reject returns
 */
router.get(
  '/orders',
  validate(z.object({ query: listQuery })),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const pg = paginate(q.page, q.limit);
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status as OrderStatus } : {}),
      ...(q.q
        ? { OR: [{ orderNumber: { contains: q.q, mode: 'insensitive' } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }, { user: { name: { contains: q.q, mode: 'insensitive' } } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
      }),
      prisma.order.count({ where }),
    ]);
    ok(res, items, pageMeta(pg, total));
  }),
);
router.get('/orders/:id', validate(z.object({ params: idParam })), asyncHandler(async (req, res) => ok(res, await ordersService.get(null, req.params.id))));
router.patch(
  '/orders/:id/status',
  validate(
    z.object({
      params: idParam,
      body: z.object({
        status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED']),
        note: z.string().trim().max(300).optional(),
        trackingNumber: z.string().trim().max(60).optional(),
        courier: z.string().trim().max(60).optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await ordersService.updateStatus(req.params.id, req.body))),
);

// ───────────── Customers ─────────────

/**
 * @openapi
 * /admin/customers:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Customers with order counts
 * /admin/customers/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Suspend / reactivate a user or change their role
 */
router.get(
  '/customers',
  validate(z.object({ query: listQuery })),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const pg = paginate(q.page, q.limit);
    const where: Prisma.UserWhereInput = {
      ...(q.status ? { role: q.status as Prisma.EnumRoleFilter['equals'] } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, emailVerified: true, createdAt: true, lastLoginAt: true, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
      }),
      prisma.user.count({ where }),
    ]);
    ok(res, items, pageMeta(pg, total));
  }),
);
router.patch(
  '/customers/:id',
  validate(z.object({ params: idParam, body: z.object({ isActive: z.boolean().optional(), role: z.enum(['CUSTOMER', 'SELLER', 'ADMIN']).optional() }) })),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot change your own account here');
    const target = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id } });
    if (target.role === 'SUPER_ADMIN') throw ApiError.forbidden('Super admins cannot be modified');
    if (req.body.role === 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only a super admin can grant admin access');
    const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body, select: { id: true, isActive: true, role: true } });
    // Suspending a user signs them out everywhere.
    if (req.body.isActive === false) await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    ok(res, user);
  }),
);

// ───────────── Coupons ─────────────

const couponBody = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, digits, - or _'),
  description: z.string().trim().max(200).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.coerce.number().positive(),
  maxDiscount: z.coerce.number().positive().nullable().optional(),
  minOrderValue: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});

/**
 * @openapi
 * /admin/coupons:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List coupons
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a coupon
 * /admin/coupons/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a coupon
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete a coupon
 */
router.get('/coupons', asyncHandler(async (_req, res) => ok(res, await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }))));
router.post(
  '/coupons',
  validate(z.object({ body: couponBody.refine((b) => b.type !== 'PERCENTAGE' || b.value <= 100, { path: ['value'], message: 'Percentage cannot exceed 100' }) })),
  asyncHandler(async (req, res) => ok(res, await prisma.coupon.create({ data: req.body }), undefined, 201)),
);
router.patch(
  '/coupons/:id',
  validate(z.object({ params: idParam, body: couponBody.partial() })),
  asyncHandler(async (req, res) => ok(res, await prisma.coupon.update({ where: { id: req.params.id }, data: req.body }))),
);
router.delete(
  '/coupons/:id',
  validate(z.object({ params: idParam })),
  asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    ok(res, { message: 'Coupon deleted' });
  }),
);

// ───────────── Banners ─────────────

const bannerBody = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).optional(),
  imageUrl: z.string().url(),
  mobileUrl: z.string().url().optional(),
  linkUrl: z.string().trim().max(300).optional(),
  position: z.enum(['HERO', 'STRIP', 'SIDEBAR']).default('HERO'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

/**
 * @openapi
 * /admin/banners:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List banners
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a banner
 * /admin/banners/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a banner
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete a banner
 */
router.get('/banners', asyncHandler(async (_req, res) => ok(res, await prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }] }))));
router.post('/banners', validate(z.object({ body: bannerBody })), asyncHandler(async (req, res) => ok(res, await prisma.banner.create({ data: req.body }), undefined, 201)));
router.patch(
  '/banners/:id',
  validate(z.object({ params: idParam, body: bannerBody.partial() })),
  asyncHandler(async (req, res) => ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: req.body }))),
);
router.delete(
  '/banners/:id',
  validate(z.object({ params: idParam })),
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id } });
    ok(res, { message: 'Banner deleted' });
  }),
);

// ───────────── Sellers ─────────────

/**
 * @openapi
 * /admin/sellers:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Seller applications and accounts
 * /admin/sellers/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Approve / reject / suspend a seller or change commission
 */
router.get(
  '/sellers',
  asyncHandler(async (_req, res) =>
    ok(
      res,
      await prisma.seller.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } }, _count: { select: { products: true, orderItems: true } } },
      }),
    ),
  ),
);
router.patch(
  '/sellers/:id',
  validate(
    z.object({
      params: idParam,
      body: z.object({ status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']).optional(), commissionRate: z.coerce.number().min(0).max(50).optional() }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const seller = await prisma.seller.update({ where: { id: req.params.id }, data: req.body });
    // Approving promotes the account to SELLER; suspending hides their listings.
    if (req.body.status === 'APPROVED') await prisma.user.update({ where: { id: seller.userId }, data: { role: 'SELLER' } });
    if (req.body.status === 'SUSPENDED') await prisma.product.updateMany({ where: { sellerId: seller.id, status: 'ACTIVE' }, data: { status: 'INACTIVE' } });
    ok(res, seller);
  }),
);

// ───────────── Inventory ─────────────

/**
 * @openapi
 * /admin/inventory:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Stock levels (lowOnly=true for alerts) with recent movements
 */
router.get(
  '/inventory',
  validate(z.object({ query: listQuery.extend({ lowOnly: z.enum(['true', 'false']).optional() }) })),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery> & { lowOnly?: string };
    const pg = paginate(q.page, q.limit);
    const where: Prisma.ProductWhereInput = q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { sku: { contains: q.q, mode: 'insensitive' } }] } : {};
    if (q.lowOnly === 'true') {
      const low = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE stock <= "lowStockAlert"`;
      where.id = { in: low.map((l) => l.id) };
    }
    const [items, total, logs] = await Promise.all([
      prisma.product.findMany({
        where,
        select: { id: true, name: true, sku: true, stock: true, lowStockAlert: true, status: true, soldCount: true, images: { take: 1, select: { url: true } } },
        orderBy: { stock: 'asc' },
        skip: pg.skip,
        take: pg.limit,
      }),
      prisma.product.count({ where }),
      prisma.inventoryLog.findMany({ take: 20, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true } } } }),
    ]);
    ok(res, { items, logs }, pageMeta(pg, total));
  }),
);

// ───────────── Reports ─────────────

/**
 * @openapi
 * /admin/reports/sales:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Sales, GST and category breakdown for a date range (format=csv to download)
 */
router.get(
  '/reports/sales',
  validate(
    z.object({
      query: z.object({
        from: z.coerce.date().default(() => new Date(Date.now() - 30 * 86_400_000)),
        to: z.coerce.date().default(() => new Date()),
        format: z.enum(['json', 'csv']).default('json'),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { from, to, format } = req.query as unknown as { from: Date; to: Date; format: string };
    const end = new Date(to.getTime() + 86_400_000 - 1);
    const where: Prisma.OrderWhereInput = { createdAt: { gte: from, lte: end }, status: { in: REVENUE_STATUSES } };

    const [totals, daily, byCategory, byPayment] = await Promise.all([
      prisma.order.aggregate({ where, _sum: { total: true, taxAmount: true, discount: true, shippingFee: true }, _count: true }),
      prisma.$queryRaw<{ day: Date; orders: bigint; revenue: Prisma.Decimal; tax: Prisma.Decimal }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS orders, SUM(total) AS revenue, SUM("taxAmount") AS tax
        FROM "Order" WHERE "createdAt" BETWEEN ${from} AND ${end} AND status::text = ANY(${REVENUE_STATUSES})
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ category: string; quantity: bigint; revenue: Prisma.Decimal }[]>`
        SELECT c.name AS category, SUM(oi.quantity) AS quantity, SUM(oi."lineTotal") AS revenue
        FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "Product" p ON p.id = oi."productId" JOIN "Category" c ON c.id = p."categoryId"
        WHERE o."createdAt" BETWEEN ${from} AND ${end} AND o.status::text = ANY(${REVENUE_STATUSES})
        GROUP BY c.name ORDER BY revenue DESC`,
      prisma.order.groupBy({ by: ['paymentMethod'], where, _sum: { total: true }, _count: true }),
    ]);

    const rows = daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), orders: Number(d.orders), revenue: Number(d.revenue), tax: Number(d.tax) }));
    if (format === 'csv') {
      res.setHeader('Content-Disposition', `attachment; filename="sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
      res.type('text/csv').send(['Date,Orders,Revenue (INR),GST (INR)', ...rows.map((r) => `${r.day},${r.orders},${r.revenue},${r.tax}`)].join('\n'));
      return;
    }
    ok(res, {
      totals: {
        orders: totals._count,
        revenue: Number(totals._sum.total ?? 0),
        tax: Number(totals._sum.taxAmount ?? 0),
        discount: Number(totals._sum.discount ?? 0),
        shipping: Number(totals._sum.shippingFee ?? 0),
      },
      daily: rows,
      byCategory: byCategory.map((c) => ({ category: c.category, quantity: Number(c.quantity), revenue: Number(c.revenue) })),
      byPayment: byPayment.map((p) => ({ method: p.paymentMethod, orders: p._count, revenue: Number(p._sum.total ?? 0) })),
    });
  }),
);

// ───────────── Inbox ─────────────

/**
 * @openapi
 * /admin/returns:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Return and cancellation requests
 * /admin/messages:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Contact form messages
 */
router.get(
  '/returns',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.returnRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { order: { select: { id: true, orderNumber: true, total: true, status: true } } } })),
  ),
);
router.get('/messages', asyncHandler(async (_req, res) => ok(res, await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }))));

export default router;
