// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { clientConfig } from '@/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(clientConfig.company.platformUrl || 'http://localhost:3000'),
  title: clientConfig.company.name + ' | AI Pitch Coaching',
  description: clientConfig.company.description,
  keywords: ['pitch deck', 'fundraising', 'startup', 'investor', 'storytelling'],
  authors: [{ name: clientConfig.company.name, url: clientConfig.company.website }],
  creator: clientConfig.company.tagline,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: clientConfig.company.platformUrl,
    siteName: clientConfig.company.name + ' Pitch Portal',
    title: clientConfig.company.name + ' | AI Pitch Coaching',
    description: clientConfig.company.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: clientConfig.company.name + ' | AI Pitch Coaching',
    description: clientConfig.company.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
