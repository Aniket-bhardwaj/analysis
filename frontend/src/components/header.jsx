import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { ensureCsrf, apiFetch } from '../csrfClient';

// Helper function to get initials from an email address
const getInitials = (email = '') => {
  const namePart = email.split('@')[0];
  // Capitalize the first letter
  return namePart ? namePart.charAt(0).toUpperCase() : '?';
};

const Header = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
  const userDataString = sessionStorage.getItem('user');
  if (!userDataString) return;

  const userData = JSON.parse(userDataString).user;
  const username = userData.email.split('@')[0];

  // 1️⃣ Set initial user state with org_id only (no org_name yet)
  setUser({ ...userData, username, org_name: 'Loading...' });

  // 2️⃣ Fetch organization list (like you do in admin useEffect)
  apiFetch(`${import.meta.env.VITE_API_URL}/organizations`, { method: 'GET' })
    .then((res) => {
      if (res.ok && Array.isArray(res.data)) {
        // 3️⃣ Find matching organization by ID
        const matchedOrg = res.data.find(
          (org) => String(org.id) === String(userData.org_id)
        );

        // 4️⃣ Update user with fetched org_name
        setUser({
          ...userData,
          username,
          org_name: matchedOrg ? matchedOrg.name : `Org #${userData.org_id}`,
        });
      } else {
        console.warn('Failed to fetch organizations or no data returned');
        setUser({
          ...userData,
          username,
          org_name: `Org #${userData.org_id}`,
        });
      }
    })
    .catch((err) => {
      console.error('Error fetching organization name:', err);
      setUser({
        ...userData,
        username,
        org_name: `Org #${userData.org_id}`,
      });
    });
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
