// HTTP Client exports
export { httpClient } from './http-client';

// Service exports
export { apiClient } from '../services/api.service'; // Deprecated - use httpClient + React Query hooks
export { TokenService } from '../services/token.service';

// API Service exports
export { authApi } from '../services/auth.api';
export { propertyApi } from '../services/property.api';

// React Query exports
export { QueryProvider, queryClient } from './query-provider';
export * from '../hooks/use-auth-query';
export * from '../hooks/use-property-query';

// Context exports
export { AuthProvider, useAuth, useRequireAuth } from '../contexts/AuthContext';

// Type exports
export type {
    ApiResponse, ErrorResponse, LoginRequest,
    RegisterRequest,
    TokenResponse, User, UserResponse,
    PropertyResponse, PropertyCreateRequest, PropertyListResponse
} from '../types/api';

export { RoleEnum } from '../types/api';

// Config exports
export { API_CONFIG, buildUrl } from '../config/api';

