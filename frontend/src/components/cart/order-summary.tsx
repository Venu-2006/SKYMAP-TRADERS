'use client';

import { formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { CartSummary } from '@/store/cart-store';

/** Price breakdown shared by the cart and checkout pages. */
export function OrderSummary({ summary, shippingOverride, children }: { summary: CartSummary; shippingOverride?: number; children?: React.ReactNode }) {
  const t = useT();
  const shipping = shippingOverride ?? summary.shipping;
  const total = summary.subtotal - summary.discount + shipping;
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t('cart.priceDetails')}</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>
            {t('cart.price')} ({summary.itemCount})
          </dt>
          <dd>{formatPrice(summary.mrpTotal)}</dd>
        </div>
        {summary.savings > 0 && (
          <div className="flex justify-between text-success">
            <dt>{t('cart.discountOnMrp')}</dt>
            <dd>−{formatPrice(summary.savings)}</dd>
          </div>
        )}
        {summary.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>{t('cart.couponDiscount')}</dt>
            <dd>−{formatPrice(summary.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>{t('cart.delivery')}</dt>
          <dd>{shipping ? formatPrice(shipping) : <span className="text-success">{t('cart.free')}</span>}</dd>
        </div>
      </dl>
      <div className="flex justify-between border-t pt-3 text-lg font-extrabold">
        <span>{t('cart.total')}</span>
        <span>{formatPrice(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t('cart.inclusiveTaxes')}</p>
      {summary.savings + summary.discount > 0 && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          {t('cart.youSave', { amount: formatPrice(summary.savings + summary.discount) })}
        </p>
      )}
      {children}
    </div>
  );
}
