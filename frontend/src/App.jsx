import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ClientsPage from './pages/ClientsPage';
import ApiKeysPage from './pages/ApiKeysPage';
import CreateUserPage from './pages/CreateUserPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Hierarchy */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />

          {/* Super Admin Only */}
          <Route
            path="/clients"
            element={
              <ProtectedRoute allowedRoles={['super-admin']}>
                <ClientsPage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin and Client Admin */}
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute allowedRoles={['super-admin', 'client-admin']}>
                <ApiKeysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-user"
            element={
              <ProtectedRoute allowedRoles={['super-admin', 'client-admin']}>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />

          {/* All Authenticated Roles */}
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

