// temporary homepage to check if login works
import React from 'react';
import { useLocation } from 'react-router-dom';

const HomePage = () => {
  const location = useLocation();
  const loggedIn = location.state?.loggedIn;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Home Page</h2>
      {loggedIn ? (
        <p style={{ color: 'green', fontWeight: 'bold' }}>Successfully Logged In</p>
      ) : (
        <p>Welcome to the homepage.</p>
      )}
    </div>
  );
};

export default HomePage;
