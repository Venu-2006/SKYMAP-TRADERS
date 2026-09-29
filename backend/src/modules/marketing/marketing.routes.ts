import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/security';
import { asyncHandler, ok } from '../../utils/http';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Marketing
 * /marketing/newsletter:
 *   post:
 *     tags: [Marketing]
 *     summary: Subscribe an email to the newsletter (idempotent)
 */
router.post(
  '/newsletter',
  authLimiter,
  validate(z.object({ body: z.object({ email: z.string().trim().toLowerCase().email() }) })),
  asyncHandler(async (req, res) => {
    await prisma.newsletterSubscriber.upsert({
      where: { email: req.body.email },
      create: { email: req.body.email },
      update: { isActive: true },
    });
    ok(res, { message: 'You’re subscribed! Watch your inbox for exclusive deals.' }, undefined, 201);
  }),
);

/**
 * @openapi
 * /marketing/banners:
 *   get:
 *     tags: [Marketing]
 *     summary: Active banners for a position (HERO, STRIP, SIDEBAR)
 */
router.get(
  '/banners',
  validate(z.object({ query: z.object({ position: z.enum(['HERO', 'STRIP', 'SIDEBAR']).default('HERO') }) })),
  asyncHandler(async (req, res) => {
    const now = new Date();
    ok(
      res,
      await prisma.banner.findMany({
        where: {
          position: String(req.query.position),
          isActive: true,
          AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        },
        orderBy: { sortOrder: 'asc' },
      }),
    );
  }),
);

/**
 * @openapi
 * /marketing/contact:
 *   post:
 *     tags: [Marketing]
 *     summary: Submit the contact form
 * /marketing/faqs:
 *   get:
 *     tags: [Marketing]
 *     summary: Active FAQs grouped by category
 */
router.post(
  '/contact',
  authLimiter,
  validate(
    z.object({
      body: z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().trim().max(15).optional(),
        subject: z.string().trim().min(3).max(150),
        message: z.string().trim().min(10).max(3000),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.create({ data: req.body });
    ok(res, { message: 'Thanks! Our team will get back to you within one business day.' }, undefined, 201);
  }),
);

router.get(
  '/faqs',
  asyncHandler(async (_req, res) => ok(res, await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }))),
);

export default router;
