import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Perpustakaan SDN Jatinegara Kaum 07',
  description: 'Pencatatan kunjungan dan jadwal kunjungan perpustakaan SDN Jatinegara Kaum 07.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f2f3a' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
