import { useAuthStore } from '@/store/auth-store';
import { api } from './api';
import type { Session, User } from './types';

/** Auth API calls. Each successful login stores the session in the auth store. */
export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api<Session>('/auth/login', { method: 'POST', body: { email, password } });
    useAuthStore.getState().setSession(data);
    return data.user;
  },

  async register(input: { name: string; email: string; password: string; phone?: string; referralCode?: string }) {
    const { data } = await api<Session>('/auth/register', { method: 'POST', body: input });
    useAuthStore.getState().setSession(data);
    return data.user;
  },

  async google(credential: string, referralCode?: string) {
    const { data } = await api<Session>('/auth/google', { method: 'POST', body: { credential, referralCode } });
    useAuthStore.getState().setSession(data);
    return data.user;
  },

  async logout() {
    try {
      await api('/auth/logout', { method: 'POST', csrf: true });
    } finally {
      useAuthStore.getState().clear();
    }
  },

  forgotPassword: (email: string) => api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password } }),
  verifyEmail: (token: string) => api<{ message: string }>('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email: string) => api<{ message: string }>('/auth/resend-verification', { method: 'POST', body: { email } }),

  async me() {
    const { data } = await api<User>('/users/me');
    useAuthStore.getState().setUser(data);
    return data;
  },
};

/** Client-side password rule, mirrors the backend zod schema. */
export const PASSWORD_HINT = 'At least 8 characters with uppercase, lowercase and a number';
