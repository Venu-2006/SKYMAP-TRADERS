import Link from 'next/link';
import { BadgeCheck, Quote } from 'lucide-react';
import type { Review } from '@/lib/types';
import { Stars } from '@/components/product/rating';
import { T } from '@/components/t';

export function Testimonials({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section className="container-page py-10">
      <h2 className="mb-1 text-xl font-extrabold sm:text-2xl">
        <T k="home.reviewsTitle" />
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        <T k="home.reviewsSub" />
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.slice(0, 6).map((r) => (
          <figure key={r.id} className="relative flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <Quote className="absolute right-4 top-4 size-8 text-primary/15" />
            <Stars value={r.rating} size={14} />
            <blockquote className="line-clamp-4 text-sm leading-relaxed">{r.comment}</blockquote>
            <figcaption className="mt-auto flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1 font-semibold">
                {r.user.name}
                {r.isVerified && <BadgeCheck className="size-3.5 text-success" />}
              </span>
              {r.product && (
                <Link href={`/products/${r.product.slug}`} className="line-clamp-1 max-w-[55%] text-muted-foreground hover:text-primary">
                  {r.product.name}
                </Link>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
