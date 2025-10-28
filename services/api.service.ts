import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api';
import type {
    ErrorResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse
} from '../types/api';
import { TokenService } from './token.service';

/**
 * API Client service for making authenticated requests
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

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
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await TokenService.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for the refresh to complete
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await TokenService.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.axiosInstance.post<TokenResponse>(
              API_CONFIG.ENDPOINTS.AUTH.REFRESH,
              { refresh_token: refreshToken }
            );

            const { access_token, refresh_token } = response.data;
            await TokenService.saveTokens(access_token, refresh_token);

            // Retry all failed requests
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];

            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and reject all queued requests
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            await TokenService.clearTokens();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API errors and format them
   */
  private handleError(error: unknown): ErrorResponse {
    if (axios.isAxiosError(error)) {
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

  // ==================== Auth Endpoints ====================

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    try {
      const response = await this.axiosInstance.post<TokenResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      
      // Save tokens
      const { access_token, refresh_token } = response.data;
      await TokenService.saveTokens(access_token, refresh_token);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<UserResponse> {
    try {
      const response = await this.axiosInstance.post<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      await TokenService.clearTokens();
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await this.axiosInstance.get<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.ME
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.axiosInstance.get(API_CONFIG.ENDPOINTS.AUTH.VERIFY);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await this.axiosInstance.post<TokenResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REFRESH,
        { refresh_token: refreshToken } as RefreshTokenRequest
      );
      
      const { access_token, refresh_token } = response.data;
      await TokenService.saveTokens(access_token, refresh_token);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
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
