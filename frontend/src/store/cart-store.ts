import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from './auth-store';

/**
 * Cart store. Signed-in users use the server cart (source of truth, live
 * prices, coupons). Guests use a localStorage cart that is merged into the
 * server cart on login.
 */
export interface CartLine {
  id?: string; // server cart item id
  productId: string;
  slug: string;
  name: string;
  image?: string;
  price: number;
  mrp: number;
  quantity: number;
  stock: number;
  savedForLater?: boolean;
  available?: boolean;
}

export interface CartSummary {
  itemCount: number;
  mrpTotal: number;
  savings: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

interface ServerCart {
  items: CartLine[];
  coupon: { code: string; description: string | null; error?: string } | null;
  summary: CartSummary;
}

interface CartState {
  items: CartLine[];
  coupon: ServerCart['coupon'];
  serverSummary: CartSummary | null;
  loading: boolean;
  load: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  add: (line: Omit<CartLine, 'quantity'>, qty?: number) => Promise<boolean>;
  remove: (productId: string) => Promise<void>;
  setQuantity: (productId: string, qty: number) => Promise<void>;
  toggleSaveForLater: (productId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  resetLocal: () => void;
}

const signedIn = () => !!useAuthStore.getState().accessToken;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const setServer = (c: ServerCart) => set({ items: c.items, coupon: c.coupon, serverSummary: c.summary });
      const run = async (fn: () => Promise<{ data: ServerCart }>) => {
        try {
          setServer((await fn()).data);
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'Could not update cart');
          throw e;
        }
      };
      const itemId = (productId: string) => get().items.find((i) => i.productId === productId)?.id;

      return {
        items: [],
        coupon: null,
        serverSummary: null,
        loading: false,

        async load() {
          if (!signedIn()) return;
          set({ loading: true });
          try {
            setServer((await api<ServerCart>('/cart')).data);
          } finally {
            set({ loading: false });
          }
        },

        async mergeGuestCart() {
          const guest = get().items.filter((i) => !i.id);
          if (!signedIn()) return;
          if (!guest.length) return get().load();
          await run(() =>
            api<ServerCart>('/cart/merge', {
              method: 'POST',
              body: { items: guest.map((g) => ({ productId: g.productId, quantity: g.quantity, savedForLater: !!g.savedForLater })) },
            }),
          ).catch(() => undefined);
        },

        async add(line, qty = 1) {
          if (signedIn()) {
            try {
              await run(() => api<ServerCart>('/cart/items', { method: 'POST', body: { productId: line.productId, quantity: qty } }));
              return true;
            } catch {
              return false;
            }
          }
          set((s) => {
            const existing = s.items.find((i) => i.productId === line.productId);
            if (existing) {
              return {
                items: s.items.map((i) =>
                  i.productId === line.productId ? { ...i, quantity: Math.min(i.quantity + qty, line.stock), savedForLater: false } : i,
                ),
              };
            }
            return { items: [...s.items, { ...line, quantity: Math.min(qty, line.stock) }] };
          });
          return true;
        },

        async remove(productId) {
          const id = itemId(productId);
          if (signedIn() && id) return run(() => api<ServerCart>(`/cart/items/${id}`, { method: 'DELETE' }));
          set((s) => ({ items: s.items.filter((i) => i.productId !== productId) }));
        },

        async setQuantity(productId, qty) {
          const id = itemId(productId);
          if (signedIn() && id) return run(() => api<ServerCart>(`/cart/items/${id}`, { method: 'PATCH', body: { quantity: qty } }));
          set((s) => ({
            items: s.items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i)),
          }));
        },

        async toggleSaveForLater(productId) {
          const line = get().items.find((i) => i.productId === productId);
          if (!line) return;
          if (signedIn() && line.id) {
            return run(() => api<ServerCart>(`/cart/items/${line.id}`, { method: 'PATCH', body: { savedForLater: !line.savedForLater } }));
          }
          set((s) => ({ items: s.items.map((i) => (i.productId === productId ? { ...i, savedForLater: !i.savedForLater } : i)) }));
        },

        async applyCoupon(code) {
          await run(() => api<ServerCart>('/cart/coupon', { method: 'POST', body: { code } }));
        },
        async removeCoupon() {
          await run(() => api<ServerCart>('/cart/coupon', { method: 'DELETE' }));
        },

        resetLocal: () => set({ items: [], coupon: null, serverSummary: null }),
      };
    },
    // Only the guest cart is persisted; the server cart is reloaded on sign-in.
    { name: 'skymap-cart', partialize: (s) => ({ items: s.items.filter((i) => !i.id) }) },
  ),
);

export const selectCartCount = (s: CartState) => s.items.filter((i) => !i.savedForLater).reduce((n, i) => n + i.quantity, 0);

/** Guest-side totals (mirrors the server rules: free standard shipping from ₹999). */
export function localSummary(items: CartLine[]): CartSummary {
  const active = items.filter((i) => !i.savedForLater);
  const subtotal = active.reduce((s, i) => s + i.price * i.quantity, 0);
  const mrpTotal = active.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const shipping = active.length && subtotal < 999 ? 49 : 0;
  return {
    itemCount: active.reduce((n, i) => n + i.quantity, 0),
    mrpTotal,
    savings: mrpTotal - subtotal,
    subtotal,
    discount: 0,
    shipping,
    total: subtotal + shipping,
  };
}
