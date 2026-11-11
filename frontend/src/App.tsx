import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider } from './context/ToastContext.js';

// Layout & Shell
import { AppShell } from './components/layout/AppShell.js';

// Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { ApisPage } from './pages/apis/ApisPage.js';
import { AppsPage } from './pages/apps/AppsPage.js';
import { PlaygroundPage } from './pages/playground/PlaygroundPage.js';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage.js';
import { RequestLogsPage } from './pages/requestlogs/RequestLogsPage.js';
import { DocsPage } from './pages/docs/DocsPage.js';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage.js';
import { WebhooksPage } from './pages/webhooks/WebhooksPage.js';
import { SettingsPage } from './pages/settings/SettingsPage.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Management & Gateway Portal Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apis"
                element={
                  <ProtectedRoute>
                    <ApisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apps"
                element={
                  <ProtectedRoute>
                    <AppsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-keys"
                element={
                  <ProtectedRoute>
                    <AppsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/playground"
                element={
                  <ProtectedRoute>
                    <PlaygroundPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-logs"
                element={
                  <ProtectedRoute>
                    <RequestLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs"
                element={
                  <ProtectedRoute>
                    <DocsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute>
                    <SubscriptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/webhooks"
                element={
                  <ProtectedRoute>
                    <WebhooksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
