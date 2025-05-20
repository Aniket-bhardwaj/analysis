import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import RegisterPage from './pages/login';
import HomePage from './pages/homepage';
// import UploadPage from './pages/upload';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/homepage" element={<HomePage />} />
        {/* <Route path="/upload" element={<UploadPage />} /> */}
      </Routes>
    </Router>
  );
};

export default AppRoutes;
