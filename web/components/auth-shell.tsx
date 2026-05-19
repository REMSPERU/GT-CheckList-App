import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#edf4ef] px-5 py-8 text-slate-950 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(14,116,144,0.18),transparent_24%),linear-gradient(135deg,#f8faf4_0%,#e7f1ee_48%,#f5efe2_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-7 h-[calc(100%-56px)] w-px bg-emerald-950/10 max-[860px]:hidden" />

      <section className="relative mx-auto grid w-full max-w-5xl grid-cols-[1fr_420px] items-center gap-12 max-[860px]:max-w-[460px] max-[860px]:grid-cols-1 max-[860px]:gap-6">
        <div className="max-[860px]:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-950/10 bg-white/55 px-4 py-2 text-sm font-black tracking-[0.18em] text-emerald-950 no-underline shadow-sm backdrop-blur">
            GEMA
          </Link>
          <h2 className="mt-7 max-w-xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#10231f]">
            Panel operativo para mantenimiento sin friccion.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
            Accede, recupera tu cuenta o solicita una nueva desde un solo punto.
            El panel solo se abre cuando tu sesion esta validada.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm font-bold text-emerald-950">
            <span className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm">
              Inmuebles
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm">
              Equipos
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm">
              Checklist
            </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/80 p-3 shadow-[0_24px_80px_rgba(15,35,57,0.16)] backdrop-blur-xl">
          <div className="rounded-[22px] border border-emerald-950/10 bg-white p-6 shadow-inner shadow-white max-[480px]:p-5">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-black tracking-[0.18em] text-emerald-950 no-underline">
              GEMA
            </Link>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Panel web
            </p>
            <h1 className="m-0 text-[2rem] font-black leading-tight tracking-[-0.04em] text-[#10231f]">
              {title}
            </h1>
            <p className="mt-2.5 leading-6 text-slate-500">{description}</p>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
