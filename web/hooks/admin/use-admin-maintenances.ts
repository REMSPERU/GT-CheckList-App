import { useEffect, useMemo, useState } from 'react';

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

  return {
    filteredItems,
    search,
    setSearch,
    status,
    setStatus,
    propertyId,
    setPropertyId,
    equipmentTypeId,
    setEquipmentTypeId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    properties,
    equipmentTypes,
    clearFilters,
    isLoading,
    errorMessage,
  };
}
