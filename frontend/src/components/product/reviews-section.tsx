'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Star, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import type { PageMeta, Review } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Stars } from './rating';

type Meta = PageMeta & { distribution: { rating: number; count: number }[] };

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a star rating');
    setBusy(true);
    try {
      await api('/reviews', { method: 'POST', body: { productId, rating, title: title || undefined, comment: comment || undefined } });
      toast.success('Thanks for your review!');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((r) => (
          <button key={r} type="button" onClick={() => setRating(r)} aria-label={`${r} stars`} role="radio" aria-checked={rating === r}>
            <Star className={cn('size-7 transition', r <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/40')} />
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Headline (optional)" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={3000}
        rows={4}
        placeholder="What did you like or dislike? How did you use it?"
        className="w-full rounded-lg border bg-background p-3 text-sm"
      />
      <Button type="submit" loading={busy}>
        Submit review
      </Button>
    </form>
  );
}

export function ReviewsSection({ productId, ratingAvg, ratingCount }: { productId: string; ratingAvg: number; ratingCount: number }) {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<Review[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [writing, setWriting] = useState(false);

  const load = useCallback(
    (p: number) =>
      api<Review[], Meta>(`/reviews/product/${productId}`, { query: { page: p, sort, rating: filter, limit: 5 } }).then((r) => {
        setItems((prev) => (p === 1 ? r.data : [...(prev ?? []), ...r.data]));
        setMeta(r.meta!);
        setPage(p);
      }),
    [productId, sort, filter],
  );

  useEffect(() => {
    setItems(null);
    load(1).catch(() => setItems([]));
  }, [load]);

  const total = meta?.distribution.reduce((n, d) => n + d.count, 0) ?? ratingCount;

  return (
    <section id="reviews" className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold">Ratings &amp; reviews</h2>
        <div className="flex items-center gap-3">
          <span className="text-5xl font-extrabold">{ratingAvg.toFixed(1)}</span>
          <div>
            <Stars value={ratingAvg} />
            <p className="text-sm text-muted-foreground">{total.toLocaleString('en-IN')} ratings</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {(meta?.distribution ?? [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: 0 }))).map((d) => (
            <li key={d.rating}>
              <button onClick={() => setFilter(filter === d.rating ? undefined : d.rating)} className={cn('flex w-full items-center gap-2 text-sm', filter === d.rating && 'font-bold text-primary')}>
                <span className="w-6">{d.rating}★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-success" style={{ width: `${total ? (d.count / total) * 100 : 0}%` }} />
                </span>
                <span className="w-10 text-right text-muted-foreground">{d.count}</span>
              </button>
            </li>
          ))}
        </ul>
        {user ? (
          <Button variant="outline" className="w-full" onClick={() => setWriting((w) => !w)}>
            {writing ? 'Cancel' : 'Write a review'}
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Sign in to review</Link>
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {writing && (
          <ReviewForm
            productId={productId}
            onDone={() => {
              setWriting(false);
              load(1);
            }}
          />
        )}
        <div className="flex justify-end">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm" aria-label="Sort reviews">
            <option value="recent">Most recent</option>
            <option value="helpful">Most helpful</option>
            <option value="rating_high">Highest rating</option>
            <option value="rating_low">Lowest rating</option>
          </select>
        </div>
        {items === null ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
        ) : (
          items.map((r) => (
            <article key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5 text-xs font-bold text-white">
                  {r.rating} <Star className="size-3 fill-current" />
                </span>
                {r.title && <h3 className="font-semibold">{r.title}</h3>}
              </div>
              {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.comment}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.user.name}</span>
                {r.isVerified && (
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" /> Verified buyer
                  </span>
                )}
                <span>{new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                <button
                  className="ml-auto inline-flex items-center gap-1 hover:text-primary"
                  onClick={() =>
                    user
                      ? api<{ helpfulCount: number }>(`/reviews/${r.id}/helpful`, { method: 'POST' }).then((res) =>
                          setItems((all) => all!.map((x) => (x.id === r.id ? { ...x, helpfulCount: res.data.helpfulCount } : x))),
                        )
                      : toast.info('Sign in to vote')
                  }
                >
                  <ThumbsUp className="size-3.5" /> Helpful ({r.helpfulCount})
                </button>
              </div>
            </article>
          ))
        )}
        {meta && page < meta.totalPages && (
          <Button variant="outline" className="w-full" onClick={() => load(page + 1)}>
            Load more reviews
          </Button>
        )}
      </div>
    </section>
  );
}
