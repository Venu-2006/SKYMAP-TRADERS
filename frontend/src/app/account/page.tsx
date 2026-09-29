'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Copy, KeyRound, MailWarning, ShieldCheck, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, FormField } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';
import type { User } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { passwordSchema } from '@/lib/validation';
import { useAuthStore } from '@/store/auth-store';

const LANGUAGES = [
  ['en', 'English'],
  ['hi', 'हिन्दी'],
  ['ta', 'தமிழ்'],
  ['te', 'తెలుగు'],
  ['kn', 'ಕನ್ನಡ'],
  ['mr', 'मराठी'],
  ['bn', 'বাংলা'],
] as const;

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: z.string().trim().regex(/^([6-9]\d{9})?$/, 'Enter a valid 10-digit mobile number'),
  locale: z.enum(['en', 'hi', 'ta', 'te', 'kn', 'mr', 'bn']),
});
type ProfileValues = z.infer<typeof profileSchema>;

const pwSchema = z.object({ currentPassword: z.string(), newPassword: passwordSchema });
type PwValues = z.infer<typeof pwSchema>;

const toastError = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Pull fresh profile data (e.g. email verified in another tab).
  useEffect(() => {
    authApi.me().catch(() => undefined);
  }, []);

  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user.name, phone: user.phone ?? '', locale: user.locale as ProfileValues['locale'] },
  });
  const pw = useForm<PwValues>({ resolver: zodResolver(pwSchema), defaultValues: { currentPassword: '', newPassword: '' } });

  const saveProfile = async (v: ProfileValues) => {
    try {
      const { data } = await api<User>('/users/me', { method: 'PATCH', body: { ...v, phone: v.phone || null } });
      setUser(data);
      toast.success('Profile updated');
    } catch (e) {
      toastError(e, 'Could not update profile');
    }
  };

  const changePassword = async (v: PwValues) => {
    try {
      await api('/users/me/password', { method: 'POST', body: v });
      pw.reset();
      toast.success('Password changed');
    } catch (e) {
      toastError(e, 'Could not change password');
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');
    const form = new FormData();
    form.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await api<User>('/users/me/avatar', { method: 'POST', body: form });
      setUser(data);
      toast.success('Photo updated');
    } catch (e) {
      toastError(e, 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.resendVerification(user.email);
      toast.success('Verification email sent');
    } catch (e) {
      toastError(e, 'Could not send email');
    }
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user.referralCode}` : '';

  return (
    <div className="container-page space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-5">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative grid size-20 place-items-center overflow-hidden rounded-2xl bg-primary text-3xl font-bold text-primary-foreground"
          aria-label="Change profile photo"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.name[0]?.toUpperCase()
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Camera className="size-6 text-white" />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
        <div>
          <h1 className="text-2xl font-extrabold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
            {user.emailVerified ? (
              <Badge variant="success">
                <ShieldCheck className="size-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="warning">Unverified</Badge>
            )}
          </div>
        </div>
      </div>

      {!user.emailVerified && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <MailWarning className="size-5" />
          <span className="flex-1">Please verify your email to place orders and receive invoices.</span>
          <Button size="sm" variant="outline" onClick={resend}>
            Resend link
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="size-5" /> Personal details
            </CardTitle>
            <CardDescription>Used for delivery updates and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
              <FormField label="Full name" htmlFor="name" error={profile.formState.errors.name?.message}>
                <Input id="name" {...profile.register('name')} />
              </FormField>
              <FormField label="Mobile number" htmlFor="phone" error={profile.formState.errors.phone?.message}>
                <Input id="phone" inputMode="numeric" maxLength={10} {...profile.register('phone')} />
              </FormField>
              <FormField label="Language" htmlFor="locale">
                <select id="locale" className="h-10 w-full rounded-lg border bg-card px-3 text-sm" {...profile.register('locale')}>
                  {LANGUAGES.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button type="submit" loading={profile.formState.isSubmitting} disabled={!profile.formState.isDirty}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="size-5" /> {user.provider === 'GOOGLE' ? 'Set a password' : 'Change password'}
              </CardTitle>
              {user.provider === 'GOOGLE' && <CardDescription>You signed up with Google. Add a password to also sign in by email.</CardDescription>}
            </CardHeader>
            <CardContent>
              <form onSubmit={pw.handleSubmit(changePassword)} className="space-y-4" noValidate>
                {user.provider !== 'GOOGLE' && (
                  <FormField label="Current password" htmlFor="currentPassword">
                    <PasswordInput id="currentPassword" autoComplete="current-password" {...pw.register('currentPassword')} />
                  </FormField>
                )}
                <FormField label="New password" htmlFor="newPassword" error={pw.formState.errors.newPassword?.message}>
                  <PasswordInput id="newPassword" autoComplete="new-password" {...pw.register('newPassword')} />
                </FormField>
                <Button type="submit" variant="secondary" loading={pw.formState.isSubmitting}>
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card id="referral" className="bg-gradient-to-br from-accent to-card">
            <CardHeader>
              <CardTitle className="text-lg">Refer &amp; earn</CardTitle>
              <CardDescription>
                Share your code — friends get a welcome discount and you earn wallet credit on their first order. Wallet balance:{' '}
                <strong className="text-foreground">{formatPrice(user.walletBalance)}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input readOnly value={referralLink} aria-label="Referral link" />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy referral link"
                onClick={() => navigator.clipboard.writeText(referralLink).then(() => toast.success('Link copied'))}
              >
                <Copy />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
