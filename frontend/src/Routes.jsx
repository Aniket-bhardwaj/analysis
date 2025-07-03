import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import RegisterPage from './pages/login';
import DashboardPage from './pages/homepage';
import DataManagerPage from './pages/data_manager';
import QCChecks from './pages/qc_checks';
import AnalysisPage from './pages/analysis';
import MainLayout from './MainLayout'; // where you placed the Navbar

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/" element={<MainLayout />}></Route>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/data-manager" element={<DataManagerPage />} />
        <Route path="/qc-checks/:section?" element={<QCChecks />} />
        <Route path="/analysis/*" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;