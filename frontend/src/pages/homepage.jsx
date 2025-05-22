import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "../styles/homepage.css"; 
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  useTheme,
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  FactCheck as QCChecksIcon,
  Analytics as AnalyticsIcon,
  Storage as DataManagerIcon,
  CloudUpload as UploadIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';



const DashboardPage = () => {
  const [selectedItem, setSelectedItem] = useState('Dashboard');
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = location.state?.loggedIn;

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      iconClass: 'menu-icon-dashboard',
      route: '/dashboard'
    },
    {
      text: 'QC Checks',
      icon: <QCChecksIcon />,
      iconClass: 'menu-icon-qc',
      //route: '/qc-checks'
    },
    {
      text: 'Analytics',
      icon: <AnalyticsIcon />,
      iconClass: 'menu-icon-analytics',
      //route: '/analytics'
    },
    {
      text: 'Data Manager',
      icon: <DataManagerIcon />,
      iconClass: 'menu-icon-data',
      //route: '/data-manager'
    },
    {
      text: 'Logout',
      icon: <LogoutIcon />,
      iconClass: 'menu-icon-logout',
      route: '/'
    },
  ];

  const handleItemClick = (itemText, route) => {
    setSelectedItem(itemText);
    if (route && route !== '/dashboard') {
      navigate(route);
    }
  };

  return (
    <Box className="dashboard-container">
      <Drawer
        variant="permanent"
        className="dashboard-drawer"
        classes={{
          paper: 'dashboard-drawer-paper',
        }}
      >
        <Box className="logo-container">
          <img 
            src="/images/img_mati_carbon_logo_white_1.png" 
            alt="Mati Logo" 
            className="logo-image"
          />
          <List className="menu-list">
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding className="menu-list-item">
                <ListItemButton
                  onClick={() => handleItemClick(item.text, item.route)}
                  className={`menu-button ${
                    selectedItem === item.text 
                      ? 'menu-button-selected' 
                      : 'menu-button-default'
                  }`}
                >
                  <ListItemIcon className={`menu-icon ${item.iconClass}`}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      className: selectedItem === item.text 
                        ? 'menu-text-selected' 
                        : 'menu-text-default'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
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