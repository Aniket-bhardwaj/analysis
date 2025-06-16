import React from 'react';
import { Box, Typography } from '@mui/material';

const MiniChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 60,
        height: 30,
        backgroundColor: '#f5f5f5',
        borderRadius: 1
      }}>
        <Typography variant="caption" color="textSecondary">
          No data
        </Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'end', 
      gap: 1, 
      height: 30,
      width: 60
    }}>
      {data.slice(0, 8).map((value, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            backgroundColor: '#1976d2',
            borderRadius: '2px 2px 0 0',
            height: `${Math.max(((value - minValue) / range) * 100, 10)}%`,
            minHeight: '2px',
            opacity: 0.8
          }}
        />
      ))}
    </Box>
  );
};

export default MiniChart;``