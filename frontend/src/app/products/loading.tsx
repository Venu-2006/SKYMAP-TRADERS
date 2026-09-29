import { ProductGridSkeleton } from '@/components/product/product-card';
import { Skeleton } from '@/components/ui/misc';

export default function Loading() {
  return (
    <div className="container-page py-6">
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="flex gap-6">
        <Skeleton className="hidden h-[600px] w-64 shrink-0 rounded-2xl lg:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-60" />
          <ProductGridSkeleton count={15} />
        </div>
      </div>
    </div>
  );
}
