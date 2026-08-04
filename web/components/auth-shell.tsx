import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-background-page px-5 py-8 text-text-main sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-surface/60 via-background-page to-secondary/70" />
      <div className="pointer-events-none absolute left-1/2 top-7 h-[calc(100%-56px)] w-px bg-surface-border max-[860px]:hidden" />

      <section className="relative mx-auto grid w-full max-w-5xl grid-cols-[1fr_420px] items-center gap-12 max-[860px]:max-w-[460px] max-[860px]:grid-cols-1 max-[860px]:gap-6">
        <div className="max-[860px]:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-4 py-2 text-xs font-black tracking-[0.18em] text-primary no-underline shadow-sm backdrop-blur">
            GEMA
          </Link>
          <h2 className="mt-7 max-w-xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-text-main">
            Panel operativo para mantenimiento sin friccion.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-text-muted">
            Accede, recupera tu cuenta o solicita una nueva desde un solo punto.
            El panel solo se abre cuando tu sesion esta validada.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm font-bold text-primary">
            <span className="rounded-2xl border border-surface-border bg-surface/70 p-4 shadow-sm text-center">
              Inmuebles
            </span>
            <span className="rounded-2xl border border-surface-border bg-surface/70 p-4 shadow-sm text-center">
              Activos
            </span>
            <span className="rounded-2xl border border-surface-border bg-surface/70 p-4 shadow-sm text-center">
              Checklist
            </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-surface-border bg-surface/80 p-3 shadow-sm backdrop-blur-xl">
          <div className="rounded-[22px] border border-surface-border bg-surface p-6 shadow-sm max-[480px]:p-5">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-black tracking-[0.18em] text-primary no-underline">
              GEMA
            </Link>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
              Panel web
            </p>
            <h1 className="m-0 text-[2rem] font-black leading-tight tracking-[-0.04em] text-text-main">
              {title}
            </h1>
            <p className="mt-2.5 leading-6 text-text-muted">{description}</p>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

