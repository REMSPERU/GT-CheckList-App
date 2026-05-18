import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Admin GEMA-CheckList',
  description: 'Portal administrativo de GEMA-CheckList',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dcebf2_0%,#f4f6fb_35%)] font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif] text-slate-900">
        {children}
      </body>
    </html>
  );
}
