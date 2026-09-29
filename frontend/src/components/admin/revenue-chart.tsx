'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Compact INR for axis ticks: ₹1.2L, ₹45k */
const compact = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}k` : `₹${Math.round(n)}`;

/**
 * Single-series daily revenue bars. One hue (brand primary, a single series
 * needs no legend), 4px rounded data-ends on the baseline, 2px gaps, recessive
 * grid, hover tooltip with a hit area taller than the bar, and a table view.
 * Missing days are filled with zero so the time axis stays continuous.
 */
export function RevenueChart({ data, days = 30 }: { data: DailyPoint[]; days?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const byDay = new Map(data.map((d) => [d.day, d]));
  const series: DailyPoint[] = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return byDay.get(key) ?? { day: key, revenue: 0, orders: 0 };
  });

  const max = Math.max(...series.map((s) => s.revenue), 1);
  // Round the axis max up to a friendly number.
  const pow = 10 ** Math.floor(Math.log10(max));
  const niceMax = Math.ceil(max / pow) * pow;
  const ticks = [0, 0.5, 1].map((f) => niceMax * f);
  const total = series.reduce((s, d) => s + d.revenue, 0);
  const h = hover !== null ? series[hover] : null;

  return (
    <figure className="rounded-2xl border bg-card p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-bold">Revenue, last {days} days</p>
          <p className="text-sm text-muted-foreground">{formatPrice(total)} from confirmed orders</p>
        </div>
        <button className="text-xs font-semibold text-primary hover:underline" onClick={() => setAsTable((t) => !t)}>
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </figcaption>

      {asTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5">Date</th>
                <th className="py-1.5 text-right">Orders</th>
                <th className="py-1.5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {[...series].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="py-1.5">{fmtDay(d.day)}</td>
                  <td className="py-1.5 text-right">{d.orders}</td>
                  <td className="py-1.5 text-right">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          {/* y-axis */}
          <div className="flex h-48 flex-col-reverse justify-between pb-0 text-right text-[11px] tabular-nums text-muted-foreground">
            {ticks.map((t) => (
              <span key={t} className="-translate-y-1/2 first:translate-y-1/2">
                {compact(t)}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            {/* recessive gridlines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-48 flex-col justify-between">
              {ticks.map((t) => (
                <span key={t} className="border-t border-dashed border-border/70" />
              ))}
            </div>
            <div className="relative flex h-48 items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`Daily revenue bar chart, total ${formatPrice(total)}`}>
              {series.map((d, i) => (
                <div key={d.day} className="flex h-full flex-1 cursor-default items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1}>
                  <div
                    className="w-full rounded-t-[4px] bg-primary transition-opacity"
                    style={{ height: `${(d.revenue / niceMax) * 100}%`, minHeight: d.revenue ? 2 : 0, opacity: hover === null || hover === i ? 1 : 0.45 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{fmtDay(series[0].day)}</span>
              <span>{fmtDay(series[Math.floor(days / 2)].day)}</span>
              <span>{fmtDay(series[days - 1].day)}</span>
            </div>
            {h && hover !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
                style={{ left: `${((hover + 0.5) / days) * 100}%` }}
              >
                <p className="font-semibold">{fmtDay(h.day)}</p>
                <p className="tabular-nums">{formatPrice(h.revenue)}</p>
                <p className="text-muted-foreground">
                  {h.orders} order{h.orders === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </figure>
  );
}
