import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsQueuePage } from './pages/ReportsQueuePage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminConfigPage } from './pages/AdminConfigPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

export function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dashboard - all authenticated staff/admin */}
              <Route path="/" element={<DashboardPage />} />

              {/* Report Queue & Detail */}
              <Route path="/reports" element={<ReportsQueuePage />} />
              <Route path="/reports/:id" element={<ReportDetailPage />} />

              {/* Analytics - Super Admin and Dept Head */}
              <Route
                element={<ProtectedRoute allowedRoles={['super-admin', 'dept-head']} />}
              >
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Admin Configuration - Super Admin only */}
              <Route
                element={<ProtectedRoute allowedRoles={['super-admin']} />}
              >
                <Route path="/admin/config" element={<AdminConfigPage />} />
              </Route>

              {/* 404 Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
