import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { API_CONFIG } from "../config/api";
import { supabaseAuthService } from "../services/supabase-auth.service";
import type { ErrorResponse } from "../types/api";

/**
 * HTTP Client for making API requests
 * This is a simplified version focused on request/response handling
 * React Query will handle caching, retries, and state management
 */
class HttpClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await supabaseAuthService.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor - Supabase handles token refresh automatically
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // If we get 401, user needs to re-authenticate
        if (error.response?.status === 401) {
          // Supabase will handle session refresh automatically
          // If we still get 401, the session is truly invalid
          await supabaseAuthService.signOut();
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Handle API errors and format them
   */
  handleError(error: unknown): ErrorResponse {
    // Using axios.isAxiosError for type guard
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.data) {
        return axiosError.response.data;
      }
      return {
        detail: axiosError.message || "An unexpected error occurred",
      };
    }
    return {
      detail: "An unexpected error occurred",
    };
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: InternalAxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: InternalAxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: InternalAxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    config?: InternalAxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get axios instance for custom requests
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
export default httpClient;
