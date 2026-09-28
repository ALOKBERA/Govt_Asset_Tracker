import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RNB AssetTrail | Roads & Buildings Department, Govt of Gujarat',
  description:
    'End-to-end infrastructure asset registry and lifecycle management system for Roads, Bridges, Buildings, and Equipment in Gujarat.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
