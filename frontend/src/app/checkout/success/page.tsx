'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

function Success() {
  const id = useSearchParams().get('order');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) api<Order>(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => undefined);
  }, [id]);

  return (
    <div className="container-page flex max-w-xl flex-col items-center gap-5 py-16 text-center">
      <CheckCircle2 className="size-20 animate-fade-up text-success" strokeWidth={1.5} />
      <h1 className="text-3xl font-extrabold">Thank you! Your order is confirmed</h1>
      {order ? (
        <div className="w-full space-y-1 rounded-2xl border bg-card p-5 text-sm">
          <p>
            Order number <strong className="font-mono">{order.orderNumber}</strong>
          </p>
          <p>
            Total <strong>{formatPrice(order.total)}</strong> · {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid online'}
          </p>
          <p className="text-muted-foreground">
            Delivering to {order.shippingAddress.fullName}, {order.shippingAddress.city} {order.shippingAddress.pincode}
          </p>
        </div>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {id && (
          <Button asChild>
            <Link href={`/account/orders/${id}`}>Track order</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <RequireAuth>
      <Suspense>
        <Success />
      </Suspense>
    </RequireAuth>
  );
}
