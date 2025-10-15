import React, { useState } from 'react';
import Header from '@/components/header';
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Sample Analysis
            </Typography>
            <Header />
            </Box>
            <AnalysisTable />
          </>
        )}

        {location.pathname === '/analysis/element-inspector' && (
          <>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Element Inspector
            </Typography>
            <Header />
            </Box>
            <ElementGraph />
          </>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisPage;
