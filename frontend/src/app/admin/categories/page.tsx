'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, PageHeader } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, FormField } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  gstRate: string;
  _count: { products: number };
}

type Draft = { name: string; description: string; parentId: string; sortOrder: number; isActive: boolean; isFeatured: boolean; gstRate: number };
const EMPTY: Draft = { name: '', description: '', parentId: '', sortOrder: 0, isActive: true, isFeatured: false, gstRate: 18 };

export default function AdminCategoriesPage() {
  const { data, loading, error, reload } = useApi<Cat[]>('/categories/admin/all');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const start = (c?: Cat) => {
    setEditing(c?.id ?? 'new');
    setDraft(
      c
        ? { name: c.name, description: c.description ?? '', parentId: c.parentId ?? '', sortOrder: c.sortOrder, isActive: c.isActive, isFeatured: c.isFeatured, gstRate: Number(c.gstRate) }
        : EMPTY,
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...draft, description: draft.description || undefined, parentId: draft.parentId || null };
    try {
      if (editing === 'new') await api('/categories', { method: 'POST', body });
      else await api(`/categories/${editing}`, { method: 'PATCH', body });
      toast.success('Category saved');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Cat) => {
    if (!confirm(`Delete category “${c.name}”?`)) return;
    try {
      await api(`/categories/${c.id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  const nameOf = (id: string | null) => data?.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Built-in and custom categories. Sub-categories appear under their parent in the storefront."
        actions={
          <Button onClick={() => start()}>
            <Plus /> Add category
          </Button>
        }
      />
      {editing && (
        <form onSubmit={save} className="mb-5 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Name" htmlFor="cat-name">
            <Input id="cat-name" required minLength={2} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </FormField>
          <FormField label="Parent category" htmlFor="cat-parent">
            <select id="cat-parent" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">
              <option value="">None (top level)</option>
              {data?.filter((c) => c.id !== editing).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Default GST" htmlFor="cat-gst">
            <select id="cat-gst" value={draft.gstRate} onChange={(e) => setDraft({ ...draft, gstRate: Number(e.target.value) })} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="cat-desc">
              <Input id="cat-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Sort order" htmlFor="cat-sort">
            <Input id="cat-sort" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
          </FormField>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="accent-[var(--primary)]" /> Active
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} className="accent-[var(--primary)]" /> Featured on home
            </label>
            <div className="ml-auto flex gap-2">
              <Button type="submit" loading={busy}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}
      <DataTable
        loading={loading}
        error={error}
        empty={!data?.length}
        head={
          <tr>
            <th>Name</th>
            <th>Parent</th>
            <th>Products</th>
            <th>GST</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        }
      >
        {data?.map((c) => (
          <tr key={c.id}>
            <td>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">/{c.slug}</p>
            </td>
            <td>{nameOf(c.parentId) ?? '—'}</td>
            <td>{c._count.products}</td>
            <td>{Number(c.gstRate)}%</td>
            <td className="space-x-1">
              <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Hidden'}</Badge>
              {c.isFeatured && <Badge variant="outline">Featured</Badge>}
            </td>
            <td>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="size-8" aria-label="Edit" onClick={() => start(c)}>
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Delete" onClick={() => remove(c)}>
                  <Trash2 />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
