import apiClient from './apiClient';

export const analyticsService = {
  /**
   * Fetch aggregated dashboard payload: { stats, topEndpoints, recentTimeSeries }
   * @param {Object} params
   * @param {string|number} [params.startTime] - ISO date string or epoch ms
   * @param {string|number} [params.endTime] - ISO date string or epoch ms
   * @param {string} [params.clientId] - Optional client ID (Super Admin scope)
   */
  async getDashboard(params = {}) {
    const cleanParams = {};
    if (params.startTime) cleanParams.startTime = params.startTime;
    if (params.endTime) cleanParams.endTime = params.endTime;
    if (params.clientId) cleanParams.clientId = params.clientId;

    const response = await apiClient.get('/api/analytics/dashboard', {
      params: cleanParams,
    });
    return response.data; // { success: true, message, data: { stats, topEndpoints, recentTimeSeries } }
  },

  /**
   * Fetch overall KPI stats
   * @param {Object} params
   */
  async getStats(params = {}) {
    const cleanParams = {};
    if (params.startTime) cleanParams.startTime = params.startTime;
    if (params.endTime) cleanParams.endTime = params.endTime;
    if (params.clientId) cleanParams.clientId = params.clientId;

    const response = await apiClient.get('/api/analytics/stats', {
      params: cleanParams,
    });
    return response.data;
  },
};

export default analyticsService;

