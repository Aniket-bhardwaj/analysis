import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "../styles/homepage.css"; 
import Navbar from '@/components/navbar';
import { Box, 
        Typography,
        Button } from '@mui/material';


const DashboardPage = () => {
  const [selectedItem, setSelectedItem] = useState('Dashboard')
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = location.state?.loggedIn;

  return (
    <Box className="dashboard-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />      
      {/* Main content area */}
      <Box component="main" className="main-content">
        <Typography variant="h4" component="h1" className="main-title">
          {selectedItem}
        </Typography>
        <Typography variant="body1" className="main-subtitle">
          Welcome to the {selectedItem} section.
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardPage;