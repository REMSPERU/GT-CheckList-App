import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { supabasePropertyService } from '../services/supabase-property.service';
import type {
  PropertyCreateRequest,
  PropertyListResponse,
  PropertyResponse,
} from '../types/api';

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
  options?: Omit<UseQueryOptions<PropertyResponse, Error>, 'queryKey' | 'queryFn'>
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
 * Hook para obtener lista de propiedades con filtros
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
  options?: Omit<UseQueryOptions<PropertyListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => supabasePropertyService.list(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
    ...options,
  });
}

/**
 * Hook para crear una nueva propiedad
 */
export function useCreateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, PropertyCreateRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.create.bind(supabasePropertyService),
    onSuccess: (newProperty) => {
      // Invalida todas las listas de propiedades para refetch automático
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Guarda la nueva propiedad en el cache
      queryClient.setQueryData(propertyKeys.detail(newProperty.id), newProperty);
    },
    ...options,
  });
}

/**
 * Hook para actualizar una propiedad
 */
export function useUpdateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, { id: string; data: PropertyCreateRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => supabasePropertyService.update(id, data),
    onSuccess: (updatedProperty) => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);
    },
    ...options,
  });
}

/**
 * Hook para eliminar una propiedad
 */
export function useDeleteProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.delete.bind(supabasePropertyService),
    onSuccess: (deletedProperty) => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Remueve la propiedad del cache
      queryClient.removeQueries({ queryKey: propertyKeys.detail(deletedProperty.id) });
    },
    ...options,
  });
}

/**
 * Hook para desactivar una propiedad
 */
export function useDeactivateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.deactivate.bind(supabasePropertyService),
    onSuccess: (deactivatedProperty) => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(propertyKeys.detail(deactivatedProperty.id), deactivatedProperty);
    },
    ...options,
  });
}

/**
 * Hook para activar una propiedad
 */
export function useActivateProperty(
  options?: UseMutationOptions<PropertyResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supabasePropertyService.activate.bind(supabasePropertyService),
    onSuccess: (activatedProperty) => {
      // Invalida todas las listas de propiedades
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Actualiza la propiedad en el cache
      queryClient.setQueryData(propertyKeys.detail(activatedProperty.id), activatedProperty);
    },
    ...options,
  });
}
