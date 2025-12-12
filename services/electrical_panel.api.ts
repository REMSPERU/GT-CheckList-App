import { API_CONFIG } from '../config/api';
import { httpClient } from '../lib/http-client';
import type { TableroElectricoResponse } from '../types/api';

/**
 * Electrical Panel API Service
 * Contains all electrical panel-related API calls
 */
export const electricalPanelApi = {
    /**
     * Get electrical panels by property ID
     */
    getByProperty: async (propertyId: string, panelType?: string): Promise<TableroElectricoResponse[]> => {
        try {
            return await httpClient.get<TableroElectricoResponse[]>(
                `${API_CONFIG.ENDPOINTS.ELECTRICAL_PANEL.BY_PROPERTY}/${propertyId}/electrical_panels${panelType ? `?tipo=${panelType}` : ''}`
            );
        } catch (error) {
            throw httpClient.handleError(error);
        }
    },
};
