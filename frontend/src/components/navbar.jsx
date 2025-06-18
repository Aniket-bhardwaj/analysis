import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  IconButton,
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  FactCheck as QCChecksIcon,
  Analytics as AnalyticsIcon,
  Storage as DataManagerIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

const Navbar = ({ selectedItem, setSelectedItem }) => {
  const navigate = useNavigate();
  const [openQCSubMenu, setOpenQCSubMenu] = useState(false);

  const handleItemClick = (itemText, route) => {
    setSelectedItem(itemText);
    if (route) navigate(route);
  };

  const handleQCToggle = (e) => {
    e.stopPropagation(); // Prevents navigation on icon click
    setOpenQCSubMenu(!openQCSubMenu);
  };

  return (
    <Drawer
      variant="permanent"
      className="dashboard-drawer"
      classes={{ paper: 'dashboard-drawer-paper' }}
    >
      <Box className="logo-container">
        <img
          src="/images/img_mati_carbon_logo_black_1.png"
          alt="Mati Logo"
          className="logo-image"
        />
        <List className="menu-list">
          {/* Dashboard */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Dashboard', '/dashboard')}
              className={`menu-button ${selectedItem === 'Dashboard' ? 'menu-button-selected' : 'menu-button-default'}`}
            >
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{ className: selectedItem === 'Dashboard' ? 'menu-text-selected' : 'menu-text-default' }}
              />
            </ListItemButton>
          </ListItem>

          {/* QC Checks */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('QC Checks', '/qc-checks')}
              className={`menu-button ${selectedItem === 'QC Checks' ? 'menu-button-selected' : 'menu-button-default'}`}
            >
              <ListItemIcon><QCChecksIcon /></ListItemIcon>
              <ListItemText
                primary="QC Checks"
                primaryTypographyProps={{ className: selectedItem === 'QC Checks' ? 'menu-text-selected' : 'menu-text-default' }}
              />
              <IconButton edge="end" onClick={handleQCToggle} size="small">
                {openQCSubMenu ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </ListItemButton>
          </ListItem>

          {/* QC Submenu */}
          <Collapse in={openQCSubMenu} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {[
                { text: 'Lab Standards', route: '/qc-checks/lab-standards' },
                { text: 'SJS Standards', route: '/qc-checks/sjs-standards' },
              ].map((subItem) => (
                <ListItem key={subItem.text} disablePadding>
                  <ListItemButton
                    onClick={() => handleItemClick(subItem.text, subItem.route)}
                    className={`menu-button ${selectedItem === subItem.text ? 'menu-button-selected' : 'menu-button-default'}`}
                    sx={{ pl: 9, minHeight: 0 }}
                  >
                    <ListItemText
                      primary={subItem.text}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        className: selectedItem === subItem.text ? 'menu-text-selected' : 'menu-text-default',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>

          {/* Analytics */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Analytics', '/analytics')}
              className={`menu-button ${selectedItem === 'Analytics' ? 'menu-button-selected' : 'menu-button-default'}`}
            >
              <ListItemIcon><AnalyticsIcon /></ListItemIcon>
              <ListItemText
                primary="Analytics"
                primaryTypographyProps={{ className: selectedItem === 'Analytics' ? 'menu-text-selected' : 'menu-text-default' }}
              />
            </ListItemButton>
          </ListItem>

          {/* Data Manager */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Data Manager', '/data-manager')}
              className={`menu-button ${selectedItem === 'Data Manager' ? 'menu-button-selected' : 'menu-button-default'}`}
            >
              <ListItemIcon><DataManagerIcon /></ListItemIcon>
              <ListItemText
                primary="Data Manager"
                primaryTypographyProps={{ className: selectedItem === 'Data Manager' ? 'menu-text-selected' : 'menu-text-default' }}
              />
            </ListItemButton>
          </ListItem>

          {/* Logout */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Logout', '/')}
              className={`menu-button ${selectedItem === 'Logout' ? 'menu-button-selected' : 'menu-button-default'}`}
            >
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ className: selectedItem === 'Logout' ? 'menu-text-selected' : 'menu-text-default' }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Navbar;
