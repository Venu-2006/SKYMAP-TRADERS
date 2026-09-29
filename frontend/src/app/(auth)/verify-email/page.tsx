'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

function Verify() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Verification link is missing.');
  const ran = useRef(false); // StrictMode double-invokes effects; tokens are single-use.

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setState('ok');
        const { user, setUser } = useAuthStore.getState();
        if (user) setUser({ ...user, emailVerified: true });
      })
      .catch((e) => {
        setState('error');
        setMessage(e instanceof ApiError ? e.message : 'Verification failed');
      });
  }, [token]);

  return (
    <AuthShell title="Email verification">
      <div className="space-y-5 text-center">
        {state === 'loading' && <Loader2 className="mx-auto size-12 animate-spin text-primary" />}
        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto size-14 text-success" />
            <p>Your email is verified. You’re all set!</p>
            <Button asChild className="w-full">
              <Link href="/">Start shopping</Link>
            </Button>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="mx-auto size-14 text-destructive" />
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/account">Resend from your profile</Link>
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
