// API Configuration

export const API_CONFIG = {
  BASE_URL: "http://localhost:8000",
  API_PREFIX: "/api",
  TIMEOUT: 30000, // 30 seconds

  // Token configuration
  TOKEN_KEYS: {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
  },

  // Endpoints
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: "/auth/login",
      REGISTER: "/auth/register",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      ME: "/auth/me",
      VERIFY: "/auth/verify",
    },
    // Property
    PROPERTY: {
      CREATE: "/property/create",
      ALL: "/property/all",
      BY_ID: "/property",
      DEACTIVATE: "/property",
      ACTIVATE: "/property",
      UPDATE: "/property",
    },
  },
} as const;

// Helper to build full URL
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${endpoint}`;
};
