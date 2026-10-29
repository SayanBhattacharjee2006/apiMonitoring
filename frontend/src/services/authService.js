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
   * Check backend health status
   */
  async getHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default authService;

