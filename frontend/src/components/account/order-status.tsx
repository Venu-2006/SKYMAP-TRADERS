import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/misc';
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE: Partial<Record<OrderStatus, 'success' | 'warning' | 'secondary' | 'default'>> = {
  DELIVERED: 'success',
  PENDING: 'warning',
  RETURN_REQUESTED: 'warning',
  CANCELLED: 'secondary',
  REFUNDED: 'secondary',
  RETURNED: 'secondary',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={TONE[status] ?? 'default'}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

const FLOW: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** Horizontal progress tracker for normal fulfilment, plus the full event history. */
export function OrderTimeline({ order }: { order: Order }) {
  const current = FLOW.indexOf(order.status);
  const offFlow = current === -1;
  return (
    <div className="space-y-6">
      {!offFlow && (
        <ol className="grid grid-cols-5 gap-1">
          {FLOW.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span className={cn('h-1 flex-1 rounded', i === 0 ? 'invisible' : i <= current ? 'bg-success' : 'bg-muted')} />
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border-2', i <= current ? 'border-success bg-success text-white' : 'bg-card')}>
                  {i <= current && <Check className="size-4" />}
                </span>
                <span className={cn('h-1 flex-1 rounded', i === FLOW.length - 1 ? 'invisible' : i < current ? 'bg-success' : 'bg-muted')} />
              </div>
              <span className={cn('text-[11px] leading-tight sm:text-xs', i <= current ? 'font-semibold' : 'text-muted-foreground')}>{ORDER_STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {order.statusHistory && (
        <ul className="space-y-3 border-l-2 pl-4">
          {[...order.statusHistory].reverse().map((h) => (
            <li key={h.id} className="relative text-sm">
              <span className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-card bg-primary" />
              <p className="font-semibold">{ORDER_STATUS_LABEL[h.status]}</p>
              {h.note && <p className="text-muted-foreground">{h.note}</p>}
              <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
