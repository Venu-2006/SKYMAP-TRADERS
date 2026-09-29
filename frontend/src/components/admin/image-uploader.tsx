'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

export interface UploadedImage {
  url: string;
  publicId?: string;
  alt?: string;
}

/** Multi-image uploader with reordering; the first image is the product's main photo. */
export function ImageUploader({ value, onChange, max = 10 }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - value.length);
    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) return toast.error(`${tooBig.name} is larger than 5 MB`);
    const form = new FormData();
    list.forEach((f) => form.append('images', f));
    setUploading(true);
    try {
      const { data } = await api<UploadedImage[]>('/products/manage/images', { method: 'POST', body: form });
      onChange([...value, ...data.map((d) => ({ url: d.url, publicId: d.publicId }))]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {value.map((img, i) => (
        <div key={img.url} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
          {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">MAIN</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-white disabled:opacity-30" aria-label="Move left">
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} className="text-white" aria-label="Remove image">
              <X className="size-4" />
            </button>
            <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="text-white disabled:opacity-30" aria-label="Move right">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
        >
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {uploading ? 'Uploading…' : 'Add images'}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
