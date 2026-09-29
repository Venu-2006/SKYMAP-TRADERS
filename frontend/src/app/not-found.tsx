import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold">We couldn’t find that page</h1>
      <p className="max-w-md text-muted-foreground">The product may have been removed or the link is incorrect.</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    </div>
  );
}
