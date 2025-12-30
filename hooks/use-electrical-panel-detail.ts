import { useQuery } from '@tanstack/react-query';
import { electricalPanelApi } from '../services/electrical_panel.api';
import type { TableroElectricoResponse } from '../types/api';

export const useElectricalPanelDetail = (id: string) => {
  return useQuery<TableroElectricoResponse, Error>({
    queryKey: ['electricalPanel', id],
    queryFn: () => electricalPanelApi.getById(id),
    enabled: !!id,
  });
};
