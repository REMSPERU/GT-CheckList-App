import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useDebouncedValue } from './use-debounced-value';

import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  listAdminProperties,
  updateAdminPropertyImage,
} from '@/services/admin/properties.service';
import type { AdminPropertyRow } from '@/types/admin';
import { normalizeSearchText } from '@/utils/search';
import { uploadPropertyPhoto } from '@/utils/upload-image';

type PropertyStatusFilter = 'active' | 'inactive';

function readStatusParam(value: string | null): PropertyStatusFilter {
  return value === 'inactive' ? 'inactive' : 'active';
}

export function useAdminProperties() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearch = searchParams.get('search') || '';
  const lastKnownUrlSearchRef = useRef(initialSearch);

  // Helper to update URL params
  const updateUrlParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [items, setItems] = useState<AdminPropertyRow[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<PropertyStatusFilter>(() =>
    readStatusParam(searchParams.get('status')),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  // Synchronize URL search params to React state (handles back/forward navigation)
  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    if (searchVal !== lastKnownUrlSearchRef.current) {
      lastKnownUrlSearchRef.current = searchVal;
      setSearch(searchVal);
    }

    const statusVal = readStatusParam(searchParams.get('status'));
    if (statusVal !== status) setStatus(statusVal);
  }, [searchParams, status]);

  // Synchronize debounced search text back to URL
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== urlSearch) {
      lastKnownUrlSearchRef.current = debouncedSearch;
      updateUrlParams({ search: debouncedSearch });
    }
  }, [debouncedSearch, searchParams, updateUrlParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await listAdminProperties(supabase, status);
        if (isMounted) setItems(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los inmuebles',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProperties();

    return () => {
      isMounted = false;
    };
  }, [status]);

  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return items;

    return items.filter(item =>
      [item.code, item.name, item.address, item.city].some(value =>
        normalizeSearchText(value).includes(query),
      ),
    );
  }, [items, search]);

  const changePropertyImage = async (propertyId: string, file: File) => {
    try {
      setUploadingImageId(propertyId);

      const property = items.find(p => p.id === propertyId);
      if (!property)
        throw new Error('Inmueble no encontrado en el estado local');

      const supabase = getSupabaseClient();
      const imageUrl = await uploadPropertyPhoto(supabase, file, property.name);
      await updateAdminPropertyImage(supabase, propertyId, imageUrl);

      setItems(prev =>
        prev.map(p =>
          p.id === propertyId ? { ...p, image_url: imageUrl } : p,
        ),
      );
    } catch (error) {
      console.error('Error cambiando imagen:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar imagen');
    } finally {
      setUploadingImageId(null);
    }
  };

  const addPropertyToList = (newProperty: AdminPropertyRow) => {
    if (status === 'inactive' && newProperty.is_active !== false) return;
    setItems(prev =>
      [newProperty, ...prev].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const updatePropertyInList = (updatedProperty: AdminPropertyRow) => {
    setItems(prev =>
      prev
        .map(p => (p.id === updatedProperty.id ? updatedProperty : p))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  function handleStatusChange(nextStatus: PropertyStatusFilter) {
    setStatus(nextStatus);
    updateUrlParams({ status: nextStatus === 'inactive' ? 'inactive' : null });
  }

  return {
    filteredItems,
    search,
    setSearch,
    status,
    handleStatusChange,
    isLoading,
    errorMessage,
    changePropertyImage,
    uploadingImageId,
    addPropertyToList,
    updatePropertyInList,
  };
}
