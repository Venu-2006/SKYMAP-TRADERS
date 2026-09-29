import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', weight: ['600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'SKYMAP TRADERS — Industrial, Electrical & Electronics Marketplace', template: '%s | SKYMAP TRADERS' },
  description:
    'Shop electronics, industrial equipment, electrical components, safety products, tools and office supplies at the best prices with GST invoice.',
  openGraph: { type: 'website', siteName: 'SKYMAP TRADERS', locale: 'en_IN' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#16171f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
