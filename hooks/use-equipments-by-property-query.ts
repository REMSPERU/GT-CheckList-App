import { useQuery } from '@tanstack/react-query';
import { equipamentoApi } from '../services/equipamento.api';
import type { EquipamentoListResponse } from '../types/api';

export const useEquipamentosByPropertyQuery = (propertyId: string) => {
  return useQuery<EquipamentoListResponse, Error>({
    queryKey: ['equipamentos', 'byProperty', propertyId],
    queryFn: () => equipamentoApi.getByProperty(propertyId),
    enabled: !!propertyId, // Only run the query if propertyId is provided
  });
};
