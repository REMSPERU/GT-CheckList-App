import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';


import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminEquipments } from '@/services/admin/equipments.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminEquipmentRow,
  AdminEquipmentTypeRow,
  AdminPropertyRow,
} from '@/types/admin';

import { useDebouncedValue } from './use-debounced-value';

const PAGE_SIZE = 50;

export function useAdminEquipments() {
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

  const [items, setItems] = useState<AdminEquipmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [availableEquipmentTypeIds, setAvailableEquipmentTypeIds] = useState<
    string[] | null
  >(null);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; nombre: string }[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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

    const systemVal = searchParams.get('system') || '';
    if (systemVal !== systemId) setSystemId(systemVal);

    const eqTypeVal = searchParams.get('eqType') || '';
    if (eqTypeVal !== equipmentTypeId) setEquipmentTypeId(eqTypeVal);

    const pageVal = Number(searchParams.get('page') || '1');
    if (pageVal !== page) setPage(pageVal);
  }, [searchParams]);

  // Synchronize debounced search text back to URL
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== urlSearch) {
      updateUrlParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch]);

  // Load filter options (properties, systems and equipment types) once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFilterOptions() {
      try {
        const supabase = getSupabaseClient();
        const [props, types, systemsRes] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
          supabase
            .from('sistemas')
            .select('id, nombre')
            .order('nombre', { ascending: true }),
        ]);
        if (isMounted) {
          setProperties(props);
          setEquipmentTypes(types);
          setSystems(
            (systemsRes.data ?? []) as { id: string; nombre: string }[],
          );
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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, propertyId, systemId, equipmentTypeId]);

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
          propertyId,
          systemId,
          equipmentTypeId,
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
  }, [debouncedSearch, page, status, propertyId, systemId, equipmentTypeId]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  // Load unique equipment types present in the selected property
  useEffect(() => {
    let isMounted = true;
    async function loadAvailableTypes() {
      if (!propertyId) {
        if (isMounted) setAvailableEquipmentTypeIds(null);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('equipos')
          .select('id_equipamento')
          .eq('id_property', propertyId);

        if (isMounted && data) {
          const ids = Array.from(
            new Set(
              data
                .map(item => item.id_equipamento)
                .filter((id): id is string => !!id),
            ),
          );
          setAvailableEquipmentTypeIds(ids);
        }
      } catch (error) {
        console.error(
          'Error loading available equipment types for property:',
          error,
        );
      }
    }
    void loadAvailableTypes();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Reset selected equipment type if it is no longer available in the newly filtered set
  useEffect(() => {
    if (
      availableEquipmentTypeIds &&
      equipmentTypeId &&
      !availableEquipmentTypeIds.includes(equipmentTypeId)
    ) {
      setEquipmentTypeId('');
    }
  }, [availableEquipmentTypeIds, equipmentTypeId]);

  function handleStatusChange(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
    updateUrlParams({ status: nextStatus, page: 1 });
  }

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setPage(1);
    updateUrlParams({ property: nextPropertyId, page: 1 });
  }

  function handleSystemChange(nextSystemId: string) {
    setSystemId(nextSystemId);
    setEquipmentTypeId(''); // Reset equipment type when system changes
    setPage(1);
    updateUrlParams({ system: nextSystemId, eqType: '', page: 1 });
  }

  function handleEquipmentTypeChange(nextEquipmentTypeId: string) {
    setEquipmentTypeId(nextEquipmentTypeId);
    setPage(1);
    updateUrlParams({ eqType: nextEquipmentTypeId, page: 1 });
  }

  return {
    items,
    search,
    setSearch,
    status,
    handleStatusChange,
    propertyId,
    handlePropertyChange,
    systemId,
    handleSystemChange,
    equipmentTypeId,
    handleEquipmentTypeChange,
    availableEquipmentTypeIds,
    properties,
    systems,
    equipmentTypes,
    page,
    setPage: (nextPage: number) => {
      setPage(nextPage);
      updateUrlParams({ page: nextPage });
    },
    total,
    totalPages,
    isLoading,
    errorMessage,
  };
}
