import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="September 2026">
      <p>This policy explains what personal data SKYMAP TRADERS collects, why, and the choices you have.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: name, email, mobile number and, if you sign in with Google, your Google profile name and photo</li>
        <li>Order details: delivery and billing addresses, GSTIN (if provided) and the products you buy</li>
        <li>Payment status from Razorpay. We never see or store your card, UPI or bank credentials</li>
        <li>Browsing activity on our site (products viewed, searches) to show relevant recommendations</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To process and deliver orders, issue GST invoices, and handle returns and refunds</li>
        <li>To send order updates and, if you subscribe, offers you can unsubscribe from at any time</li>
        <li>To keep accounts secure and prevent fraud</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We share only what is needed with delivery partners, payment processors and, for marketplace orders, the seller who fulfils
        your items. We do not sell your personal data.
      </p>
      <h2>Your rights</h2>
      <p>You can view and update your profile and addresses at any time, and ask us to delete your account by contacting support.</p>
      <h2>Contact</h2>
      <p>For privacy questions, email support@skymaptraders.com.</p>
    </LegalPage>
  );
}
