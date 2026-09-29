import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { serverFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Frequently asked questions' };
export const revalidate = 300;

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default async function FaqPage() {
  const faqs = await serverFetch<Faq[]>('/marketing/faqs', undefined, 300)
    .then((r) => r.data)
    .catch(() => [] as Faq[]);
  const groups = faqs.reduce<Record<string, Faq[]>>((acc, f) => ((acc[f.category] ??= []).push(f), acc), {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <h1 className="text-3xl font-extrabold">Frequently asked questions</h1>
      <p className="mt-2 text-muted-foreground">
        Can’t find an answer?{' '}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact us
        </Link>{' '}
        or message us on WhatsApp.
      </p>
      <div className="mt-8 space-y-8">
        {Object.entries(groups).map(([category, items]) => (
          <section key={category} id={category.toLowerCase()}>
            <h2 className="mb-3 text-lg font-bold">{category}</h2>
            <div className="divide-y rounded-2xl border bg-card">
              {items.map((f) => (
                <details key={f.id} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {f.question}
                    <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        {!faqs.length && <p className="text-muted-foreground">FAQs are being updated. Please contact support for help.</p>}
      </div>
    </div>
  );
}
