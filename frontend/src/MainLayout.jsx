import React, { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';   // import Outlet
import Navbar from './components/navbar';

const MainLayout = () => {
  const location = useLocation();
  const [selectedItem, setSelectedItem] = useState('');

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/qc-checks/lab-standards')) {
      setSelectedItem('Lab Standards');
    } else if (path.startsWith('/qc-checks/sjs-standards')) {
      setSelectedItem('SJS Standards');
    } else if (path.startsWith('/qc-checks')) {
      setSelectedItem('QC Checks');
    } else if (path.startsWith('/dashboard')) {
      setSelectedItem('Dashboard');
    } else if (path.startsWith('/data-manager')) {
      setSelectedItem('Data Manager');
    } else {
      setSelectedItem('');
    }
  }, [location.pathname]);

  return (
    <div className="main-layout" style={{ display: 'flex' }}>
      {/* Sidebar / Navbar */}
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      {/* Page content goes here */}
      <div style={{ flex: 1, padding: '20px' }}>
        <Outlet />   {/* renders the actual page content */}
      </div>
    </div>
  );
};

export default MainLayout;
