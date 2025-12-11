import { API_CONFIG } from '../config/api';
import { httpClient } from '../lib/http-client';
import type { EquipamentoListResponse } from '../types/api';

/**
 * Equipamento API Service
 * Contains all equipamento-related API calls
 */
export const equipamentoApi = {
    /**
     * Get equipamentos by property ID
     */
    getByProperty: async (propertyId: string): Promise<EquipamentoListResponse> => {
        try {
            return await httpClient.get<EquipamentoListResponse>(
                `${API_CONFIG.ENDPOINTS.EQUIPAMENTO.BY_PROPERTY}/${propertyId}/equipamentos`
            );
        } catch (error) {
            throw httpClient.handleError(error);
        }
    },
};
