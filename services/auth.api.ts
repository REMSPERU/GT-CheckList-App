import { API_CONFIG } from '../config/api';
import { httpClient } from '../lib/http-client';
import { TokenService } from './token.service';
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
} from '../types/api';

/**
 * Authentication API Service
 * Contains all auth-related API calls
 */
export const authApi = {
  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    try {
      const response = await httpClient.post<TokenResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      
      // Save tokens
      const { access_token, refresh_token } = response;
      await TokenService.saveTokens(access_token, refresh_token);
      
      return response;
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },

  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    try {
      const response = await httpClient.post<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        data
      );
      return response;
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      await TokenService.clearTokens();
    }
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    try {
      const response = await httpClient.get<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.ME
      );
      return response;
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },

  /**
   * Verify current token
   */
  verifyToken: async (): Promise<boolean> => {
    try {
      await httpClient.get(API_CONFIG.ENDPOINTS.AUTH.VERIFY);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    try {
      const response = await httpClient.post<TokenResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REFRESH,
        { refresh_token: refreshToken }
      );
      
      const { access_token, refresh_token } = response;
      await TokenService.saveTokens(access_token, refresh_token);
      
      return response;
    } catch (error) {
      throw httpClient.handleError(error);
    }
  },
};
