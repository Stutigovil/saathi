import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Saathi — Warm AI Companion for Your Elders',
  description: 'Daily AI companion calls for elderly loved ones. Saathi calls every evening in Hindi, remembers everything, and keeps your family connected.',
  keywords: ['elderly care', 'AI companion', 'family', 'Hindi', 'voice calls', 'mental health'],
  authors: [{ name: 'Saathi Team' }]
};

export const viewport: Viewport = {
  themeColor: '#0b0f1a',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-background font-body text-white antialiased">
        <div className="particles-bg" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
