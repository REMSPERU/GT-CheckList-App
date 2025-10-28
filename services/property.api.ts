import { API_CONFIG } from '../config/api';
import { httpClient } from '../lib/http-client';
import type {
  PropertyCreateRequest,
  PropertyListResponse,
  PropertyResponse,
} from '../types/api';

/**
 * Property API Service
 * Contains all property-related API calls
 */
export const propertyApi = {
  /**
   * Create a new property
   */
  create: async (data: PropertyCreateRequest): Promise<PropertyResponse> => {
    try {
      return await httpClient.post<PropertyResponse>('/property/create', data);
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },

  /**
   * Get property by ID
   */
  getById: async (propertyId: string): Promise<PropertyResponse> => {
    try {
      return await httpClient.get<PropertyResponse>(`/property/${propertyId}`);
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },

  /**
   * List properties with filters
   */
  list: async (params?: {
    search?: string;
    city?: string;
    property_type?: string;
    is_active?: boolean;
    maintenance_priority?: string;
    skip?: number;
    limit?: number;
  }): Promise<PropertyListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.city) queryParams.append('city', params.city);
      if (params?.property_type) queryParams.append('property_type', params.property_type);
      if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
      if (params?.maintenance_priority) queryParams.append('maintenance_priority', params.maintenance_priority);
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const url = queryString ? `/property/?${queryString}` : '/property/';

      return await httpClient.get<PropertyListResponse>(url);
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },
};
