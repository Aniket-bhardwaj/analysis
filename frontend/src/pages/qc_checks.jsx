import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import {
  Folder as FolderIcon,
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

import Navbar from '@/components/navbar';
import QCTable from '@/components/qc_table';
import SJS_Table from '@/components/sjs_table';
import QCGraph from '@/components/qc_graph';
import SJS_Graph from '@/components/sjs_graph';
import NestedFilterDrawer from '@/components/common/Filter';

const QCChecks = () => {
  const { section } = useParams();


  const location = useLocation();
  const preselectedFileId = location.state?.fileId;

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
    if (!selectedFileId || !section) return;
    const scrollTarget =
      section === 'lab-standards' ? qcTableRef :
      section === 'sjs-standards' ? sjsTableRef : null;

    if (scrollTarget?.current) {
      setTimeout(() => {
        scrollTarget.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedFileId, section]);

  const fetchUploadedFiles = async (filters) => {
    setLoading(true);
    setError(null);
    let url = `http://localhost:5000/uploaded-files`;

    if (filters?.startDate && filters?.endDate) {
      const params = new URLSearchParams({
        start_date: filters.startDate,
        end_date: filters.endDate,
      });
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const files = data.files || data.data || (Array.isArray(data) ? data : []);
      setUploadedFiles(files);

      if (files.length > 0 && !selectedFileId) {
        const defaultId = preselectedFileId || files[0].id || files[0].file_id;
        setSelectedFileId(defaultId);
      }

    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchSummaryData = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/summary?file_id=${selectedFileId}`
      );
      const result = await response.json();
      const summaryData = result.summary || {
        totalElements: 0,
        elementsWithinTolerance: 0,
        averageRSD: 0,
        averageErrorPercentage: 0,
      };
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary(null);
    }
  };

  useEffect(() => {
    if (selectedFileId) {
      fetchSummaryData();
    } else {
      setSummary(null);
    }
  }, [selectedFileId]);

  const handleApplyFilter = (filterData) => {
    setError(null);
    if (filterData.type === 'clear') {
      setSelectedFileId('');
      fetchUploadedFiles();
    } else if (filterData.type === 'date') {
      setSelectedFileId('');
      fetchUploadedFiles({ startDate: filterData.startDate, endDate: filterData.endDate });
    } else if (filterData.type === 'file') {
      const fileId = filterData.file.id || filterData.file.file_id;
      setSelectedFileId(fileId);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      <div style={{ flexGrow: 1, padding: '24px' }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          QC Checks
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <NestedFilterDrawer
              uploadedFiles={uploadedFiles}
              onApplyFilter={handleApplyFilter}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
                startIcon={<TableChartIcon />}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('graph')}
                startIcon={<BarChartIcon />}
              >
                Graph
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 3 }} />}

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
                    value={summary.totalElements > 0 ? (summary.elementsWithinTolerance / summary.totalElements) * 100 : 0}
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
          <>
            <QCGraph selectedFileId={selectedFileId} />
            <Box mt={4}>
              <SJS_Graph selectedFileId={selectedFileId} />
            </Box>
          </>
        )}

        {!selectedFileId && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FilterListIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Apply a Filter to Begin
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Use the filter to select a specific file or narrow down the file list by date.
              </Typography>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QCChecks;