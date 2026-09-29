import { Router } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok } from '../../utils/http';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Brands
 * /brands:
 *   get:
 *     tags: [Brands]
 *     summary: All brands
 *   post:
 *     tags: [Brands]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a brand (admin)
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => ok(res, await prisma.brand.findMany({ orderBy: { name: 'asc' } }))),
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(z.object({ body: z.object({ name: z.string().trim().min(1).max(80), logoUrl: z.string().url().optional() }) })),
  asyncHandler(async (req, res) =>
    ok(res, await prisma.brand.create({ data: { ...req.body, slug: slugify(req.body.name, { lower: true, strict: true }) } }), undefined, 201),
  ),
);

export default router;
