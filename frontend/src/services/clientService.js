import apiClient from './apiClient';

export const clientService = {
  /**
   * Onboard a new client tenant (Super Admin only)
   * @param {Object} data
   * @param {string} data.name - Client legal name
   * @param {string} data.email - Primary operations email
   * @param {string} [data.description] - Description or scope
   * @param {string} [data.website] - Client website URL
   */
  async onboardClient({ name, email, description, website }) {
    const response = await apiClient.post('/api/admin/client/onboard', {
      name,
      email,
      description,
      website,
    });
    return response.data; // { success: true, message, data: client }
  },

  /**
   * List all clients accessible to the current user
   * (Super Admin gets all clients; Client Admin/Viewer gets their assigned client)
   */
  async getClients() {
    const response = await apiClient.get('/api/admin/clients');
    return response.data; // { success: true, message, data: clients }
  },

  /**
   * Get single client by ID
   * @param {string} clientId
   */
  async getClientById(clientId) {
    if (!clientId) {
      throw new Error('Client ID is required');
    }
    const response = await apiClient.get(`/api/admin/client/${clientId}`);
    return response.data;
  },

  /**
   * Create a new client user under a specific client tenant
   * @param {string} clientId - Target client ID
   * @param {Object} userData
   * @param {string} userData.username
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {string} [userData.role] - 'client-admin' | 'client-viewer'
   */
  async createClientUser(clientId, { username, email, password, role }) {
    if (!clientId) {
      throw new Error('Target Client ID is required');
    }
    const response = await apiClient.post(`/api/admin/client/${clientId}/users`, {
      username,
      email,
      password,
      role: role || 'client-viewer',
    });
    return response.data; // { success: true, message, data: clientUser }
  },
};

export default clientService;
