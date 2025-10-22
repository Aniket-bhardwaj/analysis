// src/Routes.jsx  (NO <Router> here)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RegisterPage from './pages/login';
import DashboardPage from './pages/homepage';
import DataManagerPage from './pages/data_manager';
import QCChecks from './pages/qc_checks';
import AnalysisPage from './pages/analysis';
import MainLayout from './MainLayout';
import ManageAccessPage from './pages/admin/manage-access';
// If ProtectedRoute is at src/ProtectedRoute.jsx use "./ProtectedRoute"
import ProtectedRoute from './components/ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* public login */}
      <Route path="/" element={<RegisterPage />} />

      {/* protect EVERYTHING under the layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/data-manager" element={<DataManagerPage />} />
        <Route path="/qc-checks/:section?" element={<QCChecks />} />
        <Route path="/analysis/*" element={<AnalysisPage />} />
        <Route path="/admin/manage-access" element={<ManageAccessPage />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
