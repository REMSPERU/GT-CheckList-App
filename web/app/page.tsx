'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

import { AuthShell } from '@/components/auth-shell';
import { useHomeRedirect } from '@/hooks/auth/use-home-redirect';

export default function HomePage() {
  useHomeRedirect();

  return (
    <AuthShell
      title="Acceso al portal"
      description="Comprobando tus permisos y preparando la sesión en el panel administrativo...">
      <div className="mt-8 space-y-6">
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-emerald-900/10 bg-emerald-50/70 p-6 text-center shadow-xs">
          <div className="relative flex h-13 w-13 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm shadow-emerald-950/15">
            <ShieldCheck className="h-6 w-6 text-emerald-200" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 font-semibold text-emerald-950 text-sm sm:text-base">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
            <span>Validando sesión activa...</span>
          </div>

          <p className="mt-1 text-xs text-slate-600">
            Redirigiendo a tu espacio de trabajo autorizado
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center text-xs text-slate-700">
          <span>¿Tarda demasiado?</span>{' '}
          <Link
            className="inline-flex items-center gap-1 font-bold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
            href="/login">
            Ir directamente a iniciar sesión
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
