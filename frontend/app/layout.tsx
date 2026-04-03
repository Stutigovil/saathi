import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sathi — Warm AI Companion',
  description: 'Daily AI companion calls for elderly loved ones'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-white">{children}</body>
    </html>
  );
}
