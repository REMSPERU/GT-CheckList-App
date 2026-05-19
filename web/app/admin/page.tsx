'use client';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { MetricCardGrid } from '@/components/admin/metric-card-grid';
import { Alert } from '@/components/ui/alert';
import { useAdminMetrics } from '@/hooks/admin/use-admin-metrics';

export default function AdminDashboardPage() {
  const { metrics, isLoading, errorMessage } = useAdminMetrics();

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        featured
        eyebrow="Resumen"
        title="Control general del inventario"
        description="Vista rapida para revisar el estado operativo antes de entrar a las tablas de equipos, inmuebles y mantenimientos."
      />
      <Alert>{errorMessage}</Alert>
      <MetricCardGrid metrics={metrics} isLoading={isLoading} />
    </main>
  );
}
