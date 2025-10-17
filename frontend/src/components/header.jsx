import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';

// Helper function to get initials from an email address
const getInitials = (email = '') => {
  const namePart = email.split('@')[0];
  // Capitalize the first letter
  return namePart ? namePart.charAt(0).toUpperCase() : '?';
};

const Header = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const userDataString = sessionStorage.getItem('user');
      if (userDataString) {
        // As seen in LoginPage.jsx, the user object is nested within the session data
        const userData = JSON.parse(userDataString).user;

        // Derive a display username from the email (e.g., "admin@gmail.com" -> "admin")
        const username = userData.email.split('@')[0];

        // Use the organization name provided from the backend.
        // This assumes your /auth/login endpoint returns `org_name` in the user object.
        // If it's missing, it falls back to showing the organization ID.
        const orgName = userData.org_id==1? 'Main Lab' : (userData.org_id==2? 'Client Lab A' : 'Client Lab B'); //To Fix

        setUser({ ...userData, username, org_name: orgName });
      }
    } catch (error) {
      console.error('Failed to parse user data from sessionStorage:', error);
      setUser(null); // Clear user state on error
    }
  }, []);

  if (!user) {
    // Return null or a loading placeholder. Null avoids layout shifts.
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
        {getInitials(user.email)}
      </Avatar>
      <Box sx={{ textAlign: 'left' }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 'bold', textTransform: 'capitalize', lineHeight: 1.2 }}
        >
          {user.username}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user.org_name}
        </Typography>
      </Box>
    </Box>
  );
};

export default Header;
