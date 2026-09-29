import { BadgeCheck, ShieldCheck, Truck } from 'lucide-react';

/** Two-column layout for auth pages: value props on the left, form card on the right. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-[calc(100dvh-10rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <aside className="hidden rounded-3xl bg-gradient-to-br from-primary via-rose-600 to-orange-500 p-10 text-white shadow-2xl lg:block">
        <h2 className="text-3xl font-extrabold leading-tight">
          Everything your business needs,
          <br />
          delivered.
        </h2>
        <ul className="mt-8 space-y-5 text-white/90">
          <li className="flex gap-3">
            <BadgeCheck className="size-6 shrink-0" /> 100% genuine brands with GST invoice for input tax credit
          </li>
          <li className="flex gap-3">
            <Truck className="size-6 shrink-0" /> Pan-India delivery with live order tracking
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="size-6 shrink-0" /> Secure payments via Razorpay — UPI, cards, net banking
          </li>
        </ul>
      </aside>
      <div className="mx-auto w-full max-w-md animate-fade-up">
        <div className="rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
