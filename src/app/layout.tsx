import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Instrument_Serif } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SiteAnalytics } from '@/components/SiteAnalytics';
import { ConsentBanner } from '@/components/ConsentBanner';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  // www canonical host — matches robots/sitemap and the live apex→www redirect,
  // so OG/SEO host signals don't split.
  metadataBase: new URL('https://www.wordsbywtm.com'),
  title: 'Words That Matter — Gather memories into one piece',
  description:
    'Start a collection, invite the people who matter to share their memories, and weave them into one heartfelt piece. For memorials, weddings, retirements, and the moments that matter.',
  alternates: { canonical: 'https://www.wordsbywtm.com' },
  openGraph: {
    title: 'Words That Matter',
    description: 'Gather memories from everyone who matters into one piece.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Words That Matter',
    description: 'Gather memories from everyone who matters into one piece.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${instrumentSerif.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        {children}
        <Analytics />
        <SiteAnalytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
