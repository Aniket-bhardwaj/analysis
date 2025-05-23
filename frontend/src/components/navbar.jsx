import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  FactCheck as QCChecksIcon,
  Analytics as AnalyticsIcon,
  Storage as DataManagerIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

const menuItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    iconClass: 'menu-icon-dashboard',
    route: '/dashboard',
  },
  {
    text: 'QC Checks',
    icon: <QCChecksIcon />,
    iconClass: 'menu-icon-qc',
    //route: '/qc-checks',
  },
  {
    text: 'Analytics',
    icon: <AnalyticsIcon />,
    iconClass: 'menu-icon-analytics',
    //route: '/analytics',
  },
  {
    text: 'Data Manager',
    icon: <DataManagerIcon />,
    iconClass: 'menu-icon-data',
    route: '/data-manager',
  },
  {
    text: 'Logout',
    icon: <LogoutIcon />,
    iconClass: 'menu-icon-logout',
    route: '/',
  },
];

const Navbar = ({ selectedItem, setSelectedItem }) => {
  const navigate = useNavigate();

  const handleItemClick = (itemText, route) => {
    setSelectedItem(itemText);
    if (route && route !== '/dashboard') {
      navigate(route);
    }
  };

  return (
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
  );
};

export default Navbar;
