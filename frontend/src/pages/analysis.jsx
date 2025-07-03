import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/navbar';
import AnalysisTable from '@/components/analysis_table';
import ElementGraph from '@/components/element_graph';

const AnalysisPage = () => {
  const [selectedItem, setSelectedItem] = useState('Analysis');
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {location.pathname === '/analysis' && (
          <>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Sample Analysis
            </Typography>
            <AnalysisTable />
          </>
        )}

        {location.pathname === '/analysis/element-inspector' && (
          <>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Element Inspector
            </Typography>
            <ElementGraph />
          </>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisPage;
