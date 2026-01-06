import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { API_CONFIG } from '../config/api';
import type {
  ErrorResponse,
} from '../types/api';
import { supabaseAuthService } from './supabase-auth.service';

/**
 * API Client service for making authenticated requests
 */
class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token from Supabase
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const session = await supabaseAuthService.getSession();
        const token = session?.access_token;
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      },
    );

    // Response interceptor - basic error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        return Promise.reject(error);
      },
    );
  }

  /**
   * Handle API errors and format them
   */
  private handleError(error: unknown): ErrorResponse {
    if (isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.data) {
        return axiosError.response.data;
      }
      return {
        detail: axiosError.message || 'An unexpected error occurred',
      };
    }
    return {
      detail: 'An unexpected error occurred',
    };
  }
  
  /**
   * Get axios instance for custom requests
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
