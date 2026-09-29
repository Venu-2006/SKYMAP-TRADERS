import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = { title: 'About us' };

export default function AboutPage() {
  return (
    <LegalPage title="About SKYMAP TRADERS">
      <p>
        SKYMAP TRADERS is an online marketplace for businesses and professionals across India. We supply electronics, industrial
        equipment, electrical components, safety products, tools, office supplies and construction materials from trusted brands and
        verified sellers.
      </p>
      <h2>What we stand for</h2>
      <ul>
        <li>Genuine products sourced from authorised distributors and approved sellers</li>
        <li>A GST tax invoice with every order, so businesses can claim input tax credit</li>
        <li>Transparent pricing, secure payments and pan-India delivery</li>
        <li>Real people on WhatsApp, phone and email when you need help</li>
      </ul>
      <h2>Sell with us</h2>
      <p>
        Manufacturers, distributors and dealers can list their catalogue on SKYMAP TRADERS.{' '}
        <Link href="/seller/register" className="font-semibold text-primary hover:underline">
          Apply to become a seller
        </Link>
        .
      </p>
    </LegalPage>
  );
}
