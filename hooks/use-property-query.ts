import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { supabasePropertyService } from '../services/supabase-property.service';
import { syncService } from '../services/sync';
import type {
  PropertyCreateRequest,
  PropertyListResponse,
  PropertyResponse,
} from '../types/api';
import { getLocalProperties } from '../services/db/queries';

const logPropertiesFlow = (...args: unknown[]) => {
  if (__DEV__) {
    console.log('[useProperties]', ...args);
  }
};

// Query Keys
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters?: any) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

/**
 * Hook para obtener una propiedad específica por ID
 */
export function useProperty(
  propertyId: string,
  options?: Omit<
    UseQueryOptions<PropertyResponse, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => supabasePropertyService.getById(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options,
  });
}

/**
 * Helper para transformar datos locales a PropertyListResponse
 */
function transformLocalToPropertyList(localProps: any[]): PropertyListResponse {
  const items = localProps.map((p: any) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    address: p.address,
    city: p.city,
    image_url: p.image_url || null,
    // defaults for missing fields in mirror
    property_type: 'Unknown',
    is_active: true,
    maintenance_priority: 'Low',
    country: '',
    latitude: 0,
    longitude: 0,
    postal_code: '',
    total_area_sqm: 0,
    construction_year: 0,
    created_at: '',
    updated_at: '',
  })) as unknown as PropertyResponse[];

  return {
    items: items,
    total: items.length,
    limit: items.length,
    skip: 0,
  };
}

/**
 * Hook para obtener lista de propiedades con filtros
 * OFFLINE-FIRST: Carga datos locales primero, luego sincroniza con Supabase en background
 */
export function useProperties(
  filters?: {
    search?: string;
    city?: string;
    property_type?: string;
    is_active?: boolean;
    maintenance_priority?: string;
    skip?: number;
    limit?: number;
  },
  options?: Omit<
    UseQueryOptions<PropertyListResponse, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  const queryClient = useQueryClient();
  const [isSyncReady, setIsSyncReady] = useState(syncService.isInitialSyncDone);
  const { enabled: optionsEnabled, ...restOptions } = options ?? {};
  const normalizedFilters = filters ?? null;
  const queryKey = propertyKeys.list(normalizedFilters);

  useEffect(() => {
    if (syncService.isInitialSyncDone) {
      setIsSyncReady(true);
      return;
    }

    return syncService.onReady(() => {
      setIsSyncReady(true);
    });
  }, []);

  return useQuery({
    queryKey,
    enabled: isSyncReady && (optionsEnabled ?? true),
    queryFn: async () => {
      logPropertiesFlow('query start', {
        queryKey,
        filters: normalizedFilters,
      });

      // OFFLINE-FIRST: Start with local data immediately
      const localProps = await getLocalProperties();
      const localData = transformLocalToPropertyList(localProps);
      logPropertiesFlow('local read complete', {
        localCount: localData.items.length,
      });

      // If we have local data, return it immediately and fetch remote in background
      if (localData.items.length > 0) {
        logPropertiesFlow(
          'using local data and starting background remote fetch',
        );

        // Fetch from Supabase in background (non-blocking)
        supabasePropertyService
          .list(normalizedFilters ?? undefined)
          .then(remoteData => {
            // Update the cache with fresh data from server
            queryClient.setQueryData(queryKey, remoteData);
            logPropertiesFlow('background remote fetch success', {
              remoteCount: remoteData.items.length,
            });
          })
          .catch(error => {
            logPropertiesFlow('background remote fetch failed, keeping local', {
              error,
            });
          });

        // Return local data immediately
        return localData;
      }

      // No local data, try to fetch from Supabase with timeout
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 5000),
        );

        const remoteData = await Promise.race([
          supabasePropertyService.list(normalizedFilters ?? undefined),
          timeoutPromise,
        ]);

        logPropertiesFlow('remote fetch success (no local data)', {
          remoteCount: remoteData.items.length,
        });

        return remoteData;
      } catch (error) {
        logPropertiesFlow('remote fetch failed and local is empty', { error });
        // Return empty list as ultimate fallback
        return {
          items: [],
          total: 0,
          limit: 0,
          skip: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnMount: false,
    ...restOptions,
  });
}

/**
 * Hook para crear una nueva propiedad
 */
export function useCreateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, PropertyCreateRequest>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.create.bind(supabasePropertyService),
    onSuccess: newProperty => {
      // Invalida todas las listas de propiedades para refetch automático
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Guarda la nueva propiedad en el cache
      queryClient.setQueryData(
        propertyKeys.detail(newProperty.id),
        newProperty,
      );
    },
    ...options,
  });
}

/**
 * Hook para actualizar una propiedad
 */
export function useUpdateProperty(
  options?: UseMutationOptions<
    PropertyResponse,
    Error,
    { id: string; data: PropertyCreateRequest }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => supabasePropertyService.update(id, data),
    onSuccess: updatedProperty => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(
        propertyKeys.detail(updatedProperty.id),
        updatedProperty,
      );
    },
    ...options,
  });
}

/**
 * Hook para eliminar una propiedad
 */
export function useDeleteProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.delete.bind(supabasePropertyService),
    onSuccess: deletedProperty => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Remueve la propiedad del cache
      queryClient.removeQueries({
        queryKey: propertyKeys.detail(deletedProperty.id),
      });
    },
    ...options,
  });
}

/**
 * Hook para desactivar una propiedad
 */
export function useDeactivateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.deactivate.bind(
      supabasePropertyService,
    ),
    onSuccess: deactivatedProperty => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(
        propertyKeys.detail(deactivatedProperty.id),
        deactivatedProperty,
      );
    },
    ...options,
  });
}

/**
 * Hook para activar una propiedad
 */
export function useActivateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.activate.bind(supabasePropertyService),
    onSuccess: activatedProperty => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(
        propertyKeys.detail(activatedProperty.id),
        activatedProperty,
      );
    },
    ...options,
  });
}
