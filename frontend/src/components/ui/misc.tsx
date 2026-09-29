import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Shimmering placeholder used by all skeleton loaders. */
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklch,var(--muted),var(--foreground)_6%)_50%,var(--muted)_100%)] bg-[length:200%_100%]',
      className,
    )}
    {...props}
  />
);

const badgeVariants = cva('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/20 text-foreground',
      outline: 'border',
    },
  },
  defaultVariants: { variant: 'default' },
});

export const Badge = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export const Separator = ({ className }: { className?: string }) => <div role="separator" className={cn('h-px w-full bg-border', className)} />;

/** Label + control + error message, used by every form. */
export function FormField({
  label,
  error,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
