import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { isAuthenticated } from '@/lib/auth';
import { LanguageProvider } from '@/lib/LanguageContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InspectionPage from '@/pages/InspectionPage';
import MechanicPage from '@/pages/MechanicPage';
import FeedbackPage from '@/pages/FeedbackPage';
import PublicFeedbackPage from '@/pages/PublicFeedbackPage';
import AlertsPage from '@/pages/AlertsPage';
import FinancialPage from '@/pages/FinancialPage';
import BusesPage from '@/pages/BusesPage';
import ClientManagementPage from '@/pages/ClientManagementPage';
import BusMasterPage from '@/pages/BusMasterPage';
import UserMasterPage from '@/pages/UserMasterPage';

import '@/App.css';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route path="/feedback" element={<PublicFeedbackPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspections"
            element={
              <ProtectedRoute>
                <InspectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mechanic"
            element={
              <ProtectedRoute>
                <MechanicPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback-management"
            element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial"
            element={
              <ProtectedRoute>
                <FinancialPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buses"
            element={
              <ProtectedRoute>
                <BusesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bus-master"
            element={
              <ProtectedRoute>
                <BusMasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-master"
            element={
              <ProtectedRoute>
                <UserMasterPage />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route
            path="/"
            element={
              isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </LanguageProvider>
  );
}

export default App;
