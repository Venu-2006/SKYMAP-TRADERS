'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploader, type UploadedImage } from '@/components/admin/image-uploader';
import { PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, FormField, Skeleton } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminBannersPage() {
  const { data, loading, reload } = useApi<Banner[]>('/admin/banners');
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<UploadedImage[]>([]);
  const [form, setForm] = useState({ title: '', subtitle: '', linkUrl: '', position: 'HERO', sortOrder: '0' });
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image[0]) return toast.error('Upload a banner image (1400×700 recommended)');
    setBusy(true);
    try {
      await api('/admin/banners', {
        method: 'POST',
        body: { ...form, subtitle: form.subtitle || undefined, linkUrl: form.linkUrl || undefined, sortOrder: Number(form.sortOrder), imageUrl: image[0].url },
      });
      toast.success('Banner published');
      setOpen(false);
      setImage([]);
      setForm({ title: '', subtitle: '', linkUrl: '', position: 'HERO', sortOrder: '0' });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (b: Banner) => {
    await api(`/admin/banners/${b.id}`, { method: 'PATCH', body: { isActive: !b.isActive } }).catch(() => toast.error('Update failed'));
    reload();
  };
  const remove = async (b: Banner) => {
    if (!confirm(`Delete banner “${b.title}”?`)) return;
    await api(`/admin/banners/${b.id}`, { method: 'DELETE' }).catch(() => toast.error('Delete failed'));
    reload();
  };

  return (
    <>
      <PageHeader
        title="Banners"
        description="Home page hero slides. When none are active, the default slides are shown."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New banner
          </Button>
        }
      />
      {open && (
        <form onSubmit={create} className="mb-5 space-y-4 rounded-2xl border bg-card p-5">
          <ImageUploader value={image} onChange={(v) => setImage(v.slice(-1))} max={1} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" htmlFor="b-title">
              <Input id="b-title" required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormField>
            <FormField label="Subtitle" htmlFor="b-sub">
              <Input id="b-sub" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </FormField>
            <FormField label="Link (e.g. /products?category=safety-products)" htmlFor="b-link">
              <Input id="b-link" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
            </FormField>
            <FormField label="Order" htmlFor="b-order">
              <Input id="b-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>
              Publish
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No banners yet — the storefront is showing the default slides.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="relative aspect-[21/8] bg-muted">
                <Image src={b.imageUrl} alt="" fill sizes="50vw" className="object-cover" />
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    #{b.sortOrder} · {b.linkUrl ?? 'no link'}
                  </p>
                </div>
                <button onClick={() => toggle(b)} aria-label="Toggle active">
                  <Badge variant={b.isActive ? 'success' : 'secondary'}>{b.isActive ? 'Live' : 'Hidden'}</Badge>
                </button>
                <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Delete" onClick={() => remove(b)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
