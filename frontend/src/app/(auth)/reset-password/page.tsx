'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/misc';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { resetSchema, type ResetValues } from '@/lib/validation';

function ResetForm() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This password reset link is missing or malformed.">
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  const onSubmit = async ({ password }: ResetValues) => {
    try {
      const { data } = await authApi.resetPassword(token, password);
      toast.success(data.message);
      router.replace('/login');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Unable to reset password');
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="You’ll be signed out of all other devices.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="New password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
