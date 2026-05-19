import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminProperties } from '@/services/admin/properties.service';
import type { AdminPropertyRow } from '@/types/admin';
import { normalizeSearchText } from '@/utils/search';

export function useAdminProperties() {
  const [items, setItems] = useState<AdminPropertyRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return { filteredItems, search, setSearch, isLoading, errorMessage };
}
