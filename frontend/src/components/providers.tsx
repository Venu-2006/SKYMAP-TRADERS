'use client';

import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { refreshSession } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useShopStore } from '@/store/shop-store';
import { I18nProvider } from '@/lib/i18n';

/** Restores the session from the refresh cookie once on page load. */
function SessionBootstrap() {
  useEffect(() => {
    const { user, setHydrated } = useAuthStore.getState();
    if (user) refreshSession().finally(setHydrated);
    else setHydrated();
  }, []);
  return null;
}

/** Loads the server cart + wishlist on sign-in (merging the guest cart) and clears them on sign-out. */
function ShopSync() {
  const userId = useAuthStore((s) => (s.accessToken ? s.user?.id : undefined));
  useEffect(() => {
    if (userId) {
      useCartStore.getState().mergeGuestCart();
      useShopStore.getState().loadWishlist().catch(() => undefined);
    } else if (useCartStore.getState().items.some((i) => i.id)) {
      useCartStore.getState().resetLocal();
      useShopStore.setState({ wishlist: [] });
    }
  }, [userId]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider>
      <SessionBootstrap />
      <ShopSync />
      {children}
      <Toaster richColors closeButton position="top-center" />
      </I18nProvider>
    </ThemeProvider>
  );
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider> : content;
}
