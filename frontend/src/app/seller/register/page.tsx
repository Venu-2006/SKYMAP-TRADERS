'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, IndianRupee, Store, Truck, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { INDIAN_STATES } from '@/components/account/address-manager';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, Skeleton } from '@/components/ui/misc';
import { api, ApiError, refreshSession } from '@/lib/api';

const schema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name').max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  gstin: z.string().trim().toUpperCase().regex(/^(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, 'Enter a valid GSTIN'),
  pan: z.string().trim().toUpperCase().regex(/^([A-Z]{5}\d{4}[A-Z])?$/, 'Enter a valid PAN'),
  description: z.string().trim().max(1000).optional(),
  line1: z.string().trim().min(3, 'Enter the pickup address'),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().min(2, 'Select a state'),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid PIN code'),
  accountName: z.string().trim().optional(),
  accountNumber: z.string().regex(/^(\d{9,18})?$/, '9–18 digits').optional(),
  ifsc: z.string().trim().toUpperCase().regex(/^([A-Z]{4}0[A-Z0-9]{6})?$/, 'Enter a valid IFSC').optional(),
});
type Values = z.infer<typeof schema>;

interface SellerProfile {
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  businessName: string;
}

function Register() {
  const router = useRouter();
  const [existing, setExisting] = useState<SellerProfile | null | undefined>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api<SellerProfile | null>('/seller/me')
      .then(async (r) => {
        setExisting(r.data);
        // Approved since last login: refresh the token to pick up the SELLER role.
        if (r.data?.status === 'APPROVED') {
          await refreshSession();
          router.replace('/seller');
        }
      })
      .catch(() => setExisting(null));
  }, [router]);

  const onSubmit = async (v: Values) => {
    try {
      const { data } = await api<SellerProfile>('/seller/register', {
        method: 'POST',
        body: {
          businessName: v.businessName,
          phone: v.phone,
          gstin: v.gstin || undefined,
          pan: v.pan || undefined,
          description: v.description || undefined,
          pickupAddress: { line1: v.line1, city: v.city, state: v.state, pincode: v.pincode },
          bank: v.accountNumber && v.ifsc && v.accountName ? { accountName: v.accountName, accountNumber: v.accountNumber, ifsc: v.ifsc } : undefined,
        },
      });
      setExisting(data);
      toast.success('Application submitted!');
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.details?.[0]?.message ?? e.message) : 'Could not submit application');
    }
  };

  if (existing === undefined) return <Skeleton className="container-page my-8 h-96" />;

  if (existing) {
    const rejected = existing.status === 'REJECTED' || existing.status === 'SUSPENDED';
    return (
      <div className="container-page flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        {rejected ? <XCircle className="size-14 text-destructive" /> : <Clock className="size-14 text-warning" />}
        <h1 className="text-2xl font-extrabold">{rejected ? `Application ${existing.status.toLowerCase()}` : 'Application under review'}</h1>
        <p className="text-muted-foreground">
          {rejected
            ? 'Please contact support for details.'
            : `Thanks, ${existing.businessName}! Our team reviews applications within 2 business days. Come back to this page once you are approved.`}
        </p>
        <Button asChild variant="outline">
          <Link href="/contact">Contact support</Link>
        </Button>
      </div>
    );
  }

  const f = (name: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <FormField label={label} htmlFor={name} error={errors[name]?.message}>
      <Input id={name} aria-invalid={!!errors[name]} {...props} {...register(name)} />
    </FormField>
  );

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_1.4fr]">
      <aside className="space-y-5">
        <h1 className="text-3xl font-extrabold">Sell on SKYMAP TRADERS</h1>
        <p className="text-muted-foreground">Reach businesses across India. List your products, we bring the buyers.</p>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <Store className="size-6 shrink-0 text-primary" /> Your own seller dashboard to manage listings, stock and orders
          </li>
          <li className="flex gap-3">
            <IndianRupee className="size-6 shrink-0 text-primary" /> Transparent commission from 10%, payouts every week
          </li>
          <li className="flex gap-3">
            <Truck className="size-6 shrink-0 text-primary" /> Pan-India delivery and GST-ready invoices on every order
          </li>
        </ul>
      </aside>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border bg-card p-6" noValidate>
        <h2 className="font-bold">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {f('businessName', 'Business name')}
          {f('phone', 'Business mobile', { inputMode: 'numeric', maxLength: 10 })}
          {f('gstin', 'GSTIN (optional)', { className: 'uppercase', maxLength: 15 })}
          {f('pan', 'PAN (optional)', { className: 'uppercase', maxLength: 10 })}
        </div>
        <FormField label="What do you sell?" htmlFor="description">
          <textarea id="description" rows={3} className="w-full rounded-lg border bg-card p-3 text-sm" {...register('description')} />
        </FormField>
        <h2 className="border-t pt-5 font-bold">Pickup address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{f('line1', 'Address')}</div>
          {f('city', 'City')}
          <FormField label="State" htmlFor="state" error={errors.state?.message}>
            <select id="state" className="h-10 w-full rounded-lg border bg-card px-3 text-sm" {...register('state')}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormField>
          {f('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6 })}
        </div>
        <h2 className="border-t pt-5 font-bold">Bank account for payouts (optional)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {f('accountName', 'Account holder')}
          {f('accountNumber', 'Account number', { inputMode: 'numeric' })}
          {f('ifsc', 'IFSC', { className: 'uppercase', maxLength: 11 })}
        </div>
        <p className="text-xs text-muted-foreground">We store only the last 4 digits of your account number.</p>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Submit application
        </Button>
      </form>
    </div>
  );
}

export default function SellerRegisterPage() {
  return (
    <RequireAuth>
      <Register />
    </RequireAuth>
  );
}
