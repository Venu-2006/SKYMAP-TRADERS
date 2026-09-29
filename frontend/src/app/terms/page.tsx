import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="September 2026">
      <p>By using SKYMAP TRADERS you agree to these terms. Please read them carefully.</p>
      <h2>Orders and pricing</h2>
      <ul>
        <li>All prices are in Indian Rupees and include GST unless stated otherwise.</li>
        <li>An order is confirmed when payment succeeds or, for Cash on Delivery, when you place it.</li>
        <li>We may cancel an order if an item is unavailable or mispriced, with a full refund of any amount paid.</li>
      </ul>
      <h2>Cancellations, returns and refunds</h2>
      <ul>
        <li>You can cancel an order any time before it ships.</li>
        <li>Eligible products can be returned within 7 days of delivery if unused and in original packaging.</li>
        <li>Refunds go to the original payment method, usually within 5–7 working days after approval.</li>
      </ul>
      <h2>Sellers</h2>
      <p>
        Some products are sold by independent sellers. Sellers are responsible for the accuracy of their listings. SKYMAP TRADERS
        reviews listings and handles customer support for all orders.
      </p>
      <h2>Accounts</h2>
      <p>Keep your password confidential. We may suspend accounts involved in fraud or abuse.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
    </LegalPage>
  );
}
