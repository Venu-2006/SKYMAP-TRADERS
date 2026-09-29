import { Router } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok } from '../../utils/http';

const router = Router();

const categoryBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
  icon: z.string().max(40).optional(),
  parentId: z.string().cuid().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  gstRate: z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v)).default(18),
});

/**
 * @openapi
 * tags:
 *   - name: Categories
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Active category tree with product counts
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const all = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
    type Node = (typeof all)[number] & { children: Node[] };
    const byId = new Map<string, Node>(all.map((c) => [c.id, { ...c, children: [] }]));
    const roots: Node[] = [];
    byId.forEach((node) => {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      (parent ? parent.children : roots).push(node);
    });
    ok(res, roots);
  }),
);

/**
 * @openapi
 * /categories/{slug}:
 *   get:
 *     tags: [Categories]
 *     summary: Category with breadcrumbs and sub-categories
 */
router.get(
  '/:slug',
  validate(z.object({ params: z.object({ slug: z.string().max(100) }) })),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!category) throw ApiError.notFound('Category not found');

    const breadcrumbs: { name: string; slug: string }[] = [];
    let parentId = category.parentId;
    while (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { name: true, slug: true, parentId: true } });
      if (!parent) break;
      breadcrumbs.unshift({ name: parent.name, slug: parent.slug });
      parentId = parent.parentId;
    }
    ok(res, { ...category, breadcrumbs });
  }),
);

// ───────────── Admin ─────────────
const admin = [authenticate, authorize('ADMIN')];

/**
 * @openapi
 * /categories/admin/all:
 *   get:
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     summary: All categories including inactive (admin)
 */
router.get(
  '/admin/all',
  ...admin,
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }], include: { _count: { select: { products: true } } } })),
  ),
);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a custom category (admin)
 */
router.post(
  '/',
  ...admin,
  validate(z.object({ body: categoryBody })),
  asyncHandler(async (req, res) => {
    const slug = slugify(req.body.name, { lower: true, strict: true });
    ok(res, await prisma.category.create({ data: { ...req.body, slug } }), undefined, 201);
  }),
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a category (admin)
 *   delete:
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete an empty category (admin)
 */
router.patch(
  '/:id',
  ...admin,
  validate(z.object({ params: z.object({ id: z.string().cuid() }), body: categoryBody.partial() })),
  asyncHandler(async (req, res) => {
    if (req.body.parentId === req.params.id) throw ApiError.badRequest('A category cannot be its own parent');
    const data = { ...req.body, ...(req.body.name ? { slug: slugify(req.body.name, { lower: true, strict: true }) } : {}) };
    ok(res, await prisma.category.update({ where: { id: req.params.id }, data }));
  }),
);

router.delete(
  '/:id',
  ...admin,
  validate(z.object({ params: z.object({ id: z.string().cuid() }) })),
  asyncHandler(async (req, res) => {
    const products = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (products) throw ApiError.badRequest(`Move or delete the ${products} product(s) in this category first`);
    await prisma.category.delete({ where: { id: req.params.id } });
    ok(res, { message: 'Category deleted' });
  }),
);

export default router;
