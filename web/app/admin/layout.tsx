import type { ReactNode } from 'react';

import { AdminShell } from '@/components/admin-shell';
import { AdminSessionProvider } from '@/hooks/auth/use-admin-session';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
