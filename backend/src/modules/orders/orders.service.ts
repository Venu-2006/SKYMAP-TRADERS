import crypto from 'crypto';
import { Prisma, type OrderStatus } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { couponDiscount, inclusiveTax, round2, shippingFee, SHIPPING_METHODS, type ShippingMethod, unitPrice } from '../../lib/pricing';
import { createRazorpayOrder, razorpayConfigured, refundPayment, verifyRazorpaySignature } from '../../lib/razorpay';
import { ApiError } from '../../utils/ApiError';
import { pageMeta, paginate } from '../../utils/http';

const REFERRAL_REWARD = 100; // ₹ credited to the referrer on the referee's first delivered order

const orderNumber = () => `SKY-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}${crypto.randomInt(10, 99)}`;

const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  returnRequests: { orderBy: { createdAt: 'desc' as const } },
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude;

/** Statuses from which the customer may still cancel. */
const CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/** Allowed admin/seller transitions — prevents e.g. jumping from CANCELLED back to SHIPPED. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: ['REFUNDED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

async function restock(tx: Prisma.TransactionClient, orderId: string, reason: 'CANCEL' | 'RETURN') {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) {
    await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity }, soldCount: { decrement: i.quantity } } });
    await tx.inventoryLog.create({ data: { productId: i.productId, change: i.quantity, reason, reference: orderId } });
  }
}

export const ordersService = {
  shippingOptions: () => Object.entries(SHIPPING_METHODS).map(([id, m]) => ({ id, ...m })),

  /**
   * Creates an order from the active cart items: validates stock and coupon,
   * snapshots prices/GST/address, reserves stock atomically, and (for online
   * payments) creates a Razorpay order.
   */
  async checkout(userId: string, input: { addressId: string; shippingMethod: ShippingMethod; paymentMethod: 'RAZORPAY' | 'COD'; notes?: string }) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const address = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (!address || address.userId !== userId) throw ApiError.badRequest('Please choose a valid delivery address');
    if (input.paymentMethod === 'RAZORPAY' && !razorpayConfigured()) {
      throw ApiError.badRequest('Online payment is not available right now. Please choose Cash on Delivery.');
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        coupon: true,
        items: {
          where: { savedForLater: false },
          include: {
            product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, seller: { select: { id: true, commissionRate: true } } } },
          },
        },
      },
    });
    if (!cart?.items.length) throw ApiError.badRequest('Your cart is empty');

    const lines = cart.items.map((ci) => {
      const p = ci.product;
      if (p.status !== 'ACTIVE') throw ApiError.badRequest(`${p.name} is no longer available`);
      if (ci.quantity > p.stock) throw ApiError.badRequest(`Only ${p.stock} unit(s) of ${p.name} left`);
      const price = unitPrice(p);
      const lineTotal = round2(price * ci.quantity);
      const gstRate = Number(p.gstRate);
      return {
        productId: p.id,
        sellerId: p.sellerId,
        name: p.name,
        sku: p.sku,
        imageUrl: p.images[0]?.url,
        hsnCode: p.hsnCode,
        unitPrice: price,
        quantity: ci.quantity,
        gstRate,
        taxAmount: inclusiveTax(lineTotal, gstRate),
        lineTotal,
        commission: p.seller ? round2((lineTotal * Number(p.seller.commissionRate)) / 100) : 0,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    let discount = 0;
    if (cart.coupon) {
      const used = await prisma.couponUsage.count({ where: { couponId: cart.coupon.id, userId } });
      discount = couponDiscount(cart.coupon, subtotal, used);
    }
    const shipping = shippingFee(input.shippingMethod, subtotal - discount);
    // Discount reduces taxable value proportionally.
    const taxAmount = round2(lines.reduce((s, l) => s + l.taxAmount, 0) * (subtotal ? (subtotal - discount) / subtotal : 1));
    const total = round2(subtotal - discount + shipping);

    const addressSnapshot = {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      gstin: address.gstin,
    };
    const isCod = input.paymentMethod === 'COD';

    const order = await prisma.$transaction(async (tx) => {
      // Reserve stock; the conditional update fails if someone else bought the last unit.
      for (const l of lines) {
        const r = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity }, soldCount: { increment: l.quantity } },
        });
        if (!r.count) throw ApiError.conflict(`${l.name} just went out of stock`);
      }
      const created = await tx.order.create({
        data: {
          orderNumber: orderNumber(),
          userId,
          status: isCod ? 'CONFIRMED' : 'PENDING',
          shippingAddress: addressSnapshot,
          billingAddress: addressSnapshot,
          shippingMethod: input.shippingMethod,
          subtotal,
          discount,
          shippingFee: shipping,
          taxAmount,
          total,
          couponId: cart.couponId,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          items: { create: lines.map((l) => ({ ...l, status: isCod ? 'CONFIRMED' : 'PENDING' })) },
          statusHistory: {
            create: { status: isCod ? 'CONFIRMED' : 'PENDING', note: isCod ? 'Order placed (Cash on Delivery)' : 'Awaiting payment' },
          },
          payments: isCod ? { create: { provider: 'COD', amount: total, status: 'CREATED' } } : undefined,
        },
      });
      for (const l of lines) await tx.inventoryLog.create({ data: { productId: l.productId, change: -l.quantity, reason: 'ORDER', reference: created.id } });
      if (isCod) await this.finalizeCart(tx, userId, created.id, cart.couponId);
      return created;
    });

    if (isCod) return { order, razorpay: null };

    try {
      const rzOrder = await createRazorpayOrder(total, order.orderNumber);
      await prisma.payment.create({ data: { orderId: order.id, provider: 'RAZORPAY', razorpayOrderId: rzOrder.id, amount: total } });
      return {
        order,
        razorpay: {
          keyId: env.RAZORPAY_KEY_ID,
          orderId: rzOrder.id,
          amount: rzOrder.amount,
          currency: 'INR',
          name: env.COMPANY_NAME,
          prefill: { name: user.name, email: user.email, contact: address.phone },
        },
      };
    } catch (e) {
      // Payment gateway failed: release the stock so it isn't stuck.
      await this.cancelInternal(order.id, 'Payment could not be initiated');
      throw e instanceof ApiError ? e : new ApiError(502, 'Could not start the payment. Please try again.');
    }
  },

  /** Empties purchased items and records coupon usage. */
  async finalizeCart(tx: Prisma.TransactionClient, userId: string, orderId: string, couponId: string | null) {
    await tx.cartItem.deleteMany({ where: { cart: { userId }, savedForLater: false } });
    if (couponId) {
      await tx.couponUsage.create({ data: { couponId, userId, orderId } });
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.cart.update({ where: { userId }, data: { couponId: null } });
    }
  },

  async verifyPayment(userId: string, orderId: string, p: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) throw ApiError.notFound('Order not found');
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: p.razorpayOrderId } });
    if (!payment || payment.orderId !== orderId) throw ApiError.badRequest('Payment does not match this order');
    if (payment.status === 'CAPTURED') return this.get(userId, orderId); // idempotent

    if (!verifyRazorpaySignature(p.razorpayOrderId, p.razorpayPaymentId, p.razorpaySignature)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Signature mismatch' } });
      throw ApiError.badRequest('Payment verification failed');
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'CAPTURED', razorpayPaymentId: p.razorpayPaymentId, razorpaySignature: p.razorpaySignature },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } });
      await tx.orderItem.updateMany({ where: { orderId }, data: { status: 'CONFIRMED' } });
      await tx.orderStatusHistory.create({ data: { orderId, status: 'CONFIRMED', note: 'Payment received' } });
      await this.finalizeCart(tx, userId, orderId, order.couponId);
    });
    return this.get(userId, orderId);
  },

  async list(userId: string, page: number, limit: number) {
    const pg = paginate(page, limit);
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.limit }),
      prisma.order.count({ where }),
    ]);
    return { items, meta: pageMeta(pg, total) };
  },

  async get(userId: string | null, orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { ...orderInclude, user: { select: { name: true, email: true, phone: true } } } });
    if (!order || (userId && order.userId !== userId)) throw ApiError.notFound('Order not found');
    return order;
  },

  async cancelInternal(orderId: string, note: string) {
    await prisma.$transaction(async (tx) => {
      await restock(tx, orderId, 'CANCEL');
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      await tx.orderItem.updateMany({ where: { orderId }, data: { status: 'CANCELLED' } });
      await tx.orderStatusHistory.create({ data: { orderId, status: 'CANCELLED', note } });
    });
  },

  /** Customer cancellation: immediate before shipping; refunds captured online payments. */
  async cancel(userId: string, orderId: string, reason: string) {
    const order = await this.get(userId, orderId);
    if (!CANCELLABLE.includes(order.status)) throw ApiError.badRequest('This order can no longer be cancelled');
    await prisma.returnRequest.create({ data: { orderId, type: 'CANCELLATION', reason, status: 'COMPLETED' } });
    await this.cancelInternal(orderId, `Cancelled by customer: ${reason}`);

    const paid = order.payments.find((p) => p.status === 'CAPTURED' && p.razorpayPaymentId);
    if (paid) {
      try {
        await refundPayment(paid.razorpayPaymentId!, Number(paid.amount));
        await prisma.payment.update({ where: { id: paid.id }, data: { status: 'REFUNDED' } });
        await prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
        await prisma.orderStatusHistory.create({ data: { orderId, status: 'REFUNDED', note: 'Refund initiated to original payment method' } });
      } catch (e) {
        console.error('Refund failed for order', orderId, e); // admin can retry from the dashboard
      }
    }
    return this.get(userId, orderId);
  },

  /** Returns are allowed within 7 days of delivery and reviewed by an admin. */
  async requestReturn(userId: string, orderId: string, reason: string, details?: string) {
    const order = await this.get(userId, orderId);
    if (order.status !== 'DELIVERED' || !order.deliveredAt) throw ApiError.badRequest('Only delivered orders can be returned');
    if (Date.now() - order.deliveredAt.getTime() > 7 * 86_400_000) throw ApiError.badRequest('The 7-day return window has closed');
    await prisma.$transaction([
      prisma.returnRequest.create({ data: { orderId, type: 'RETURN', reason, details } }),
      prisma.order.update({ where: { id: orderId }, data: { status: 'RETURN_REQUESTED' } }),
      prisma.orderStatusHistory.create({ data: { orderId, status: 'RETURN_REQUESTED', note: reason } }),
    ]);
    return this.get(userId, orderId);
  },

  /** Admin status change with transition rules, courier details, restock and referral rewards. */
  async updateStatus(orderId: string, input: { status: OrderStatus; note?: string; trackingNumber?: string; courier?: string }) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) throw ApiError.notFound('Order not found');
    if (!TRANSITIONS[order.status].includes(input.status)) {
      throw ApiError.badRequest(`Cannot change status from ${order.status} to ${input.status}`);
    }

    await prisma.$transaction(async (tx) => {
      if (input.status === 'CANCELLED') await restock(tx, orderId, 'CANCEL');
      if (input.status === 'RETURNED') await restock(tx, orderId, 'RETURN');
      if (input.status === 'RETURNED' || (order.status === 'RETURN_REQUESTED' && input.status === 'DELIVERED')) {
        await tx.returnRequest.updateMany({
          where: { orderId, type: 'RETURN', status: 'REQUESTED' },
          data: { status: input.status === 'RETURNED' ? 'COMPLETED' : 'REJECTED', adminNote: input.note },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: input.status,
          trackingNumber: input.trackingNumber ?? undefined,
          courier: input.courier ?? undefined,
          ...(input.status === 'DELIVERED' && !order.deliveredAt ? { deliveredAt: new Date() } : {}),
          ...(input.status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
          ...(input.status === 'DELIVERED' && !order.invoiceNumber ? { invoiceNumber: `INV-${order.orderNumber.slice(4)}` } : {}),
        },
      });
      await tx.orderItem.updateMany({ where: { orderId }, data: { status: input.status } });
      await tx.orderStatusHistory.create({ data: { orderId, status: input.status, note: input.note } });
      if (input.status === 'DELIVERED' && order.paymentMethod === 'COD') {
        await tx.payment.updateMany({ where: { orderId, provider: 'COD' }, data: { status: 'CAPTURED' } });
      }

      // Referral: reward the referrer once, on the referee's first delivered order.
      if (input.status === 'DELIVERED' && order.user.referredById) {
        const delivered = await tx.order.count({ where: { userId: order.userId, status: 'DELIVERED' } });
        if (delivered === 1) {
          await tx.user.update({ where: { id: order.user.referredById }, data: { walletBalance: { increment: REFERRAL_REWARD } } });
        }
      }
    });
    return this.get(null, orderId);
  },

  /** Printable GST tax invoice (HTML). CGST+SGST for intra-state supply, IGST otherwise. */
  async invoiceHtml(userId: string | null, orderId: string) {
    const o = await this.get(userId, orderId);
    if (['PENDING', 'CANCELLED'].includes(o.status)) throw ApiError.badRequest('An invoice is available once the order is confirmed');
    const addr = o.billingAddress as Record<string, string | null>;
    const intra = (addr.state ?? '').trim().toLowerCase() === env.COMPANY_STATE.trim().toLowerCase();
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const inr = (n: unknown) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const rows = o.items
      .map((i, n) => {
        const taxable = Number(i.lineTotal) - Number(i.taxAmount);
        const tax = Number(i.taxAmount);
        const taxCols = intra
          ? `<td>${Number(i.gstRate) / 2}%<br>${inr(tax / 2)}</td><td>${Number(i.gstRate) / 2}%<br>${inr(tax / 2)}</td>`
          : `<td>${Number(i.gstRate)}%<br>${inr(tax)}</td>`;
        return `<tr><td>${n + 1}</td><td>${esc(i.name)}<br><small>SKU ${esc(i.sku)}</small></td><td>${esc(i.hsnCode ?? '-')}</td><td>${i.quantity}</td><td>${inr(Number(i.unitPrice) / (1 + Number(i.gstRate) / 100))}</td><td>${inr(taxable)}</td>${taxCols}<td>${inr(i.lineTotal)}</td></tr>`;
      })
      .join('');

    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.invoiceNumber ?? o.orderNumber)}</title>
<style>body{font:13px/1.5 system-ui,Arial,sans-serif;color:#111;max-width:900px;margin:24px auto;padding:0 16px}h1{color:#e11d48;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}th{background:#f5f5f5}.grid{display:flex;justify-content:space-between;gap:24px;margin-top:16px}.right{text-align:right}.tot td{border:none;padding:3px 6px}@media print{button{display:none}}</style></head><body>
<button onclick="window.print()" style="float:right;padding:8px 14px">Print / Save as PDF</button>
<h1>${esc(env.COMPANY_NAME)}</h1><div>${esc(env.COMPANY_ADDRESS)} · ${esc(env.COMPANY_STATE)} · ${esc(env.COMPANY_PHONE)}${env.COMPANY_GSTIN ? ` · GSTIN ${esc(env.COMPANY_GSTIN)}` : ''}</div>
<h2>TAX INVOICE</h2>
<div class="grid"><div><b>Bill / Ship to</b><br>${esc(addr.fullName)}<br>${esc(addr.line1)} ${esc(addr.line2)}<br>${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.pincode)}<br>Phone: ${esc(addr.phone)}${addr.gstin ? `<br>GSTIN: ${esc(addr.gstin)}` : ''}</div>
<div class="right">Invoice no: <b>${esc(o.invoiceNumber ?? `INV-${o.orderNumber.slice(4)}`)}</b><br>Order no: ${esc(o.orderNumber)}<br>Date: ${o.createdAt.toLocaleDateString('en-IN')}<br>Payment: ${o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)'}<br>Place of supply: ${esc(addr.state)}</div></div>
<table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Taxable</th>${intra ? '<th>CGST</th><th>SGST</th>' : '<th>IGST</th>'}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot" style="width:320px;margin-left:auto"><tr><td>Subtotal</td><td class="right">${inr(o.subtotal)}</td></tr>${Number(o.discount) ? `<tr><td>Discount${o.coupon ? ` (${esc(o.coupon.code)})` : ''}</td><td class="right">−${inr(o.discount)}</td></tr>` : ''}<tr><td>Shipping</td><td class="right">${inr(o.shippingFee)}</td></tr><tr><td>Total GST included</td><td class="right">${inr(o.taxAmount)}</td></tr><tr><td><b>Grand total</b></td><td class="right"><b>${inr(o.total)}</b></td></tr></table>
<p style="margin-top:32px;color:#666;font-size:11px">This is a computer-generated invoice and does not require a signature.</p></body></html>`;
  },
};
