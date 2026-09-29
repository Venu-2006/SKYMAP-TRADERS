'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleButton } from '@/components/auth/google-button';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/misc';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { registerSchema, type RegisterValues } from '@/lib/validation';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referral = params.get('ref') ?? undefined;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { referralCode: referral } });

  const onSubmit = async ({ confirmPassword: _c, terms: _t, phone, referralCode, ...v }: RegisterValues) => {
    try {
      await authApi.register({ ...v, phone: phone || undefined, referralCode: referralCode || undefined });
      toast.success('Account created! Check your inbox to verify your email.');
      router.replace('/account');
    } catch (e) {
      if (e instanceof ApiError) {
        e.details?.forEach((d) => setError(d.path as keyof RegisterValues, { message: d.message }));
        toast.error(e.message);
      } else toast.error('Registration failed');
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join thousands of businesses buying smarter.">
      <GoogleButton referralCode={referral} onSuccess={() => router.replace('/account')} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Mobile (optional)" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} {...register('phone')} />
          </FormField>
        </div>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} hint="8+ characters with upper, lower case and a number">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        <FormField label="Referral code (optional)" htmlFor="referralCode" error={errors.referralCode?.message}>
          <Input id="referralCode" className="uppercase" {...register('referralCode')} />
        </FormField>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...register('terms')} />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
