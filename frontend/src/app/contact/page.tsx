'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^([6-9]\d{9})?$/, 'Enter a valid mobile number').optional(),
  subject: z.string().trim().min(3, 'Enter a subject').max(150),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(3000),
});
type Values = z.infer<typeof schema>;

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function ContactPage() {
  const user = useAuthStore((s) => s.user);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), values: { name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', subject: '', message: '' } });

  const onSubmit = async (v: Values) => {
    try {
      const { data } = await api<{ message: string }>('/marketing/contact', { method: 'POST', body: { ...v, phone: v.phone || undefined } });
      toast.success(data.message);
      setSent(true);
      reset();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send message');
    }
  };

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_1.4fr]">
      <aside className="space-y-5">
        <h1 className="text-3xl font-extrabold">Contact us</h1>
        <p className="text-muted-foreground">Questions about an order, bulk pricing or GST invoices? We usually reply within one business day.</p>
        <ul className="space-y-3">
          {WHATSAPP && (
            <li>
              <a
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-[#25D366]"
              >
                <MessageCircle className="size-6 text-[#25D366]" />
                <span>
                  <span className="block font-semibold">WhatsApp</span>
                  <span className="text-sm text-muted-foreground">+{WHATSAPP.replace(/^91/, '91 ')}</span>
                </span>
              </a>
            </li>
          )}
          {WHATSAPP && (
            <li>
              <a href={`tel:+${WHATSAPP}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary">
                <Phone className="size-6 text-primary" />
                <span>
                  <span className="block font-semibold">Call us</span>
                  <span className="text-sm text-muted-foreground">Mon–Sat, 9:30am–6:30pm</span>
                </span>
              </a>
            </li>
          )}
          <li>
            <a href="mailto:support@skymaptraders.com" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary">
              <Mail className="size-6 text-primary" />
              <span>
                <span className="block font-semibold">Email</span>
                <span className="text-sm text-muted-foreground">support@skymaptraders.com</span>
              </span>
            </a>
          </li>
        </ul>
      </aside>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border bg-card p-6" noValidate>
        {sent && <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-success">Message sent. We’ll be in touch soon.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register('email')} />
          </FormField>
          <FormField label="Mobile (optional)" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" inputMode="numeric" maxLength={10} {...register('phone')} />
          </FormField>
          <FormField label="Subject" htmlFor="subject" error={errors.subject?.message}>
            <Input id="subject" {...register('subject')} />
          </FormField>
        </div>
        <FormField label="Message" htmlFor="message" error={errors.message?.message}>
          <textarea id="message" rows={6} className="w-full rounded-lg border bg-card p-3 text-sm" {...register('message')} />
        </FormField>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Send message
        </Button>
      </form>
    </div>
  );
}
