// API Configuration

export const API_CONFIG = {
  BASE_URL: 'http://ec2-18-191-140-131.us-east-2.compute.amazonaws.com',
  API_PREFIX: '/api',
  TIMEOUT: 30000, // 30 seconds
  
  // Token configuration
  TOKEN_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  },
  
  // Endpoints
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
      VERIFY: '/auth/verify',
    },
  },
} as const;

// Helper to build full URL
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${endpoint}`;
};
