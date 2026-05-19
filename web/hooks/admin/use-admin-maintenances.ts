import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminMaintenances } from '@/services/admin/maintenances.service';
import type { AdminMaintenanceRow } from '@/types/admin';
import { normalizeSearchText } from '@/utils/search';

export function useAdminMaintenances() {
  const [items, setItems] = useState<AdminMaintenanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMaintenances() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminMaintenances(supabase);
        if (isMounted) setItems(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los mantenimientos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMaintenances();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(search);

    return items.filter(item => {
      const matchesStatus = status === 'TODOS' || item.estatus === status;
      const matchesSearch =
        !query ||
        [
          item.codigo,
          item.propertyName,
          item.equipmentCode,
          item.equipmentType,
          item.tipo_mantenimiento,
        ].some(value => normalizeSearchText(value).includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [items, search, status]);

  return {
    filteredItems,
    search,
    setSearch,
    status,
    setStatus,
    isLoading,
    errorMessage,
  };
}
