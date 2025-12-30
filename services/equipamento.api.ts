import { supabaseEquipamentoService } from './supabase-equipamento.service';
import type { EquipamentoListResponse } from '../types/api';

/**
 * Equipamento API Service
 * Now using Supabase backend
 */
export const equipamentoApi = {
  /**
   * Get equipamentos by property ID
   */
  getByProperty: async (
    propertyId: string,
  ): Promise<EquipamentoListResponse> => {
    return await supabaseEquipamentoService.getByProperty(propertyId);
  },
};
