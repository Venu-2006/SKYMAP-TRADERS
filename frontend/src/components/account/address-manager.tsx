'use client';

import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, FormField, Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import type { Address } from '@/lib/types';
import { cn } from '@/lib/utils';

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const schema = z.object({
  type: z.enum(['HOME', 'WORK', 'OTHER']),
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1: z.string().trim().min(3, 'Enter house / building and street').max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().min(2, 'Select a state'),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, 'Enter a valid GSTIN')
    .optional(),
  isDefault: z.boolean(),
});
type Values = z.infer<typeof schema>;

function AddressForm({ initial, onSaved, onCancel }: { initial?: Address; onSaved: (a: Address) => void; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initial?.type ?? 'HOME',
      fullName: initial?.fullName ?? '',
      phone: initial?.phone ?? '',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      landmark: initial?.landmark ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      pincode: initial?.pincode ?? '',
      gstin: initial?.gstin ?? '',
      isDefault: initial?.isDefault ?? false,
    },
  });

  const onSubmit = async (v: Values) => {
    const body = { ...v, line2: v.line2 || undefined, landmark: v.landmark || undefined, gstin: v.gstin || undefined };
    try {
      const { data } = initial
        ? await api<Address>(`/users/me/addresses/${initial.id}`, { method: 'PATCH', body })
        : await api<Address>('/users/me/addresses', { method: 'POST', body });
      toast.success('Address saved');
      onSaved(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save address');
    }
  };

  const field = (name: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <FormField label={label} htmlFor={`addr-${name}`} error={errors[name]?.message}>
      <Input id={`addr-${name}`} aria-invalid={!!errors[name]} {...props} {...register(name)} />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2" noValidate>
      {field('fullName', 'Full name', { autoComplete: 'name' })}
      {field('phone', 'Mobile number', { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' })}
      <div className="sm:col-span-2">{field('line1', 'House no., building, street', { autoComplete: 'address-line1' })}</div>
      {field('line2', 'Area / locality (optional)', { autoComplete: 'address-line2' })}
      {field('landmark', 'Landmark (optional)')}
      {field('city', 'City', { autoComplete: 'address-level2' })}
      <FormField label="State" htmlFor="addr-state" error={errors.state?.message}>
        <select id="addr-state" className="h-10 w-full rounded-lg border bg-card px-3 text-sm" {...register('state')}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </FormField>
      {field('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
      {field('gstin', 'GSTIN (optional, for business invoice)', { className: 'uppercase', maxLength: 15 })}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        {(['HOME', 'WORK', 'OTHER'] as const).map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-sm">
            <input type="radio" value={t} {...register('type')} className="accent-[var(--primary)]" /> {t[0] + t.slice(1).toLowerCase()}
          </label>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register('isDefault')} className="accent-[var(--primary)]" /> Make default
        </label>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={isSubmitting}>
          Save address
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Lists, adds, edits and deletes saved addresses. When `onSelect` is passed
 * (checkout), addresses become selectable radio cards.
 */
export function AddressManager({ selectedId, onSelect }: { selectedId?: string; onSelect?: (a: Address) => void }) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  const load = () =>
    api<Address[]>('/users/me/addresses').then((r) => {
      setAddresses(r.data);
      if (!r.data.length) setEditing('new');
      if (onSelect && !selectedId && r.data[0]) onSelect(r.data.find((a) => a.isDefault) ?? r.data[0]);
      return r.data;
    });

  useEffect(() => {
    load().catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (a: Address) => {
    if (!confirm(`Delete the address for ${a.fullName}?`)) return;
    try {
      await api(`/users/me/addresses/${a.id}`, { method: 'DELETE' });
      await load();
      toast.success('Address deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not delete');
    }
  };

  if (!addresses) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      {addresses.map((a) =>
        editing !== 'new' && editing?.id === a.id ? (
          <AddressForm
            key={a.id}
            initial={a}
            onCancel={() => setEditing(null)}
            onSaved={async (saved) => {
              setEditing(null);
              await load();
              onSelect?.(saved);
            }}
          />
        ) : (
          <div
            key={a.id}
            role={onSelect ? 'radio' : undefined}
            aria-checked={onSelect ? selectedId === a.id : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={() => onSelect?.(a)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect?.(a)}
            className={cn(
              'flex gap-3 rounded-xl border bg-card p-4 transition',
              onSelect && 'cursor-pointer hover:border-primary/60',
              selectedId === a.id && 'border-primary ring-2 ring-primary/20',
            )}
          >
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.fullName}</span>
                <Badge variant="secondary">{a.type}</Badge>
                {a.isDefault && <Badge variant="outline">Default</Badge>}
                <span className="text-muted-foreground">{a.phone}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {[a.line1, a.line2, a.landmark, a.city, a.state].filter(Boolean).join(', ')} — {a.pincode}
              </p>
              {a.gstin && <p className="text-xs text-muted-foreground">GSTIN: {a.gstin}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Edit address"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(a);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                aria-label="Delete address"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ),
      )}

      {editing === 'new' ? (
        <AddressForm
          onCancel={() => setEditing(addresses.length ? null : 'new')}
          onSaved={async (saved) => {
            setEditing(null);
            await load();
            onSelect?.(saved);
          }}
        />
      ) : (
        <Button variant="outline" onClick={() => setEditing('new')}>
          <Plus /> Add new address
        </Button>
      )}
    </div>
  );
}
