import { prisma } from '../../lib/prisma';
import { couponDiscount, round2, shippingFee, unitPrice } from '../../lib/pricing';
import { ApiError } from '../../utils/ApiError';

const itemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      mrp: true,
      price: true,
      flashSalePrice: true,
      flashSaleEndsAt: true,
      stock: true,
      status: true,
      gstRate: true,
      minOrderQty: true,
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' as const }, take: 1 },
    },
  },
};

async function getOrCreateCart(userId: string) {
  return (
    (await prisma.cart.findUnique({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }))
  );
}

async function assertBuyable(productId: string, quantity: number) {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { status: true, stock: true, name: true } });
  if (!p || p.status !== 'ACTIVE') throw ApiError.badRequest('This product is no longer available');
  if (quantity > p.stock) throw ApiError.badRequest(p.stock ? `Only ${p.stock} unit(s) of ${p.name} in stock` : `${p.name} is out of stock`);
}

export const cartService = {
  /** Full cart with live prices, stock warnings, coupon and totals. */
  async get(userId: string) {
    const cart = await getOrCreateCart(userId);
    const [items, coupon] = await Promise.all([
      prisma.cartItem.findMany({ where: { cartId: cart.id }, include: itemInclude, orderBy: { createdAt: 'desc' } }),
      cart.couponId ? prisma.coupon.findUnique({ where: { id: cart.couponId } }) : null,
    ]);

    const lines = items.map((i) => {
      const price = unitPrice(i.product);
      return {
        id: i.id,
        productId: i.productId,
        slug: i.product.slug,
        name: i.product.name,
        image: i.product.images[0]?.url,
        price,
        mrp: Number(i.product.mrp),
        stock: i.product.stock,
        quantity: i.quantity,
        savedForLater: i.savedForLater,
        available: i.product.status === 'ACTIVE' && i.product.stock >= i.quantity,
      };
    });

    const active = lines.filter((l) => !l.savedForLater);
    const subtotal = round2(active.reduce((s, l) => s + l.price * l.quantity, 0));
    const mrpTotal = round2(active.reduce((s, l) => s + l.mrp * l.quantity, 0));

    let discount = 0;
    let couponError: string | undefined;
    if (coupon) {
      try {
        const used = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
        discount = couponDiscount(coupon, subtotal, used);
      } catch (e) {
        couponError = e instanceof ApiError ? e.message : 'Coupon cannot be applied';
      }
    }
    const shipping = active.length ? shippingFee('STANDARD', subtotal - discount) : 0;

    return {
      items: lines,
      coupon: coupon ? { code: coupon.code, description: coupon.description, error: couponError } : null,
      summary: {
        itemCount: active.reduce((n, l) => n + l.quantity, 0),
        mrpTotal,
        savings: round2(mrpTotal - subtotal),
        subtotal,
        discount,
        shipping,
        total: round2(subtotal - discount + shipping),
      },
    };
  },

  async add(userId: string, productId: string, quantity: number) {
    const cart = await getOrCreateCart(userId);
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId: null } });
    const nextQty = (existing && !existing.savedForLater ? existing.quantity : 0) + quantity;
    await assertBuyable(productId, nextQty);
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty, savedForLater: false } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }
    return this.get(userId);
  },

  async update(userId: string, itemId: string, data: { quantity?: number; savedForLater?: boolean }) {
    const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
    if (!item || item.cart.userId !== userId) throw ApiError.notFound('Cart item not found');
    if (data.quantity !== undefined) await assertBuyable(item.productId, data.quantity);
    await prisma.cartItem.update({ where: { id: itemId }, data });
    return this.get(userId);
  },

  async remove(userId: string, itemId: string) {
    const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
    if (!item || item.cart.userId !== userId) throw ApiError.notFound('Cart item not found');
    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.get(userId);
  },

  /** Merges the guest (localStorage) cart after login. Unavailable items are skipped silently. */
  async merge(userId: string, lines: { productId: string; quantity: number; savedForLater?: boolean }[]) {
    const cart = await getOrCreateCart(userId);
    for (const l of lines.slice(0, 50)) {
      const product = await prisma.product.findUnique({ where: { id: l.productId }, select: { stock: true, status: true } });
      if (!product || product.status !== 'ACTIVE' || product.stock < 1) continue;
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: l.productId, variantId: null } });
      const quantity = Math.min(product.stock, Math.max(existing?.quantity ?? 0, l.quantity));
      if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
      else await prisma.cartItem.create({ data: { cartId: cart.id, productId: l.productId, quantity, savedForLater: !!l.savedForLater } });
    }
    return this.get(userId);
  },

  async applyCoupon(userId: string, code: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw ApiError.badRequest('Invalid coupon code');
    const current = await this.get(userId);
    const used = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    couponDiscount(coupon, current.summary.subtotal, used); // throws with a helpful message
    await prisma.cart.update({ where: { userId }, data: { couponId: coupon.id } });
    return this.get(userId);
  },

  async removeCoupon(userId: string) {
    await prisma.cart.update({ where: { userId }, data: { couponId: null } });
    return this.get(userId);
  },

  /** Coupons a shopper can see on the cart page. */
  availableCoupons() {
    const now = new Date();
    return prisma.coupon.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { code: true, description: true, type: true, value: true, minOrderValue: true, maxDiscount: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  },
};
