import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseService } from '@/services/db';
import { updateEquipment, createEquipment } from '@/services/db/equipment';
import { syncService } from '@/services/sync';
import type { SistemaChecklistResponse } from '@/types/api';
import type {
  InventoryEquipo,
  InventorySistema,
  InventoryEquipamento,
} from '@/types/inventory';
import type {
  UpdateEquipmentData,
  CreateEquipmentData,
} from '@/services/db/equipment';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const inventoryKeys = {
  all: ['inventory'] as const,
  systems: (propertyId: string) =>
    [...inventoryKeys.all, 'systems', propertyId] as const,
  checklistSystems: (propertyId: string) =>
    [...inventoryKeys.all, 'checklist-systems', propertyId] as const,
  equipamentos: (propertyId: string, sistemaId: string) =>
    [...inventoryKeys.all, 'equipamentos', propertyId, sistemaId] as const,
  equipos: (propertyId: string, equipamentoId: string) =>
    [...inventoryKeys.all, 'equipos', propertyId, equipamentoId] as const,
  equipo: (equipoId: string) =>
    [...inventoryKeys.all, 'equipo', equipoId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Hook to get all systems for a property.
 * Reads from local SQLite mirror (offline-first).
 */
export function useInventorySystems(propertyId: string) {
  return useQuery<InventorySistema[], Error>({
    queryKey: inventoryKeys.systems(propertyId),
    networkMode: 'always',
    queryFn: () =>
      DatabaseService.getInventorySystemsByProperty(propertyId) as Promise<
        InventorySistema[]
      >,
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/**
 * Hook to get systems and their equipment types grouped (like in checklist flow).
 * Reads from local SQLite mirror (offline-first).
 */
export function useInventoryChecklistSystems(propertyId: string) {
  return useQuery<SistemaChecklistResponse[], Error>({
    queryKey: inventoryKeys.checklistSystems(propertyId),
    networkMode: 'always',
    queryFn: () =>
      DatabaseService.getChecklistSystemsByProperty(propertyId) as Promise<
        SistemaChecklistResponse[]
      >,
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/**
 * Hook to get all equipamentos for a specific system within a property.
 * Reads from local SQLite mirror (offline-first).
 */
export function useInventoryEquipamentos(
  propertyId: string,
  sistemaId: string,
) {
  return useQuery<InventoryEquipamento[], Error>({
    queryKey: inventoryKeys.equipamentos(propertyId, sistemaId),
    networkMode: 'always',
    queryFn: () =>
      DatabaseService.getInventoryEquipamentosBySystem(
        propertyId,
        sistemaId,
      ) as Promise<InventoryEquipamento[]>,
    enabled: !!propertyId && !!sistemaId,
    staleTime: 30_000,
  });
}

/**
 * Hook to get all equipos of a specific equipamento type for a property.
 * Reads from local SQLite mirror (offline-first).
 * Includes both ACTIVO and INACTIVO equipos.
 */
export function useInventoryEquipos(
  propertyId: string,
  equipamentoId?: string,
) {
  const reqEquipamentoId = equipamentoId || 'all';
  return useQuery<InventoryEquipo[], Error>({
    queryKey: inventoryKeys.equipos(propertyId, reqEquipamentoId),
    networkMode: 'always',
    queryFn: () =>
      DatabaseService.getInventoryEquiposByEquipamento(
        propertyId,
        reqEquipamentoId,
      ) as Promise<InventoryEquipo[]>,
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/**
 * Hook to get a single equipo by ID from local mirror.
 * Used by the equipment hub screen.
 */
export function useInventoryEquipoDetail(equipoId: string) {
  return useQuery<InventoryEquipo | null, Error>({
    queryKey: inventoryKeys.equipo(equipoId),
    networkMode: 'always',
    queryFn: () =>
      DatabaseService.getInventoryEquipoById(
        equipoId,
      ) as Promise<InventoryEquipo | null>,
    enabled: !!equipoId,
    staleTime: 30_000,
  });
}

/**
 * Hook to get all available equipment types (equipamentos) from local mirror,
 * grouped by their system name.
 */
export function useAllInventoryEquipamentos() {
  return useQuery({
    queryKey: [...inventoryKeys.all, 'all-equipamentos'] as const,
    networkMode: 'always',
    queryFn: () => DatabaseService.getAllInventoryEquipamentos(),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mutation to create a new equipment entry in Supabase.
 * On success, invalidates all inventory queries so lists refresh.
 */
export function useCreateEquipo() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateEquipmentData>({
    mutationFn: data => createEquipment(data),
    onSuccess: async (_result, variables) => {
      try {
        await syncService.triggerSync('inventory-equipo-created', {
          force: true,
        });
      } catch (error) {
        console.log('[Inventory] post-create sync failed', error);
      }
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.systems(variables.id_property),
      });
    },
  });
}

/**
 * Mutation to update an equipment's detail in Supabase.
 * On success, invalidates the specific equipo detail query.
 */
export function useUpdateEquipo(
  equipoId: string,
  propertyId: string,
  equipamentoId: string,
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, UpdateEquipmentData>({
    mutationFn: data => updateEquipment(equipoId, data),
    onSuccess: async () => {
      try {
        await syncService.triggerSync('inventory-equipo-updated', {
          force: true,
        });
      } catch (error) {
        console.log('[Inventory] post-update sync failed', error);
      }
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.equipo(equipoId),
      });
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.equipos(propertyId, equipamentoId),
      });
    },
  });
}
