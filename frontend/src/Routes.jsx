import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import RegisterPage from './pages/login';
import DashboardPage from './pages/homepage';
import DataManagerPage from './pages/data_manager';
import QualityCheck from './pages/quality_check';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/data-manager" element={<DataManagerPage />} />
        <Route path= "/qc-checks" element={<QualityCheck />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
