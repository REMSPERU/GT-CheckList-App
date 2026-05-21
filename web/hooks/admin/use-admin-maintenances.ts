import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';


import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminMaintenanceSessions } from '@/services/admin/maintenances.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminEquipmentTypeRow,
  AdminMaintenanceSessionRow,
  AdminPropertyRow,
} from '@/types/admin';
import { normalizeSearchText } from '@/utils/search';

import { useDebouncedValue } from './use-debounced-value';

export function useAdminMaintenances() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Helper to update URL params
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [items, setItems] = useState<AdminMaintenanceSessionRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [propertyId, setPropertyId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);

  // Synchronize URL search params to React state (handles back/forward navigation)
  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    if (searchVal !== search) setSearch(searchVal);

    const statusVal = searchParams.get('status') || 'TODOS';
    if (statusVal !== status) setStatus(statusVal);

    const propertyVal = searchParams.get('property') || '';
    if (propertyVal !== propertyId) setPropertyId(propertyVal);

    const eqTypeVal = searchParams.get('eqType') || '';
    if (eqTypeVal !== equipmentTypeId) setEquipmentTypeId(eqTypeVal);

    const startVal = searchParams.get('start') || '';
    if (startVal !== startDate) setStartDate(startVal);

    const endVal = searchParams.get('end') || '';
    if (endVal !== endDate) setEndDate(endVal);
  }, [searchParams]);

  // Synchronize debounced search text back to URL
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== urlSearch) {
      updateUrlParams({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Load filter options once on mount
  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      try {
        const supabase = getSupabaseClient();
        const [props, types] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
        ]);
        if (isMounted) {
          setProperties(props);
          setEquipmentTypes(types);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    }

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch sessions when filter parameters change
  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await listAdminMaintenanceSessions(supabase, {
          status,
          propertyId,
          equipmentTypeId,
          startDate,
          endDate,
        });

        if (isMounted) {
          setItems(result);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las sesiones de mantenimiento',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [status, propertyId, equipmentTypeId, startDate, endDate]);

  // Apply client-side search across multiple fields
  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(debouncedSearch);

    return items.filter(item => {
      const matchesSearch =
        !query ||
        [
          item.nombre || '',
          item.descripcion || '',
          item.propertyName || '',
          ...(item.equipmentCodes || []),
          ...(item.equipmentTypes || []),
        ].some(value => normalizeSearchText(value).includes(query));

      return matchesSearch;
    });
  }, [items, debouncedSearch]);

  const clearFilters = () => {
    setSearch('');
    setStatus('TODOS');
    setPropertyId('');
    setEquipmentTypeId('');
    setStartDate('');
    setEndDate('');
  };

  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus);
    updateUrlParams({ status: nextStatus });
  };

  const handlePropertyChange = (nextPropertyId: string) => {
    setPropertyId(nextPropertyId);
    updateUrlParams({ property: nextPropertyId });
  };

  const handleEquipmentTypeChange = (nextEquipmentTypeId: string) => {
    setEquipmentTypeId(nextEquipmentTypeId);
    updateUrlParams({ eqType: nextEquipmentTypeId });
  };

  const handleStartDateChange = (nextStartDate: string) => {
    setStartDate(nextStartDate);
    updateUrlParams({ start: nextStartDate });
  };

  const handleEndDateChange = (nextEndDate: string) => {
    setEndDate(nextEndDate);
    updateUrlParams({ end: nextEndDate });
  };

  const handleClearFilters = () => {
    clearFilters();
    updateUrlParams({
      search: '',
      status: 'TODOS',
      property: '',
      eqType: '',
      start: '',
      end: '',
    });
  };

  return {
    filteredItems,
    search,
    setSearch,
    status,
    setStatus: handleStatusChange,
    propertyId,
    setPropertyId: handlePropertyChange,
    equipmentTypeId,
    setEquipmentTypeId: handleEquipmentTypeChange,
    startDate,
    setStartDate: handleStartDateChange,
    endDate,
    setEndDate: handleEndDateChange,
    properties,
    equipmentTypes,
    clearFilters: handleClearFilters,
    isLoading,
    errorMessage,
  };
}
