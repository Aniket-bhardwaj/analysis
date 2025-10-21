import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../csrfClient';
import Header from '@/components/header';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
} from '@mui/material';
import '../styles/navbar.css';

import {
  Dashboard as DashboardIcon,
  FactCheck as QCChecksIcon,
  Analytics as AnalyticsIcon,
  Storage as DataManagerIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL; // e.g., http://127.0.0.1:8081/api

const Navbar = ({ selectedItem, setSelectedItem }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openQCSubMenu, setOpenQCSubMenu] = useState(false);
  const [openAnalysisSubMenu, setOpenAnalysisSubMenu] = useState(false);

  useEffect(() => {
    // Expand menus based on current path + keep side selection in sync
    if (location.pathname.startsWith('/qc-checks')) {
      setOpenQCSubMenu(true);
      if (!['Lab Standards', 'SJS Standards'].includes(selectedItem)) {
        setSelectedItem('QC Checks');
      }
    } else {
      setOpenQCSubMenu(false);
    }

    if (location.pathname.startsWith('/analysis')) {
      setOpenAnalysisSubMenu(true);
      if (!['Sample Analysis', 'Element Inspector'].includes(selectedItem)) {
        setSelectedItem('Analysis');
      }
    } else {
      setOpenAnalysisSubMenu(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleItemClick = (itemText, route) => {
    setSelectedItem(itemText);
    if (route) navigate(route);
  };

  // Real logout: call backend to destroy session, then force redirect
  const handleLogout = async () => {
    sessionStorage.removeItem('user');
    return navigate('/');
    // try {
    //   await apiFetch(`${API}/auth/logout`, {
    //     method: 'POST',
    //     credentials: 'include',
    //   });
    // } catch (err) {
    //   console.error('Logout failed:', err);
    //   // even if it fails, continue to redirect; server may already have killed the session
    // } finally {
    //   setSelectedItem('');
    //   window.location.replace('/'); // go to login; ProtectedRoute will block protected pages
    // }
  };

  return (
    <Drawer
      variant="permanent"
      className="dashboard-drawer"
      classes={{ paper: 'dashboard-drawer-paper' }}
    >
      <Box className="logo-container">
        <img src="/images/bluelogoiitk.png" alt="IITK Logo" className="logo-image" />
        <hr/>
        <List className="menu-list">
          {/* Dashboard */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Dashboard', '/dashboard')}
              className={`menu-button ${
                selectedItem === 'Dashboard' ? 'menu-button-selected' : 'menu-button-default'
              }`}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{
                  className:
                    selectedItem === 'Dashboard' ? 'menu-text-selected' : 'menu-text-default',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* Data Manager */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('Data Manager', '/data-manager')}
              className={`menu-button ${
                selectedItem === 'Data Manager' ? 'menu-button-selected' : 'menu-button-default'
              }`}
            >
              <ListItemIcon>
                <DataManagerIcon />
              </ListItemIcon>
              <ListItemText
                primary="Data Manager"
                primaryTypographyProps={{
                  className:
                    selectedItem === 'Data Manager' ? 'menu-text-selected' : 'menu-text-default',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* QC Checks */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => handleItemClick('QC Checks', '/qc-checks')}
              className={`menu-button ${
                selectedItem === 'QC Checks' ? 'menu-button-selected' : 'menu-button-default'
              }`}
            >
              <ListItemIcon>
                <QCChecksIcon />
              </ListItemIcon>
              <ListItemText
                primary="QC Checks"
                primaryTypographyProps={{
                  className:
                    selectedItem === 'QC Checks' ? 'menu-text-selected' : 'menu-text-default',
                }}
              />
              {openQCSubMenu ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
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
                    onClick={() => {
                      handleItemClick(subItem.text, subItem.route);
                      window.dispatchEvent(
                        new CustomEvent('forceScrollToSection', { detail: subItem.route })
                      );
                    }}
                    className={`menu-button ${
                      selectedItem === subItem.text ? 'menu-button-selected' : 'menu-button-default'
                    }`}
                    sx={{ pl: 9, minHeight: 0 }}
                  >
                    <ListItemText
                      primary={subItem.text}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        className:
                          selectedItem === subItem.text
                            ? 'menu-text-selected'
                            : 'menu-text-default',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>

          {/* Analysis */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={() => setOpenAnalysisSubMenu(!openAnalysisSubMenu)}
              className={`menu-button ${
                selectedItem === 'Analysis' ? 'menu-button-selected' : 'menu-button-default'
              }`}
            >
              <ListItemIcon>
                <AnalyticsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Analysis"
                primaryTypographyProps={{
                  className:
                    selectedItem === 'Analysis' ? 'menu-text-selected' : 'menu-text-default',
                }}
              />
              {openAnalysisSubMenu ? (
                <ExpandLess fontSize="small" />
              ) : (
                <ExpandMore fontSize="small" />
              )}
            </ListItemButton>
          </ListItem>

          <Collapse in={openAnalysisSubMenu} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Sample Analysis */}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick('Sample Analysis', '/analysis')}
                  className={`menu-button ${
                    selectedItem === 'Sample Analysis'
                      ? 'menu-button-selected'
                      : 'menu-button-default'
                  }`}
                  sx={{ pl: 9, minHeight: 0 }}
                >
                  <ListItemText
                    primary="Sample Analysis"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      className:
                        selectedItem === 'Sample Analysis'
                          ? 'menu-text-selected'
                          : 'menu-text-default',
                    }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Element Inspector */}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() =>
                    handleItemClick('Element Inspector', '/analysis/element-inspector')
                  }
                  className={`menu-button ${
                    selectedItem === 'Element Inspector'
                      ? 'menu-button-selected'
                      : 'menu-button-default'
                  }`}
                  sx={{ pl: 9, minHeight: 0 }}
                >
                  <ListItemText
                    primary="Element Inspector"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      className:
                        selectedItem === 'Element Inspector'
                          ? 'menu-text-selected'
                          : 'menu-text-default',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>

          {/* Logout */}
          <ListItem disablePadding className="menu-list-item">
            <ListItemButton
              onClick={handleLogout}
              className={`menu-button ${
                selectedItem === 'Logout' ? 'menu-button-selected' : 'menu-button-default'
              }`}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  className: selectedItem === 'Logout' ? 'menu-text-selected' : 'menu-text-default',
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
        <hr/>
      </Box>
      <Box className="profile-container">
      <Header />
      </Box>
    </Drawer>
  );
};

export default Navbar;
