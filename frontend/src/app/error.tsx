'use client';

import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">We couldn’t load this page. Please check your connection and try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
