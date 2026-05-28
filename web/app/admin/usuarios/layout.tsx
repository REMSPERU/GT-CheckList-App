'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAdminSession } from '@/hooks/auth/use-admin-session';

interface AdminUsersLayoutProps {
  children: ReactNode;
}

export default function AdminUsersLayout({ children }: AdminUsersLayoutProps) {
  const router = useRouter();
  const { user, isCheckingSession } = useAdminSession();

  useEffect(() => {
    if (!isCheckingSession && user?.role !== 'SUPERADMIN') {
      router.replace('/admin');
    }
  }, [isCheckingSession, router, user?.role]);

  if (isCheckingSession || user?.role !== 'SUPERADMIN') {
    return (
      <main className="grid min-h-[360px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p className="text-sm font-semibold text-slate-500">
          Validando permisos...
        </p>
      </main>
    );
  }

  return children;
}
