import axios from 'axios';

/**
 * Centralized Axios client for the API Monitoring Frontend.
 * Uses relative URLs to work seamlessly with Vite dev proxy and production reverse proxies.
 * Sends and receives HTTP-only authentication cookies automatically (withCredentials: true).
 */
const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Extract backend error message if present in standard response structure
    let message = 'An unexpected network error occurred';
    
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.error === 'string') {
        message = data.error;
      } else if (data.error && typeof data.error.message === 'string') {
        message = data.error.message;
      }
    } else if (error.message) {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.statusCode = error.response?.status || 500;
    enhancedError.originalResponse = error.response?.data;
    enhancedError.isNetworkError = !error.response;

    return Promise.reject(enhancedError);
  }
);

export default apiClient;

