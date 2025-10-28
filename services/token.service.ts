import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/api';

/**
 * Secure token storage service using expo-secure-store
 */
export class TokenService {
  /**
   * Save access token securely
   */
  static async saveAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(API_CONFIG.TOKEN_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error('Error saving access token:', error);
      throw error;
    }
  }

  /**
   * Get access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(API_CONFIG.TOKEN_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Save refresh token securely
   */
  static async saveRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(API_CONFIG.TOKEN_KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw error;
    }
  }

  /**
   * Get refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(API_CONFIG.TOKEN_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Save both tokens at once
   */
  static async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.saveAccessToken(accessToken),
      this.saveRefreshToken(refreshToken),
    ]);
  }

  /**
   * Clear all tokens (logout)
   */
  static async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(API_CONFIG.TOKEN_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(API_CONFIG.TOKEN_KEYS.REFRESH_TOKEN),
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid tokens
   */
  static async hasTokens(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return !!accessToken;
  }
}
