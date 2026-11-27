import { useCallback, useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  getAdminMetrics,
  isRetryableAdminMetricsError,
} from '@/services/admin/metrics.service';
import type { AdminMetric } from '@/types/admin';

export function useAdminMetrics(enabled = true) {
  const [metrics, setMetrics] = useState<AdminMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setErrorMessage(null);

    async function loadMetrics() {
      try {
        const supabase = getSupabaseClient();
        let result: AdminMetric[];
        try {
          result = await getAdminMetrics(supabase);
        } catch (error) {
          if (!isMounted || !isRetryableAdminMetricsError(error)) throw error;
          await new Promise(resolve => setTimeout(resolve, 750));
          if (!isMounted) return;
          result = await getAdminMetrics(supabase);
        }
        if (isMounted) setMetrics(result);
      } catch (error) {
        if (isMounted) {
          console.error(
            '[Dashboard] No se pudieron cargar las métricas',
            error,
          );
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
  }, [attempt, enabled]);

  return { metrics, isLoading, errorMessage, retry };
}
