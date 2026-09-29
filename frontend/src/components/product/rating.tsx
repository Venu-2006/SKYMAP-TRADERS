import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compact green rating pill, e.g. "4.3 ★ (1,204)" */
export function RatingPill({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <span className="inline-flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5 font-bold text-white">
        {value.toFixed(1)} <Star className="size-3 fill-current" />
      </span>
      <span className="text-muted-foreground">({count.toLocaleString('en-IN')})</span>
    </span>
  );
}

/** Five-star display with partial fill. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star className="absolute text-muted-foreground/30" style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="fill-warning text-warning" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
