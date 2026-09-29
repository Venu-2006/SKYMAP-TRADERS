import { useAuthStore } from '@/store/auth-store';
import type { Session } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export interface ApiResponse<T, M = unknown> {
  success: boolean;
  data: T;
  meta?: M;
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export const toQueryString = (query?: Query) => {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
};

async function parse<T, M>(res: Response): Promise<ApiResponse<T, M>> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`, body.details);
  }
  return body;
}

// ───────────── Server-side fetch (RSC) — public, cacheable ─────────────

/** For Server Components: public endpoints with ISR-style revalidation. */
export async function serverFetch<T, M = unknown>(path: string, query?: Query, revalidate = 60) {
  const res = await fetch(`${API_URL}${path}${toQueryString(query)}`, { next: { revalidate } });
  return parse<T, M>(res);
}

// ───────────── Client-side fetch with silent refresh ─────────────

let refreshing: Promise<boolean> | null = null;

/** Exchanges the httpOnly refresh cookie for a new access token. De-duplicated across callers. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { csrfToken, setSession, clear } = useAuthStore.getState();
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (!res.ok) throw new Error('refresh failed');
      const body = (await res.json()) as ApiResponse<Session>;
      setSession(body.data);
      return true;
    } catch {
      clear();
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Query;
  body?: unknown;
  /** Send CSRF header (cookie-authenticated routes). */
  csrf?: boolean;
}

export async function api<T, M = unknown>(path: string, opts: RequestOptions = {}, retried = false): Promise<ApiResponse<T, M>> {
  const { query, body, csrf, headers, ...init } = opts;
  const { accessToken, csrfToken } = useAuthStore.getState();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(csrf && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  // Access token expired → refresh once and replay.
  if (res.status === 401 && !retried && useAuthStore.getState().user && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T, M>(path, opts, true);
  }
  return parse<T, M>(res);
}

/** Anonymous session id used for view tracking before login. */
export const getSessionId = () => {
  if (typeof window === 'undefined') return undefined;
  let id = localStorage.getItem('skymap-sid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('skymap-sid', id);
  }
  return id;
};
