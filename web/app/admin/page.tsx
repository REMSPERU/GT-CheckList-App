'use client';

import { MetricCardGrid } from '@/components/admin/metric-card-grid';
import { Alert } from '@/components/ui/alert';
import { useAdminMetrics } from '@/hooks/admin/use-admin-metrics';

export default function AdminDashboardPage() {
  const { metrics, isLoading, errorMessage } = useAdminMetrics();

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{errorMessage}</Alert>
      <MetricCardGrid metrics={metrics} isLoading={isLoading} />
    </main>
  );
}
