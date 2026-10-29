import { create } from 'zustand';
import authService from '../services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  clientId: null,
  isAuthenticated: false,
  isRestoring: true,
  error: null,
  
  // Scoping context for Super Admins (null means Global Cluster)
  activeScopeClientId: null,

  setActiveScopeClientId: (clientId) => {
    set({ activeScopeClientId: clientId ? clientId.trim() : null });
  },

  /**
   * Restore user session on application start using HTTP-only cookie
   */
  restoreSession: async () => {
    set({ isRestoring: true, error: null });
    try {
      const response = await authService.getProfile();
      if (response && response.data) {
        const user = response.data;
        set({
          user,
          role: user.role || null,
          clientId: user.clientId || null,
          isAuthenticated: true,
          isRestoring: false,
          error: null,
        });
        return user;
      } else {
        set({
          user: null,
          role: null,
          clientId: null,
          isAuthenticated: false,
          isRestoring: false,
        });
        return null;
      }
    } catch (err) {
      // 401 Unauthorized or network error during session restore
      set({
        user: null,
        role: null,
        clientId: null,
        isAuthenticated: false,
        isRestoring: false,
      });
      return null;
    }
  },

  /**
   * Log in with username and password
   */
  login: async (username, password) => {
    set({ error: null });
    try {
      const response = await authService.login(username, password);
      const user = response.data;
      set({
        user,
        role: user.role || null,
        clientId: user.clientId || null,
        isAuthenticated: true,
        isRestoring: false,
        error: null,
      });
      return user;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /**
   * Onboard initial super admin
   */
  onboardSuperAdmin: async ({ username, password, email }) => {
    set({ error: null });
    try {
      const response = await authService.onboardSuperAdmin({ username, password, email });
      const user = response.data;
      set({
        user,
        role: user.role || 'super-admin',
        clientId: user.clientId || null,
        isAuthenticated: true,
        isRestoring: false,
        error: null,
      });
      return user;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /**
   * Logout and clear state
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Even if network failed, clear client state
      console.warn('Logout request warning:', err);
    } finally {
      set({
        user: null,
        role: null,
        clientId: null,
        isAuthenticated: false,
        isRestoring: false,
        activeScopeClientId: null,
        error: null,
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => set({ error: null }),
}));

export default useAuthStore;

