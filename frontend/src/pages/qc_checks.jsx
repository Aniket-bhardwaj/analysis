import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom'; // CHANGED
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Folder as FolderIcon,
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

import Navbar from '@/components/navbar';
import QCTable from '@/components/qc_table';
import SJS_Table from '@/components/sjs_table';
import QCGraph from '@/components/qc_graph';

const QCChecks = () => {
  const { section } = useParams(); // CHANGED
  const [selectedItem, setSelectedItem] = useState('qc-tables');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [summary, setSummary] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const qcTableRef = useRef(null);
  const sjsTableRef = useRef(null);

  useEffect(() => {
    if (section && uploadedFiles.length > 0 && !selectedFileId) {
      const defaultId = uploadedFiles[0].id || uploadedFiles[0].file_id;
      setSelectedFileId(defaultId);
    }
  }, [section, uploadedFiles, selectedFileId]);
  
  useEffect(() => {
    if (!selectedFileId || !section) return;
  
    const scrollTarget =
      section === 'lab-standards' ? qcTableRef :
      section === 'sjs-standards' ? sjsTableRef : null;
  
    if (scrollTarget?.current) {
      setTimeout(() => {
        scrollTarget.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // Small delay ensures DOM renders
    }
  }, [selectedFileId, section]);
  

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/uploaded-files`);
      const data = await response.json();
      const files = data.files || data.data || Array.isArray(data) ? data : [];
      setUploadedFiles(files);
      if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id || files[0].file_id);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFileId(e.target.value);
    setSummary(null);
    setError(null);
  };

  const fetchSummaryData = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/summary?file_id=${selectedFileId}`
      );
      const result = await response.json();
      const summary = result.summary || {
        totalElements: 0,
        elementsWithinTolerance: 0,
        averageRSD: 0,
        averageErrorPercentage: 0,
      };
      setSummary(summary);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary(null);
    }
  };

  useEffect(() => {
    if (selectedFileId) fetchSummaryData();
  }, [selectedFileId]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      <div style={{ flexGrow: 1, padding: '24px' }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          QC Tables
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Select File</InputLabel>
              <Select
                value={selectedFileId || ''}
                onChange={handleFileChange}
                label="Select File"
                startAdornment={<FolderIcon sx={{ mr: 1, color: 'action.active' }} />}
              >
                {uploadedFiles.map((file) => (
                  <MenuItem key={file.id || file.file_id} value={file.id || file.file_id}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {file.filename || file.original_name || file.name}
                    </Typography>
                  </MenuItem>
                ))}
                {uploadedFiles.length === 0 && (
                  <MenuItem disabled>
                    {loading ? 'Loading files...' : 'No files available'}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
                startIcon={<TableChartIcon />}
                size="small"
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('graph')}
                startIcon={<BarChartIcon />}
                size="small"
              >
                Graph
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {summary && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', minHeight: 110 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {summary.totalElements}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Total Elements
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', minHeight: 110 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {summary.elementsWithinTolerance}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Within Tolerance
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(summary.elementsWithinTolerance / summary.totalElements) * 100}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', minHeight: 110 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                    {summary.averageRSD}%
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Average RSD
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', minHeight: 110 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                    {summary.averageErrorPercentage}%
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Average Error
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {selectedFileId && viewMode === 'table' && (
          <>
            <div ref={qcTableRef}>
              <QCTable selectedFileId={selectedFileId} />
            </div>
            <Box mt={4} ref={sjsTableRef}>
              <SJS_Table selectedFileId={selectedFileId} />
            </Box>
          </>
        )}

        {selectedFileId && viewMode === 'graph' && (
          <QCGraph selectedFileId={selectedFileId} />
        )}

        {!selectedFileId && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Select a File to View QC Data
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Choose a file from dropdown above to begin QC analysis.
              </Typography>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QCChecks;
