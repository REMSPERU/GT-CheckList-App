import { supabaseElectricalPanelService } from './supabase-electrical-panel.service';
import type { TableroElectricoResponse } from '../types/api';

/**
 * Electrical Panel API Service
 * Now using Supabase backend
 */
export const electricalPanelApi = {
  /**
   * Get electrical panels by property ID
   */
  getByProperty: async (
    propertyId: string,
    panelType?: string,
    search?: string,
    config?: boolean | null,
    locations?: string[],
  ): Promise<TableroElectricoResponse[]> => {
    return await supabaseElectricalPanelService.getByProperty(
      propertyId,
      panelType,
      search,
    );
  },

  /**
   * Get electrical panel by ID
   */
  getById: async (id: string): Promise<TableroElectricoResponse> => {
    return await supabaseElectricalPanelService.getById(id);
  },
};
