import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InspectionPage from '@/pages/InspectionPage';
import BusesPage from '@/pages/BusesPage';
import BusMasterPage from '@/pages/BusMasterPage';
import AlertsPage from '@/pages/AlertsPage';
import FeedbackPage from '@/pages/FeedbackPage';
import PublicFeedbackPage from '@/pages/PublicFeedbackPage';
import FinancialPage from '@/pages/FinancialPage';
import MechanicPage from '@/pages/MechanicPage';
import UserMasterPage from '@/pages/UserMasterPage';
import ClientManagementPage from '@/pages/ClientManagementPage';
import { getAuthUser } from '@/lib/auth';
import { toast } from 'sonner';
import '@/index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = await getAuthUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    toast.success(t('loginSuccess'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success(t('logoutSuccess'));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App" dir={language === 'KN' ? 'rtl' : 'ltr'}>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/" 
            element={!user ? <Navigate to="/login" /> : <Layout user={user} onLogout={handleLogout} />}
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inspection" element={<InspectionPage />} />
            <Route path="buses" element={<BusesPage />} />
            <Route path="bus-master" element={<BusMasterPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="financial" element={<FinancialPage />} />
            <Route path="mechanic" element={<MechanicPage />} />
            
            {/* Admin only routes */}
            {(user?.role === 'ADMIN' || user?.role === 'PLATFORM_ADMIN') && (
              <>
                <Route path="users" element={<UserMasterPage />} />
                <Route path="clients" element={<ClientManagementPage />} />
              </>
            )}
            
            {/* Platform admin only routes */}
            {user?.role === 'PLATFORM_ADMIN' && (
              <Route path="clients" element={<ClientManagementPage />} />
            )}
          </Route>
          
          {/* Public routes */}
          <Route path="/feedback/:busId" element={<PublicFeedbackPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
