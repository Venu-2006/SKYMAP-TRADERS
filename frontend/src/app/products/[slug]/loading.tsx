import { Skeleton } from '@/components/ui/misc';

export default function Loading() {
  return (
    <div className="container-page py-6">
      <Skeleton className="mb-5 h-4 w-72" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-52" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
