'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Calendar,
  ClipboardCheck,
  FileSearch,
  PanelLeftDashed,
  Users,
} from 'lucide-react';

import { useAdminSession } from '@/hooks/auth/use-admin-session';

interface AdminShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    superadminOnly: true,
  },
  {
    href: '/admin/equipos',
    label: 'Activos',
    icon: Wrench,
  },
  {
    href: '/admin/inmuebles',
    label: 'Inmuebles',
    icon: Building2,
  },
  {
    href: '/admin/mantenimientos',
    label: 'Mantenimientos',
    icon: Calendar,
  },
  {
    href: '/admin/checklist',
    label: 'Checklist',
    icon: ClipboardCheck,
  },
  {
    href: '/admin/auditorias',
    label: 'Auditorias',
    icon: FileSearch,
  },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    superadminOnly: true,
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isCheckingSession, handleSignOut } = useAdminSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Security routing guard for Técnico REMS
  useEffect(() => {
    if (isCheckingSession || !user) return;

    if (user.role === 'TECNICO_REMS') {
      const allowedPaths = ['/admin/equipos', '/admin/inmuebles', '/admin/checklist'];
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
      if (!isAllowed) {
        router.replace('/admin/checklist');
      }
    }
  }, [user, isCheckingSession, pathname, router]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      return next;
    });
  };

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center gap-3 bg-background-page">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-surface-border border-t-primary" />
        <p className="text-sm font-semibold text-text-muted">Validando sesion...</p>
      </main>
    );
  }

  const getSectionTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/equipos')) return 'Inventario · Activos';
    if (pathname.startsWith('/admin/inmuebles'))
      return 'Inventario · Inmuebles';
    if (pathname.startsWith('/admin/mantenimientos'))
      return 'Operaciones · Mantenimientos';
    if (pathname.startsWith('/admin/checklist')) return 'Monitoreo · Checklist';
    if (pathname.startsWith('/admin/auditorias'))
      return 'Monitoreo · Auditorias';
    if (pathname.startsWith('/admin/usuarios')) return 'Sistema · Usuarios';
    return null;
  };

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.superadminOnly && user?.role !== 'SUPERADMIN') {
      return false;
    }
    if (user?.role === 'TECNICO_REMS') {
      return (
        item.href === '/admin/equipos' ||
        item.href === '/admin/inmuebles' ||
        item.href === '/admin/checklist'
      );
    }
    return true;
  });

  return (
    <div
      className={`grid min-h-screen transition-[grid-template-columns] duration-300 ${
        isCollapsed
          ? 'grid-cols-[70px_minmax(0,1fr)]'
          : 'grid-cols-[260px_minmax(0,1fr)]'
      } bg-[radial-gradient(circle_at_15%_0%,rgba(8,145,178,0.14),transparent_35%),linear-gradient(135deg,var(--color-background-page)_0%,#f5f2e8_100%)] max-[980px]:grid-cols-1`}>
      <aside
        className={`sticky top-0 flex h-screen flex-col justify-between border-r border-sidebar-border bg-gradient-to-b from-sidebar-from to-sidebar-to py-6 text-sidebar-text transition-all duration-300 max-[980px]:static max-[980px]:h-auto max-[980px]:w-full max-[980px]:px-[18px] ${
          isCollapsed ? 'w-[70px] px-3' : 'w-[260px] px-[18px]'
        }`}>
        <div>
          <Link
            href="/admin"
            className="flex items-center text-white no-underline justify-center">
            {isCollapsed ? (
              <strong className="text-xl font-black text-accent select-none">
                G
              </strong>
            ) : (
              <strong className="text-lg font-black tracking-tight text-white select-none">
                GEMA-Panel
              </strong>
            )}
          </Link>

          <nav
            className="mt-[34px] grid gap-2 max-[980px]:grid-cols-7 max-[640px]:grid-cols-1"
            aria-label="Navegacion administrativa">
            {visibleNavItems.map(item => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));

              const IconComponent = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl p-3 font-semibold no-underline hover:bg-sidebar-active hover:text-sidebar-active-text transition-all ${
                    isCollapsed ? 'justify-center' : 'gap-3'
                  } ${
                    isActive ? 'bg-sidebar-active text-sidebar-active-text' : 'text-sidebar-text/90'
                  }`}
                  title={item.label}>
                  <IconComponent
                    size={18}
                    strokeWidth={1.5}
                    className="shrink-0"
                  />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Collapsible toggle button */}
        <button
          onClick={toggleSidebar}
          className="mt-auto flex cursor-pointer items-center justify-center rounded-xl p-2.5 text-sidebar-text/80 transition-colors hover:bg-white/10 hover:text-white max-[980px]:hidden"
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}>
          <PanelLeftDashed
            size={18}
            strokeWidth={1.5}
            className={`transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
          {!isCollapsed && (
            <span className="ml-2.5 whitespace-nowrap text-[0.68rem] font-bold uppercase tracking-wider">
              Contraer
            </span>
          )}
        </button>
      </aside>

      <div className="flex min-w-0 flex-col overflow-hidden max-[980px]:h-auto max-[980px]:overflow-visible">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-surface-border bg-surface/80 px-8 py-2.5 backdrop-blur-[14px] max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:px-[18px]">
          <div>
            <span className="inline-block text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-primary">
              Panel web
            </span>
            <h1 className="m-0 flex items-center gap-2 text-lg tracking-[-0.03em] text-text-main max-[480px]:flex-wrap">
              <span className="font-normal text-text-muted">
                Administracion operativa
              </span>
              {getSectionTitle() && (
                <>
                  <span className="font-light text-text-muted/40">/</span>
                  <span className="font-semibold text-primary">
                    {getSectionTitle()}
                  </span>
                </>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted max-[640px]:flex-col max-[640px]:items-stretch">
            <span>{user?.email}</span>
            <button
              className="m-0 h-9 w-auto rounded-xl border-0 bg-primary px-3.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
