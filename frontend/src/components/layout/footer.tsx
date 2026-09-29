import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from './header';

const columns = [
  {
    title: 'Shop',
    links: [
      ['Electronics', '/products?category=electronics'],
      ['Industrial Equipment', '/products?category=industrial-equipment'],
      ['Safety Products', '/products?category=safety-products'],
      ['Tools & Hardware', '/products?category=tools-hardware'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['Track order', '/account/orders'],
      ['Returns & refunds', '/faq#returns'],
      ['FAQ', '/faq'],
      ['Contact us', '/contact'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About SKYMAP', '/about'],
      ['Sell on SKYMAP', '/seller/register'],
      ['Refer & earn', '/account#referral'],
      ['Privacy policy', '/privacy'],
      ['Terms of use', '/terms'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            India’s trusted B2B &amp; B2C marketplace for electronics, industrial equipment, electrical and safety supplies — with GST
            invoicing on every order.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="size-4 shrink-0" /> SKYMAP TRADERS, India
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0" /> Mon–Sat, 9:30am–6:30pm
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0" /> support@skymaptraders.com
            </li>
          </ul>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-bold">{col.title}</h4>
            <ul className="space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-muted-foreground transition hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SKYMAP TRADERS. All rights reserved. · Secure payments by Razorpay
      </div>
    </footer>
  );
}
