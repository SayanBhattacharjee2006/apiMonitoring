import apiClient from './apiClient';

export const authService = {
  /**
   * Log in user with username and password
   * Sets HTTP-only cookie 'authToken'
   */
  async login(username, password) {
    const response = await apiClient.post('/api/auth/login', { username, password });
    return response.data; // ResponseFormatter.success -> { success: true, message, data: user }
  },

  /**
   * Onboard the primary Super Admin (bootstrap state only)
   * Sets HTTP-only cookie 'authToken'
   */
  async onboardSuperAdmin({ username, password, email, bootstrapSecret }) {
    const payload = {
      username,
      password,
      email,
      ...(bootstrapSecret ? { bootstrapSecret } : {}),
    };
    const response = await apiClient.post('/api/auth/onboard-super-admin', payload);
    return response.data;
  },

  /**
   * Retrieve current authenticated user profile using session cookie
   */
  async getProfile() {
    const response = await apiClient.get('/api/auth/profile');
    return response.data; // { success: true, data: user }
  },

  /**
   * Log out currently authenticated user (clears cookie)
   */
  async logout() {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  /**
   * Register a user via super admin endpoint (if needed)
   */
  async registerUser({ username, email, password, role, clientId }) {
    const response = await apiClient.post('/api/auth/register', {
      username,
      email,
      password,
      role,
      clientId,
    });
    return response.data;
  },

  /**
   * Register a new independent tenant organization with initial administrator.
   * Calls POST /api/auth/register-tenant
   */
  async registerTenant(tenantData) {
    const response = await apiClient.post('/api/auth/register-tenant', tenantData);
    return response.data;
  },

  /**
   * Check backend health status
   */
  async getHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default authService;

