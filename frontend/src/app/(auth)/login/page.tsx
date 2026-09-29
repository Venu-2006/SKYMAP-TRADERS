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
import { loginSchema, type LoginValues } from '@/lib/validation';

/** Only allow same-site relative redirects to prevent open-redirect abuse. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (v: LoginValues) => {
    try {
      const user = await authApi.login(v.email, v.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      router.replace(next);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Unable to sign in');
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Access your orders, wishlist and saved addresses.">
      <GoogleButton onSuccess={() => router.replace(next)} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to SKYMAP?{' '}
        <Link href={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
