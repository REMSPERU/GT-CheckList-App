import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Building2,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f2f6f4] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      {/* Clean ambient depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_10%,rgba(6,95,70,0.08),transparent_60%),radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(15,118,110,0.06),transparent_60%)]" />

      <section className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14">
        {/* Left Hero & Value Proposition Panel (Visible on lg screens) */}
        <div className="hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/90 px-3.5 py-1.5 shadow-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[11px] font-black text-white">
                G
              </span>
              <span className="text-xs font-bold tracking-wide text-emerald-950">
                GEMA
              </span>
              <span className="h-3 w-px bg-slate-300" />
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Portal Administrativo
              </span>
            </div>

            <h1 className="mt-8 text-4xl font-extrabold tracking-[-0.02em] text-slate-900 xl:text-[2.6rem] xl:leading-[1.15]">
              Control integral de{' '}
              <span className="text-emerald-800">mantenimiento y activos</span>{' '}
              en tiempo real.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
              Plataforma centralizada para auditorías técnicas, trazabilidad de
              equipos, cuadrillas y control unificado de inmuebles.
            </p>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Sedes e Inmuebles
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Control unificado de predios, áreas técnicas y tableros
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-100">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Equipos y Activos
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Códigos QR, historial técnico y parametrización de criticidad
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <ClipboardCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Checklists Digitales
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Mantenimientos preventivos y correctivos sincronizados
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Acceso seguro cifrado con control de roles y auditoría</span>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="w-full lg:col-span-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-lg shadow-slate-900/5 sm:p-9">
            {/* Mobile Branding */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-slate-50 px-3 py-1 text-xs font-bold text-emerald-950 no-underline">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-black text-white">
                  G
                </span>
                <span>GEMA</span>
              </Link>
              <span className="text-xs font-medium text-slate-600">
                Portal Administrativo
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-[-0.01em] text-slate-900 sm:text-[1.75rem]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            </div>

            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
