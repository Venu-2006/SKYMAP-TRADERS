'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';

/** Google Identity Services button; posts the ID token to our API for verification. */
export function GoogleButton({ onSuccess, referralCode }: { onSuccess: () => void; referralCode?: string }) {
  const { resolvedTheme } = useTheme();
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <GoogleLogin
          theme={resolvedTheme === 'dark' ? 'filled_black' : 'outline'}
          size="large"
          shape="pill"
          width="320"
          text="continue_with"
          onSuccess={async ({ credential }) => {
            if (!credential) return;
            try {
              const user = await authApi.google(credential, referralCode);
              toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
              onSuccess();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : 'Google sign-in failed');
            }
          }}
          onError={() => toast.error('Google sign-in was cancelled or failed')}
        />
      </div>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
