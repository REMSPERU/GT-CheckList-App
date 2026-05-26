import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useDebouncedValue } from './use-debounced-value';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminProperties, updateAdminPropertyImage } from '@/services/admin/properties.service';
import type { AdminPropertyRow } from '@/types/admin';
import { normalizeSearchText } from '@/utils/search';
import { uploadPropertyPhoto } from '@/utils/upload-image';

export function useAdminProperties() {
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

  const [items, setItems] = useState<AdminPropertyRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  // Synchronize URL search params to React state (handles back/forward navigation)
  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    if (searchVal !== search) setSearch(searchVal);
  }, [searchParams]);

  // Synchronize debounced search text back to URL
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== urlSearch) {
      updateUrlParams({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminProperties(supabase);
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
  }, []);

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
      if (!property) throw new Error('Inmueble no encontrado en el estado local');

      const supabase = getSupabaseClient();
      const imageUrl = await uploadPropertyPhoto(supabase, file, property.name);
      await updateAdminPropertyImage(supabase, propertyId, imageUrl);
      
      setItems(prev =>
        prev.map(p => (p.id === propertyId ? { ...p, image_url: imageUrl } : p))
      );
    } catch (error) {
      console.error('Error cambiando imagen:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar imagen');
    } finally {
      setUploadingImageId(null);
    }
  };

  return { 
    filteredItems, 
    search, 
    setSearch, 
    isLoading, 
    errorMessage,
    changePropertyImage,
    uploadingImageId
  };
}
