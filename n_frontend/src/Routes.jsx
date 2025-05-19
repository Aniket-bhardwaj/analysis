import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import RegisterPage from './pages/Register';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RegisterPage />} /> {/* Default route redirects to register */}
      </Routes>
    </Router>
  );
};

export default AppRoutes;