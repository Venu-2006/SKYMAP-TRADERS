import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from './auth-store';

/** Wishlist ids (server-backed) and compare list (local, max 4). */
interface ShopState {
  wishlist: string[];
  compare: string[];
  loadWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean | undefined>;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      compare: [],

      async loadWishlist() {
        if (!useAuthStore.getState().accessToken) {
          set({ wishlist: [] });
          return;
        }
        const { data } = await api<string[]>('/cart/wishlist/ids');
        set({ wishlist: data });
      },

      async toggleWishlist(productId) {
        if (!useAuthStore.getState().accessToken) {
          toast.info('Sign in to save items to your wishlist');
          return undefined;
        }
        const { data } = await api<{ wishlisted: boolean }>(`/cart/wishlist/${productId}`, { method: 'POST' });
        set((s) => ({ wishlist: data.wishlisted ? [...s.wishlist, productId] : s.wishlist.filter((id) => id !== productId) }));
        toast.success(data.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
        return data.wishlisted;
      },

      toggleCompare(productId) {
        const { compare } = get();
        if (compare.includes(productId)) return set({ compare: compare.filter((id) => id !== productId) });
        if (compare.length >= 4) {
          toast.error('You can compare up to 4 products');
          return;
        }
        set({ compare: [...compare, productId] });
        toast.success('Added to compare', { action: { label: 'Compare now', onClick: () => (window.location.href = '/compare') } });
      },

      clearCompare: () => set({ compare: [] }),
    }),
    { name: 'skymap-shop', partialize: (s) => ({ compare: s.compare }) },
  ),
);
