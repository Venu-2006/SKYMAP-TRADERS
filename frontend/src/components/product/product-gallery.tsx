'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Img = { id: string; url: string; alt: string | null };

/**
 * Thumbnail gallery with hover-to-zoom lens on desktop and a fullscreen
 * lightbox (tap) on mobile.
 */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const current = images[index];
  if (!current) return <div className="aspect-square rounded-2xl bg-muted" />;

  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="scrollbar-none flex gap-2 overflow-x-auto md:max-h-[520px] md:flex-col md:overflow-y-auto">
        {images.map((img, i) => (
          <button
            key={img.id}
            onMouseEnter={() => setIndex(i)}
            onClick={() => setIndex(i)}
            className={cn(
              'relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition md:size-20',
              i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
            )}
            aria-label={`Show image ${i + 1}`}
          >
            <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>

      <div
        className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl border bg-card"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        <Image
          src={current.url}
          alt={current.alt ?? name}
          fill
          priority
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-contain transition-transform duration-200"
          style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
          <Expand className="size-3" /> Hover to zoom · click to expand
        </span>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal onClick={() => setLightbox(false)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Close" onClick={() => setLightbox(false)}>
            <X className="size-8" />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                <ChevronLeft className="size-10" />
              </button>
              <button
                className="absolute right-4 text-white"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                <ChevronRight className="size-10" />
              </button>
            </>
          )}
          <div className="relative size-full max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={current.url} alt={current.alt ?? name} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
