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
      <body>{children}{/* impeccable-live-start */}
<script src="http://localhost:8400/live.js?token=bd7992c8-ca7d-4b61-902e-70125cc8ec7c"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
