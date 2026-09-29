'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';

export function Newsletter() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api<{ message: string }>('/marketing/newsletter', { method: 'POST', body: { email } });
      toast.success(data.message);
      setEmail('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Subscription failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container-page py-10">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-primary via-rose-600 to-orange-500 p-8 text-center text-white shadow-xl md:flex-row md:p-12 md:text-left">
        <Mail className="size-12 shrink-0" strokeWidth={1.5} />
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold">{t('home.newsletterTitle')}</h2>
          <p className="text-white/85">{t('home.newsletterSub')}</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            aria-label="Email address"
            className="h-12 flex-1 rounded-xl bg-white/95 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-500"
          />
          <Button type="submit" size="lg" loading={busy} className="bg-slate-900 text-white hover:bg-slate-800">
            {t('home.subscribe')}
          </Button>
        </form>
      </div>
    </section>
  );
}
