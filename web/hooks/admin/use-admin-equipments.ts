import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipments } from '@/services/admin/equipments.service';
import type { AdminEquipmentRow } from '@/types/admin';

import { useDebouncedValue } from './use-debounced-value';

const PAGE_SIZE = 50;

export function useAdminEquipments() {
  const [items, setItems] = useState<AdminEquipmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipments() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await listAdminEquipments(supabase, {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          status,
        });
        if (isMounted) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los equipos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadEquipments();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, page, status]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  function handleStatusChange(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
  }

  return {
    items,
    search,
    setSearch,
    status,
    handleStatusChange,
    page,
    setPage,
    total,
    totalPages,
    isLoading,
    errorMessage,
  };
}
