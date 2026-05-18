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
      <main className="grid min-h-screen place-items-center gap-3 bg-[#eef3f2]">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p>Validando sesion...</p>
      </main>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)] bg-[radial-gradient(circle_at_15%_0%,rgba(8,145,178,0.16),transparent_28%),linear-gradient(135deg,#edf5f3_0%,#f7f4ea_100%)] max-[980px]:grid-cols-1">
      <aside className="sticky top-0 h-screen border-r border-white/10 bg-gradient-to-b from-[#082f2a] to-[#0b1f28] px-[18px] py-6 text-emerald-50 max-[980px]:static max-[980px]:h-auto">
        <Link href="/admin" className="flex items-center gap-3 text-white no-underline">
          <strong>GEMA-Panel </strong>
        </Link>

        <nav
          className="mt-[34px] grid gap-2 max-[980px]:grid-cols-5 max-[640px]:grid-cols-1"
          aria-label="Navegacion administrativa">
          {NAV_ITEMS.map(item => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3.5 py-3 font-semibold no-underline hover:bg-lime-200 hover:text-teal-950 ${
                  isActive
                    ? 'bg-lime-200 text-teal-950'
                    : 'text-emerald-100'
                }`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-5 border-b border-slate-900/10 bg-white/60 px-8 py-6 backdrop-blur-[14px] max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:px-[18px]">
          <div>
            <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
              Panel web
            </span>
            <h1 className="m-0 text-[#0c1720] tracking-[-0.04em]">
              Administracion operativa
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 max-[640px]:flex-col max-[640px]:items-stretch">
            <span>{user?.email}</span>
            <button
              className="m-0 h-11 w-auto rounded-[10px] border-0 bg-slate-900 px-4 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleSignOut}>
              Salir
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
