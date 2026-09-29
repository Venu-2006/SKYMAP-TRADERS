import { toast } from 'sonner';
import { API_URL, ApiError, refreshSession } from './api';
import { useAuthStore } from '@/store/auth-store';

/**
 * Opens the GST invoice in a new tab. The endpoint needs the bearer token,
 * so we fetch it and open the HTML as a blob (the page has a Print / Save as PDF button).
 */
export async function openInvoice(orderId: string) {
  const win = window.open('', '_blank'); // open synchronously so pop-up blockers allow it
  const get = () =>
    fetch(`${API_URL}/orders/${orderId}/invoice`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}` },
      credentials: 'include',
    });
  try {
    let res = await get();
    if (res.status === 401 && (await refreshSession())) res = await get();
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message ?? 'Invoice unavailable');
    }
    const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/html' }));
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (e) {
    win?.close();
    toast.error(e instanceof ApiError ? e.message : 'Could not open invoice');
  }
}
