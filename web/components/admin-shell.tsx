'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';

interface AdminShellProps {
  children: ReactNode;
}

interface AdminUser {
  email: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/equipos', label: 'Equipos' },
  { href: '/admin/inmuebles', label: 'Inmuebles' },
  { href: '/admin/mantenimientos', label: 'Mantenimientos' },
  { href: '/admin/checklist', label: 'Checklist' },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      setUser({ email: session.user.email ?? 'Usuario' });
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (isCheckingSession) {
    return (
      <main className="admin-loading">
        <div className="loading-mark" />
        <p>Validando sesion...</p>
      </main>
    );
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span>GT</span>
          <strong>CheckList Admin</strong>
        </Link>

        <nav className="admin-nav" aria-label="Navegacion administrativa">
          {NAV_ITEMS.map(item => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'active' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">Panel web</span>
            <h1>Administracion operativa</h1>
          </div>
          <div className="admin-user">
            <span>{user?.email}</span>
            <button type="button" onClick={handleSignOut}>
              Salir
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
