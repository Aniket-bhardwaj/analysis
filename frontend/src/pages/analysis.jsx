import React, { useEffect, useState } from 'react';
import { Box, Typography, Autocomplete, TextField } from '@mui/material';
import Navbar from '@/components/navbar';
import AnalysisTable from '@/components/analysis_table';

const AnalysisPage = () => {
  const [selectedItem, setSelectedItem] = useState('Analysis');
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/samples`);
        const json = await res.json();
        setSamples(json.samples || json);
      } catch (err) {
        console.error('Failed to fetch samples', err);
      }
    };
    fetchSamples();
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Analysis
          </Typography>
          <Autocomplete
            disablePortal
            id="sample-search"
            options={samples}
            getOptionLabel={(option) => option.name || ''}
            sx={{ width: 300 }}
            value={selectedSample}
            onChange={(e, val) => setSelectedSample(val)}
            renderInput={(params) => <TextField {...params} label="Search Sample" size="small" />}
          />
        </Box>

        {selectedSample && (
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Showing data for: {selectedSample.name}
          </Typography>
        )}

        {selectedSample && <AnalysisTable sampleId={selectedSample.id} />}
      </Box>
    </Box>
  );
};

export default AnalysisPage;