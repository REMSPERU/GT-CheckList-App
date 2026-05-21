import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminAuditSessions } from '@/services/admin/audits.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type { AdminAuditSessionRow, AdminPropertyRow } from '@/types/admin';

const AUDIT_PAGE_SIZE = 20;

export function useAdminAudits() {
  const [audits, setAudits] = useState<AdminAuditSessionRow[]>([]);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminProperties(supabase);
        if (isMounted) setProperties(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los inmuebles',
          );
        }
      }
    }

    void loadProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedPropertyId, selectedStatus]);

  useEffect(() => {
    let isMounted = true;

    async function loadAudits() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const supabase = getSupabaseClient();
        const result = await listAdminAuditSessions(supabase, {
          page,
          pageSize: AUDIT_PAGE_SIZE,
          search: deferredSearch || undefined,
          propertyId: selectedPropertyId || undefined,
          status: selectedStatus || undefined,
        });

        if (isMounted) {
          setAudits(result.items);
          setTotal(result.total);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las auditorias',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAudits();

    return () => {
      isMounted = false;
    };
  }, [deferredSearch, page, selectedPropertyId, selectedStatus]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    [total],
  );

  return {
    audits,
    properties,
    selectedPropertyId,
    selectedStatus,
    search,
    page,
    total,
    totalPages,
    isLoading,
    errorMessage,
    setPage,
    setSearch,
    setSelectedPropertyId,
    setSelectedStatus,
  };
}
