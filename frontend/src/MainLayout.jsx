import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/navbar'; // adjust path if needed

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
    <div className="main-layout">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      {/* Add Outlet here or your page content */}
    </div>
  );
};

export default MainLayout;
