'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/misc';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { emailSchema } from '@/lib/validation';

const schema = z.object({ email: emailSchema });

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: z.infer<typeof schema>) => {
    try {
      await authApi.forgotPassword(email);
      setSentTo(email);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox">
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-14 text-success" />
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong className="text-foreground">{sentTo}</strong>, we’ve sent a link to reset your password. It
            expires in 30 minutes.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we’ll send you a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Send reset link
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
