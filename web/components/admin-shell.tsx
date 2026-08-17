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
  Users,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Receipt,
  ClipboardList,
} from 'lucide-react';

import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface AdminShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  superadminOnly?: boolean;
  allowedRoles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'GENERAL',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        superadminOnly: true,
      },
    ],
  },
  {
    title: 'INVENTARIO',
    items: [
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
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      {
        href: '/admin/mantenimientos',
        label: 'Mantenimientos',
        icon: Calendar,
      },
      {
        href: '/admin/checklist',
        label: 'Checklists',
        icon: ClipboardCheck,
      },
      {
        href: '/admin/auditorias',
        label: 'Auditorías',
        icon: FileSearch,
      },
    ],
  },
  {
    title: 'ALEXPERTO',
    items: [
      {
        href: '/admin/alexperto/cotizaciones',
        label: 'Cotizaciones',
        icon: Receipt,
        allowedRoles: ['AUDITOR', 'SUPERADMIN'],
      },
      {
        href: '/admin/alexperto/solicitudes',
        label: 'Solicitudes',
        icon: ClipboardList,
        allowedRoles: ['AUDITOR', 'SUPERADMIN'],
      },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      {
        href: '/admin/usuarios',
        label: 'Usuarios',
        icon: Users,
        superadminOnly: true,
      },
    ],
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isCheckingSession, handleSignOut } = useAdminSession();

  // Sidebar behavior state:
  // - isPinned: if true, sidebar stays open at 260px width on desktop.
  // - isMobileOpen: controls mobile off-canvas overlay.
  const [isPinned, setIsPinned] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const storedPinned = localStorage.getItem('admin-sidebar-pinned');
    if (storedPinned !== null) {
      setIsPinned(storedPinned === 'true');
    }
  }, []);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Security routing guard for roles
  const isUnauthorizedRoute = (() => {
    if (isCheckingSession || !user) return false;

    if (user.role === 'TECNICO_REMS') {
      const allowedPaths = [
        '/admin/equipos',
        '/admin/inmuebles',
        '/admin/checklist',
      ];
      return !allowedPaths.some(path => pathname.startsWith(path));
    }

    if (pathname.startsWith('/admin/alexperto')) {
      return user.role !== 'AUDITOR' && user.role !== 'SUPERADMIN';
    }

    if (pathname.startsWith('/admin/usuarios')) {
      return user.role !== 'SUPERADMIN';
    }

    return false;
  })();

  useEffect(() => {
    if (isUnauthorizedRoute) {
      router.replace('/admin/checklist');
    }
  }, [isUnauthorizedRoute, router]);

  const togglePin = () => {
    setIsPinned(prev => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-pinned', String(next));
      return next;
    });
  };

  const handleSignOutConfirmed = async () => {
    setIsSigningOut(true);
    await handleSignOut();
    setIsSigningOut(false);
    setShowSignOutConfirm(false);
  };

  if (isCheckingSession) {
    return (
      <div
        className="grid min-h-screen place-items-center gap-3 bg-[#f0f4f3]"
        role="status"
        aria-label="Validando sesión">
        <div className="flex flex-col items-center gap-3.5">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-900/20 border-t-emerald-800"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold tracking-wide text-emerald-950">
            Cargando plataforma GEMA...
          </p>
        </div>
      </div>
    );
  }

  const getSectionTitle = () => {
    if (pathname === '/admin') return 'Dashboard Principal';
    if (pathname.startsWith('/admin/equipos')) return 'Inventario · Activos';
    if (pathname.startsWith('/admin/inmuebles'))
      return 'Inventario · Inmuebles';
    if (pathname.startsWith('/admin/mantenimientos'))
      return 'Operaciones · Mantenimientos';
    if (pathname.startsWith('/admin/checklist'))
      return 'Monitoreo · Checklists';
    if (pathname.startsWith('/admin/auditorias'))
      return 'Monitoreo · Auditorías';
    if (pathname.startsWith('/admin/alexperto/cotizaciones'))
      return 'Alexperto · Cotizaciones';
    if (pathname.startsWith('/admin/alexperto/solicitudes'))
      return 'Alexperto · Solicitudes';
    if (pathname.startsWith('/admin/usuarios')) return 'Sistema · Usuarios';
    return 'Administración';
  };

  // On mobile overlay or expanded pinned desktop, show text labels
  const isExpanded = isPinned;

  const roleLabelMap: Record<string, string> = {
    SUPERADMIN: 'Superadministrador',
    ADMIN: 'Administrador',
    AUDITOR: 'Auditor',
    SUPERVISOR: 'Supervisor',
    TECNICO: 'Técnico',
    TECNICO_REMS: 'Técnico REMS',
  };

  const userRoleDisplay = user?.role
    ? (roleLabelMap[user.role] ?? user.role)
    : 'Usuario';

  return (
    <div className="relative min-h-screen bg-slate-50/70 text-slate-900 flex flex-col min-[981px]:flex-row">
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs min-[981px]:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`z-50 flex flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-slate-900 text-slate-100 transition-all duration-200 ease-in-out min-[981px]:sticky min-[981px]:top-0 min-[981px]:h-dvh shadow-2xs ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 w-[260px] translate-x-0'
            : 'max-[980px]:fixed max-[980px]:inset-y-0 max-[980px]:left-0 max-[980px]:w-[260px] max-[980px]:-translate-x-full'
        } ${
          isPinned
            ? 'min-[981px]:w-[260px] min-[981px]:min-w-[260px]'
            : 'min-[981px]:w-[72px] min-[981px]:min-w-[72px]'
        }`}>
        {/* BRAND HEADER & TOGGLE BUTTON */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-3.5 bg-slate-900">
            {isExpanded ? (
              <>
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 no-underline overflow-hidden group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold shadow-2xs transition-colors group-hover:border-emerald-700/60">
                    <ClipboardCheck size={17} className="text-emerald-400" />
                  </div>
                  <div className="flex flex-col min-w-0 transition-opacity duration-200">
                    <span className="text-xs font-bold tracking-tight text-slate-100 leading-none">
                      GEMA{' '}
                      <span className="text-slate-400 font-normal text-xs">
                        Admin
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 tracking-wide mt-0.5">
                      Plataforma
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={togglePin}
                  className="hidden min-[981px]:flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  title="Contraer menú lateral"
                  aria-label="Contraer menú lateral">
                  <PanelLeftClose size={16} />
                </button>
              </>
            ) : (
              <div className="w-full flex justify-center">
                <button
                  type="button"
                  onClick={togglePin}
                  className="hidden min-[981px]:flex h-9 w-9 items-center justify-center rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white shadow-2xs"
                  title="Expandir menú lateral"
                  aria-label="Expandir menú lateral">
                  <PanelLeftOpen size={16} />
                </button>
              </div>
            )}
          </div>

          {/* NAVIGATION GROUPS */}
          <nav className="admin-sidebar-scroll min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4">
            {NAV_GROUPS.map(group => {
              const visibleItems = group.items.filter(item => {
                if (item.superadminOnly && user?.role !== 'SUPERADMIN') {
                  return false;
                }
                if (
                  item.allowedRoles &&
                  (!user?.role || !item.allowedRoles.includes(user.role))
                ) {
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

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  {isExpanded ? (
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none mb-1.5">
                      {group.title}
                    </p>
                  ) : (
                    <div className="h-px bg-slate-800 my-2" />
                  )}

                  {visibleItems.map(item => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin' &&
                        pathname.startsWith(item.href));

                    const IconComponent = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={!isExpanded ? item.label : undefined}
                        className={`group relative flex items-center rounded-lg px-3 py-2 min-h-[40px] text-xs no-underline transition-all duration-150 ${
                          isExpanded ? 'gap-3 justify-start' : 'justify-center'
                        } ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                            : 'text-slate-300 font-medium hover:bg-slate-800/60 hover:text-slate-100'
                        }`}
                        aria-current={isActive ? 'page' : undefined}>
                        <IconComponent
                          size={17}
                          strokeWidth={isActive ? 2 : 1.75}
                          className={`shrink-0 transition-colors duration-150 ${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />

                        {isExpanded && (
                          <span
                            className={`truncate text-xs ${isActive ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* USER PROFILE & LOGOUT FOOTER */}
        <div className="border-t border-slate-800/80 p-3 bg-slate-900">
          {isExpanded ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-800/40 border border-slate-800 shadow-2xs">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-200 text-xs font-semibold uppercase border border-slate-700/60">
                  {user?.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200 m-0">
                    {user?.email || 'Usuario'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-400">
                    <Shield size={10} className="text-slate-400" />
                    {userRoleDisplay}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 border border-transparent">
                <LogOut size={15} strokeWidth={1.75} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                title="Cerrar Sesión"
                aria-label="Cerrar sesión">
                <LogOut size={17} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="sticky top-0 z-20 flex min-h-[52px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 lg:px-8 py-2.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(prev => !prev)}
              className="flex min-[981px]:hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Abrir menú de navegación"
              aria-label="Abrir menú de navegación">
              <Menu size={18} />
            </button>
            <div>
              <h1 className="m-0 text-sm font-bold tracking-tight text-slate-800 leading-tight">
                {getSectionTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden min-[640px]:flex items-center gap-1.5 rounded-lg bg-slate-100/80 border border-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs">
              <Shield size={12} className="text-slate-500" />
              {userRoleDisplay}
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="min-h-0 flex-1 overflow-hidden p-0">
          {isUnauthorizedRoute ? null : children}
        </main>
      </div>

      {/* CONFIRMATION DIALOG FOR LOGOUT */}
      <ConfirmationDialog
        open={showSignOutConfirm}
        title="¿Cerrar sesión?"
        description="Se cerrará tu sesión activa en la plataforma administrativa. ¿Deseas continuar?"
        confirmLabel="Sí, cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isSigningOut}
        onConfirm={handleSignOutConfirmed}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
}
