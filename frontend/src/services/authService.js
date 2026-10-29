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
  async onboardSuperAdmin({ username, password, email }) {
    const response = await apiClient.post('/api/auth/onboard-super-admin', {
      username,
      password,
      email,
    });
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
   * Note: The current backend contract does not have a public tenant registration route;
   * this attempts to call POST /api/auth/register-tenant (or POST /api/auth/register).
   * It properly communicates contract errors or success back to the UI.
   */
  async registerTenant(tenantData) {
    try {
      const response = await apiClient.post('/api/auth/register-tenant', tenantData);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error(
          'Tenant registration endpoint (POST /api/auth/register-tenant) is not implemented on the backend. The backend currently requires Super Admin authorization to onboard clients.'
        );
      }
      throw err;
    }
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

