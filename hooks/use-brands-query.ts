import { useQuery } from '@tanstack/react-query';
import { getLocalBrandsForEquipment } from '@/services/db';
import { getStaticBrandsForEquipment } from '@/constants/brands';
import type { BrandOption } from '@/constants/brands';

export const brandKeys = {
  all: ['brands'] as const,
  byEquipment: (equipamentoId?: string | null) =>
    [...brandKeys.all, equipamentoId] as const,
};

/**
 * Hook para obtener las marcas disponibles para un tipo de equipo (id_equipamento).
 * Si no hay marcas en la base de datos local SQLite (ej. antes de sincronizar),
 * recurre al catálogo estático en constants/brands.ts como fallback.
 */
export function useBrandsForEquipment(
  equipamentoId?: string | null,
  abreviatura?: string | null,
  nombre?: string | null,
) {
  return useQuery<BrandOption[], Error>({
    queryKey: brandKeys.byEquipment(equipamentoId),
    networkMode: 'always',
    queryFn: async () => {
      try {
        const localBrands = await getLocalBrandsForEquipment(equipamentoId);
        if (localBrands && localBrands.length > 0) {
          // Asegurar que "OTROS" esté en la lista
          const hasOtros = localBrands.some(
            b => b.nombre.toUpperCase() === 'OTROS',
          );
          const mappedBrands = localBrands.map(b => ({
            id: String(b.id),
            nombre: b.nombre,
          }));
          if (!hasOtros) {
            mappedBrands.push({ id: 'brand-otros', nombre: 'OTROS' });
          }
          return mappedBrands;
        }
      } catch (error) {
        console.error('Error fetching local brands from SQLite:', error);
      }

      // Fallback a marcas estáticas si no hay datos en SQLite
      return getStaticBrandsForEquipment(abreviatura, nombre);
    },
  });
}
