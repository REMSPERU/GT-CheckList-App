'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgressGlobalDashboard } from '@/components/admin/progress-global-dashboard';
import { useAdminProgress } from '@/hooks/admin/use-admin-progress';

export default function ProgressDashboardPage() {
  const data = useAdminProgress();

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Dashboard general de proyectos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vista interna consolidada para la plataforma GEMA.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            href="/admin/avance-proyectos">
            <ArrowLeft size={16} />
            Volver a proyectos
          </Link>
        </div>
        {data.isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Cargando dashboard...
          </div>
        ) : data.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">
            {data.error}
          </div>
        ) : (
          <ProgressGlobalDashboard projects={data.projects} />
        )}
      </div>
    </main>
  );
}
