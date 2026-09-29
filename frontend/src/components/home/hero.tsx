'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
}

/** Fallback slides used until admins upload banners in the Banner manager. */
const DEFAULT_SLIDES: Banner[] = [
  {
    id: 'd1',
    title: 'Power tools for every job site',
    subtitle: 'Up to 40% off Bosch, Stanley & more — with GST invoice',
    imageUrl: 'https://picsum.photos/seed/skymap-tools/1400/700',
    linkUrl: '/products?category=tools-hardware',
  },
  {
    id: 'd2',
    title: 'Safety first. Always.',
    subtitle: 'Certified helmets, respirators and PPE kits from ₹199',
    imageUrl: 'https://picsum.photos/seed/skymap-safety/1400/700',
    linkUrl: '/products?category=safety-products',
  },
  {
    id: 'd3',
    title: 'Wire up with confidence',
    subtitle: 'MCBs, RCCBs and FR cables from Havells, Polycab & Schneider',
    imageUrl: 'https://picsum.photos/seed/skymap-electric/1400/700',
    linkUrl: '/products?category=electrical-components',
  },
];

export function Hero({ banners }: { banners: Banner[] }) {
  const slides = banners.length ? banners : DEFAULT_SLIDES;
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="container-page pt-5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted shadow-lg sm:aspect-[21/8]">
        {slides.map((s, n) => (
          <div key={s.id} className={cn('absolute inset-0 transition-opacity duration-700', n === i ? 'opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={n !== i}>
            <Image src={s.imageUrl} alt="" fill priority={n === 0} sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 text-white sm:max-w-xl sm:p-12">
              <h1 className={cn('text-2xl font-extrabold leading-tight sm:text-5xl', n === i && 'animate-fade-up')}>{s.title}</h1>
              {s.subtitle && <p className="text-sm text-white/85 sm:text-lg">{s.subtitle}</p>}
              {s.linkUrl && (
                <Button asChild size="lg" className="mt-2 w-fit">
                  <Link href={s.linkUrl}>
                    Shop now <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((s, n) => (
            <button
              key={s.id}
              onClick={() => setI(n)}
              className={cn('h-2 rounded-full bg-white/60 transition-all', n === i ? 'w-8 bg-white' : 'w-2')}
              aria-label={`Show slide ${n + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
