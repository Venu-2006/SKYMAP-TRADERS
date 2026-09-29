import Link from 'next/link';
import { BrickWall, Briefcase, Cpu, Factory, HardHat, LayoutGrid, PlugZap, Wrench, type LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/types';
import { T } from '@/components/t';

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  factory: Factory,
  'plug-zap': PlugZap,
  'hard-hat': HardHat,
  wrench: Wrench,
  briefcase: Briefcase,
  'brick-wall': BrickWall,
};

const TINTS = [
  'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400',
  'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
  'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
  'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
  'from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400',
  'from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400',
];

/** Category tiles; includes admin-created custom categories from the database. */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="container-page py-8">
      <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">
        <T k="home.shopByCategory" />
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.slice(0, 7).map((c, i) => {
          const Icon = (c.icon && ICONS[c.icon]) || LayoutGrid;
          return (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b p-4 text-center transition hover:-translate-y-1 hover:shadow-lg ${TINTS[i % TINTS.length]}`}
            >
              <Icon className="size-8 transition group-hover:scale-110" strokeWidth={1.6} />
              <span className="text-xs font-semibold text-foreground sm:text-sm">{c.name}</span>
            </Link>
          );
        })}
        <Link
          href="/categories"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-center transition hover:border-primary hover:text-primary"
        >
          <LayoutGrid className="size-8" strokeWidth={1.6} />
          <span className="text-xs font-semibold sm:text-sm">All categories</span>
        </Link>
      </div>
    </section>
  );
}
