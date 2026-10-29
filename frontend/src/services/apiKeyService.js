import apiClient from './apiClient';

export const apiKeyService = {
  /**
   * Create a new API ingestion key for a client.
   * Returns newly minted key object including plaintext keyValue (displayed only once).
   * @param {string} clientId
   * @param {Object} keyData
   * @param {string} keyData.name
   * @param {string} [keyData.description]
   * @param {string} [keyData.environment] - 'production' | 'staging' | 'development' | 'testing'
   */
  async createApiKey(clientId, { name, description, environment = 'production' }) {
    if (!clientId) {
      throw new Error('Client ID is required to create API key');
    }
    const response = await apiClient.post(`/api/admin/client/${clientId}/api/keys`, {
      name,
      description,
      environment,
    });
    return response.data; // { success: true, message, data: apikey (includes keyValue) }
  },

  /**
   * List all active API keys metadata for a specific client.
   * Note: The backend redacts keyValue in listing responses.
   * @param {string} clientId
   */
  async getClientApiKeys(clientId) {
    if (!clientId) {
      throw new Error('Client ID is required to fetch API keys');
    }
    const response = await apiClient.get(`/api/admin/client/${clientId}/api/keys`);
    return response.data; // { success: true, message, data: [ apikey (without keyValue) ] }
  },
};

export default apiKeyService;

