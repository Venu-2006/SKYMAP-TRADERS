/**
 * Seeds the core categories, a few brands, an admin account and sample products.
 * Safe to re-run: everything is upserted by a unique key.
 *
 *   npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { name: 'Electronics', slug: 'electronics', icon: 'cpu', gstRate: 18 },
  { name: 'Industrial Equipment', slug: 'industrial-equipment', icon: 'factory', gstRate: 18 },
  { name: 'Electrical Components', slug: 'electrical-components', icon: 'plug-zap', gstRate: 18 },
  { name: 'Safety Products', slug: 'safety-products', icon: 'hard-hat', gstRate: 12 },
  { name: 'Tools & Hardware', slug: 'tools-hardware', icon: 'wrench', gstRate: 18 },
  { name: 'Office Supplies', slug: 'office-supplies', icon: 'briefcase', gstRate: 12 },
  { name: 'Construction Materials', slug: 'construction-materials', icon: 'brick-wall', gstRate: 28 },
];

const brands = ['Bosch', 'Havells', 'Schneider Electric', '3M', 'Stanley', 'Philips', 'Polycab', 'Karam'];

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

const products = [
  { name: 'Bosch GSB 500W Professional Impact Drill', sku: 'BOS-GSB500', cat: 'tools-hardware', brand: 'Bosch', mrp: 4299, price: 2899, stock: 120, featured: true, tags: ['drill', 'power tool'] },
  { name: 'Stanley 65-Piece Screwdriver & Bit Set', sku: 'STN-65BIT', cat: 'tools-hardware', brand: 'Stanley', mrp: 1899, price: 1249, stock: 300, trending: true, tags: ['screwdriver', 'hand tool'] },
  { name: 'Havells 32A Double Pole MCB', sku: 'HAV-MCB32DP', cat: 'electrical-components', brand: 'Havells', mrp: 780, price: 545, stock: 800, featured: true, tags: ['mcb', 'breaker'] },
  { name: 'Polycab 1.5 sq mm FR PVC Wire (90 m)', sku: 'POL-FR15-90', cat: 'electrical-components', brand: 'Polycab', mrp: 2450, price: 1799, stock: 250, trending: true, tags: ['wire', 'cable'] },
  { name: 'Schneider Electric Easy9 RCCB 40A 30mA', sku: 'SCH-RCCB40', cat: 'electrical-components', brand: 'Schneider Electric', mrp: 3650, price: 2690, stock: 90, tags: ['rccb', 'breaker'] },
  { name: '3M 8210 N95 Particulate Respirator (Pack of 20)', sku: '3M-8210-20', cat: 'safety-products', brand: '3M', mrp: 2600, price: 1890, stock: 400, flash: 1490, tags: ['mask', 'n95', 'ppe'] },
  { name: 'Karam PN521 Industrial Safety Helmet', sku: 'KAR-PN521', cat: 'safety-products', brand: 'Karam', mrp: 450, price: 329, stock: 600, featured: true, tags: ['helmet', 'ppe'] },
  { name: 'Philips 20W LED Batten (Pack of 4)', sku: 'PHI-BAT20-4', cat: 'electronics', brand: 'Philips', mrp: 1596, price: 999, stock: 350, flash: 849, tags: ['led', 'lighting'] },
  { name: 'Bosch GWS 600 Angle Grinder 670W', sku: 'BOS-GWS600', cat: 'industrial-equipment', brand: 'Bosch', mrp: 3999, price: 2749, stock: 75, trending: true, tags: ['grinder', 'power tool'] },
  { name: 'Stanley 5m Tape Measure with Auto-Lock', sku: 'STN-TAPE5', cat: 'tools-hardware', brand: 'Stanley', mrp: 499, price: 349, stock: 900, tags: ['tape', 'measuring'] },
];

async function main() {
  const catMap = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i, isFeatured: true },
    });
    catMap.set(c.slug, row.id);
  }

  const brandMap = new Map<string, string>();
  for (const name of brands) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const row = await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug } });
    brandMap.set(name, row.id);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@skymaptraders.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'SKYMAP Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      referralCode: 'SKYADMIN',
      passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345', 12),
      cart: { create: {} },
    },
  });

  const flashEnds = new Date(Date.now() + 3 * 86_400_000);
  for (const p of products) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        slug,
        sku: p.sku,
        description: `${p.name} — genuine product sourced directly from authorised distributors. GST invoice provided with every order, suitable for business input tax credit.`,
        shortDescription: `Genuine ${p.brand} product with GST invoice.`,
        categoryId: catMap.get(p.cat)!,
        brandId: brandMap.get(p.brand),
        mrp: p.mrp,
        price: p.price,
        stock: p.stock,
        tags: p.tags,
        isFeatured: !!p.featured,
        isTrending: !!p.trending,
        flashSalePrice: p.flash,
        flashSaleEndsAt: p.flash ? flashEnds : undefined,
        hsnCode: '8467',
        soldCount: Math.floor(Math.random() * 500),
        ratingAvg: 4 + Math.round(Math.random() * 9) / 10,
        ratingCount: 10 + Math.floor(Math.random() * 300),
        specifications: [
          { group: 'General', items: [{ label: 'Brand', value: p.brand }, { label: 'Model', value: p.sku }] },
          { group: 'Warranty', items: [{ label: 'Warranty', value: '1 year manufacturer warranty' }] },
        ],
        images: { create: [0, 1, 2].map((n) => ({ url: img(`${p.sku}-${n}`), alt: p.name, sortOrder: n })) },
      },
    });
  }

  const coupons = [
    { code: 'WELCOME10', description: '10% off your first order (max ₹500)', type: 'PERCENTAGE' as const, value: 10, maxDiscount: 500, minOrderValue: 499 },
    { code: 'FLAT200', description: '₹200 off on orders above ₹2,999', type: 'FIXED' as const, value: 200, minOrderValue: 2999 },
  ];
  for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });

  if (!(await prisma.faq.count())) {
    await prisma.faq.createMany({
      data: [
        { category: 'Orders', question: 'How do I track my order?', answer: 'Go to My account → Orders and open the order. You will see each step, the courier and tracking number once shipped.' },
        { category: 'Orders', question: 'Can I cancel my order?', answer: 'Yes, any time before it is shipped. Open the order and choose "Cancel order". Online payments are refunded to the original method in 5–7 working days.' },
        { category: 'Returns', question: 'What is the return policy?', answer: 'Most products can be returned within 7 days of delivery if unused and in original packaging. Open the delivered order and choose "Request return".' },
        { category: 'Payments', question: 'Which payment methods are accepted?', answer: 'UPI, credit/debit cards, net banking and wallets through Razorpay, plus Cash on Delivery.' },
        { category: 'Payments', question: 'Do I get a GST invoice?', answer: 'Yes. Every order has a downloadable GST tax invoice. Add your GSTIN to the delivery address to claim input tax credit.' },
        { category: 'Selling', question: 'How do I sell on SKYMAP TRADERS?', answer: 'Create an account, open "Sell on SKYMAP" and submit your business details. Our team reviews applications within 2 business days.' },
      ],
    });
  }

  console.info(`✅ Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products, admin ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
