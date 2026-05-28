import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminMetrics } from '@/services/admin/metrics.service';
import type { AdminMetric } from '@/types/admin';

export function useAdminMetrics(enabled = true) {
  const [metrics, setMetrics] = useState<AdminMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadMetrics() {
      try {
        const supabase = getSupabaseClient();
        const result = await getAdminMetrics(supabase);
        if (isMounted) setMetrics(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el panel',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { metrics, isLoading, errorMessage };
}
