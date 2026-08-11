'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { MetricCardGrid } from '@/components/admin/metric-card-grid';
import { Alert } from '@/components/ui/alert';
import { useAdminMetrics } from '@/hooks/admin/use-admin-metrics';
import { useAdminSession } from '@/hooks/auth/use-admin-session';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isCheckingSession } = useAdminSession();
  const { metrics, isLoading, errorMessage } = useAdminMetrics(
    user?.role === 'SUPERADMIN',
  );

  useEffect(() => {
    if (!isCheckingSession && user?.role !== 'SUPERADMIN') {
      router.replace('/admin/checklist');
    }
  }, [isCheckingSession, router, user?.role]);

  if (isCheckingSession || user?.role !== 'SUPERADMIN') {
    return (
      <main className="grid min-h-[360px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-800" />
        <p className="text-xs font-medium text-slate-500">
          Validando permisos...
        </p>
      </main>
    );
  }

  return (
    <main className="grid gap-6 px-6 lg:px-8 py-6">
      <AdminPageHeader
        title="Dashboard de Operaciones"
        description="Resumen en tiempo real del inventario de activos, estado de inmuebles, mantenimientos y auditorías activas."
        compact
      />
      <Alert>{errorMessage}</Alert>
      <MetricCardGrid metrics={metrics} isLoading={isLoading} />
    </main>
  );
}
