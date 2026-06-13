import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Words That Matter — Gather memories into one tribute',
  description:
    'Start a collection, invite family and friends to share their memories, and turn them into one heartfelt tribute. For memorials, weddings, retirements, and the moments that matter.',
  alternates: { canonical: 'https://wordsbywtm.com' },
  openGraph: {
    title: 'Words That Matter',
    description: 'Gather memories from everyone who matters into one tribute.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
