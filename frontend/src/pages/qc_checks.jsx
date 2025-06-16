import React, { useState, useEffect } from 'react';
import QCGraph from '../components/qc_graph';
import QCTable from '../components/qc_table';
import Navbar from '../components/navbar';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import { TableChart, BarChart } from '@mui/icons-material';

const QCChecks = () => {
  const [selectedView, setSelectedView] = useState('table');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedSolutionLabel, setSelectedSolutionLabel] = useState('QC_MES_5 ppm');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [availableSolutionLabels, setAvailableSolutionLabels] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/uploaded-files`);
          const data = await response.json();
      
          setUploadedFiles(data);
          if (data.length > 0) {
            setSelectedFileId(data[0].id || data[0].file_id);
          }
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      };

    fetchFiles();
  }, []);

  useEffect(() => {
    const fetchLabels = async () => {
      if (!selectedFileId) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/table-solution-labels?file_id=${selectedFileId}`);
        const result = await res.json();
        if (result.success && result.solutionLabels) {
          setAvailableSolutionLabels(result.solutionLabels.qcLabels || []);
        }
      } catch (error) {
        console.error('Error fetching solution labels:', error);
      }
    };
    fetchLabels();
  }, [selectedFileId]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar selectedItem="qc-checks" setSelectedItem={() => {}} />

      <div style={{ flexGrow: 1, padding: 24 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Quality Checks</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select File</InputLabel>
              <Select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                label="Select File"
              >
                {uploadedFiles.map((file) => (
                  <MenuItem key={file.id || file.file_id} value={file.id || file.file_id}>
                    {file.filename || file.original_name || file.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Solution Label</InputLabel>
              <Select
                value={selectedSolutionLabel}
                onChange={(e) => setSelectedSolutionLabel(e.target.value)}
                label="Solution Label"
              >
                {availableSolutionLabels.map((label) => (
                  <MenuItem key={label} value={label}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1}>
              <Button
                variant={selectedView === 'table' ? 'contained' : 'outlined'}
                onClick={() => {
                  console.log("Table clicked");
                  setSelectedView('table')}}
                startIcon={<TableChart />}
                size="small"
              >
                Table
              </Button>
              <Button
                variant={selectedView === 'graph' ? 'contained' : 'outlined'}
                onClick={() => {
                  console.log("Graph clicked");
                  setSelectedView('graph')}}
                startIcon={<BarChart />}
                size="small"
              >
                Graph
              </Button>
            </Stack>
          </Stack>
          {console.log('Selected View:', selectedView)}
        </Box>

        {selectedView === 'table' ? (
          <QCTable
            selectedFileId={selectedFileId}
            selectedSolutionLabel={selectedSolutionLabel}
          />
        ) : (
          <QCGraph
            selectedFileId={selectedFileId}
            selectedSolutionLabel={selectedSolutionLabel}
          />
        )}
      </div>
    </div>
  );
};

export default QCChecks;