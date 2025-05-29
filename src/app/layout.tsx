import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

// The imported GeistSans and GeistMono are objects, not functions to be called.
// Their .variable property provides the necessary class name.

export const metadata: Metadata = {
  title: 'CycleBloom - Your Wellness Companion',
  description: 'Track your cycle, get wellness tips, and discover comfort.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
