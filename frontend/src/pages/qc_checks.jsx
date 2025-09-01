import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import {
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
  Alert,
  ThemeProvider,
} from '@mui/material';
import { TableChart as TableChartIcon, BarChart as BarChartIcon } from '@mui/icons-material';

import { Calculator, CheckSquare, Activity, AlertTriangle, FileText } from 'lucide-react';

import Navbar from '@/components/navbar';
import QCTable from '@/components/qc_table';
import SJS_Table from '@/components/sjs_table';
import QCGraph from '@/components/qc_graph';
import SJS_Graph from '@/components/sjs_graph';
import NestedFilterDrawer from '@/components/common/Filter';

import customTheme from '../theme';
import '../styles/qc_checks.css';

const formatDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // 🔥 no timezone shift
};


const QCChecks = () => {
  const { section } = useParams();
  const location = useLocation();
  const preselectedFileId = location.state?.fileId;

  const [selectedItem, setSelectedItem] = useState('qc-tables');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState(null);

  const [summary, setSummary] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const qcTableRef = useRef(null);
  const sjsTableRef = useRef(null);

  useEffect(() => {
    if (!section) return;
    const scrollTarget =
      section === 'lab-standards' ? qcTableRef : section === 'sjs-standards' ? sjsTableRef : null;

    if (scrollTarget?.current) {
      requestAnimationFrame(() => {
        scrollTarget.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  }, [section]);

  useEffect(() => {
    const handler = (e) => {
      const targetRoute = e.detail; // e.g. "/qc-checks/lab-standards"
      const section = targetRoute.split('/').pop(); // "lab-standards" or "sjs-standards"

      const scrollTarget =
        section === 'lab-standards' ? qcTableRef : section === 'sjs-standards' ? sjsTableRef : null;

      if (scrollTarget?.current) {
        requestAnimationFrame(() => {
          scrollTarget.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      }
    };

    window.addEventListener('forceScrollToSection', handler);
    return () => window.removeEventListener('forceScrollToSection', handler);
  }, []);

  const fetchFileMeta = async (fileId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/file-meta?file_id=${fileId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Assuming data is directly the metadata object like:
      // { filename: "...", uploaded_at: "...", uploaded_by: "...", type: ... }
      if (data && (data.filename || data.uploaded_at || data.uploaded_by || data.fileType)) {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            const currentFileId = f.id || f.file_id;
            return currentFileId === fileId
              ? {
                  ...f,
                  filename: data.filename,
                  uploaded_at: data.uploaded_at, // Use uploaded_at directly
                  uploaded_by: data.uploaded_by,
                  type: data.file_type, // Use 'type' or fallback to 'fileType'
                }
              : f;
          })
        );
      }
    } catch (err) {
      console.error('❌ Failed to fetch file meta:', err);
      // Optionally, set an error state here if meta data fetching is critical
    }
  };

  const fetchUploadedFiles = async (filters) => {
    setLoading(true);
    setError(null);
    let url = `${import.meta.env.VITE_API_URL}/uploaded-files`;

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
      let url = `${import.meta.env.VITE_API_URL}/summary`;
      const params = new URLSearchParams();

      if (selectedFileId) params.append('file_id', selectedFileId);
      if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
        params.append('start_date', formatDate(new Date(selectedDateRange.startDate)));
        params.append('end_date', formatDate(new Date (selectedDateRange.endDate)));
      }

      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
    if (selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) {
      fetchSummaryData();

      if (selectedFileId) {
        fetchFileMeta(selectedFileId); // keep this only when fileId is selected
      }
    } else {
      setSummary(null);
    }
  }, [selectedFileId, selectedDateRange]);

  const handleApplyFilter = (filterData) => {
    setError(null);

    if (filterData.type === 'clear') {
      setSelectedFileId('');
      setSelectedDateRange(null);
      fetchUploadedFiles();
    } else if (filterData.type === 'date') {
      setSelectedFileId(''); // ⛔ clear file
      setSelectedDateRange({
        startDate: filterData.startDate,
        endDate: filterData.endDate,
      });
      fetchUploadedFiles({ startDate: filterData.startDate, endDate: filterData.endDate });
    } else if (filterData.type === 'file') {
      const fileId = filterData.file.id || filterData.file.file_id;
      setSelectedFileId(fileId);
      setSelectedDateRange(null); // ✅ clear date
    }
  };

  return (
    <ThemeProvider theme={customTheme}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

        <div style={{ flexGrow: 1, padding: '24px' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              QC Checks
            </Typography>

            {/* This Stack now contains the view mode buttons AND the filter */}
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ pr: 0.5 }} // Adjust this value as needed for fine-tuning
            >
              {/* View mode buttons first */}
              <Stack direction="row" spacing={1}>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  startIcon={<TableChartIcon />}
                  sx={{
                    ...(viewMode === 'table' && {
                      backgroundColor: 'black',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#333',
                      },
                    }),
                    ...(viewMode !== 'table' && {
                      borderColor: 'black',
                      color: 'black',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }),
                  }}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('graph')}
                  startIcon={<BarChartIcon />}
                  sx={{
                    ...(viewMode === 'graph' && {
                      backgroundColor: 'black',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#333',
                      },
                    }),
                    ...(viewMode !== 'graph' && {
                      borderColor: 'black',
                      color: 'black',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }),
                  }}
                >
                  Graph
                </Button>
              </Stack>
              {/* Then the filter drawer */}
              <NestedFilterDrawer
                uploadedFiles={uploadedFiles}
                onApplyFilter={handleApplyFilter}
                selectedFile={selectedFileId}
                selectedDateRange={selectedDateRange}
              />
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {loading && <LinearProgress sx={{ mb: 3 }} />}
          {selectedFileId &&
            uploadedFiles.length > 0 &&
            (() => {
              const file = uploadedFiles.find(
                (f) => f.id === selectedFileId || f.file_id === selectedFileId
              );
              if (!file) return null;

              return (
                <Box sx={{ mt: 2, ml: 1.5, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Showing data for:
                  </Typography>
                  <Stack direction="row" spacing={4} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary">
                      📁 {file.filename || '— No filename —'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🕒 Uploaded at:{' '}
                      {file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      👤 Uploaded by: {file.uploaded_by || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🧪 Type: {file.type}
                    </Typography>
                  </Stack>
                </Box>
              );
            })()}

          {summary && (
            <div className="summary-grid">
              {/* Card 1: Total Elements */}
              <Card elevation={2} className="summary-card">
                <CardContent className="card-content">
                  <div className="card-icon" style={{ backgroundColor: '#e3f2fd' }}>
                    <Calculator size={24} color="#1976d2" />
                  </div>
                  <Typography variant="summaryValue" sx={{ color: '#1976d2', mb: 0.5 }}>
                    {summary.totalElements}
                  </Typography>
                  <Typography variant="summaryLabel">Total Elements</Typography>
                </CardContent>
              </Card>
              {/* Card 2: Outside Tolerance (Unchanged) */}
              <Card elevation={2} className="summary-card">
                <CardContent className="card-content">
                  <div className="card-icon" style={{ backgroundColor: '#ffebee' }}>
                    <AlertTriangle size={24} color="#f44336" />
                  </div>
                  <Typography variant="summaryValue" sx={{ color: '#f44336', mb: 0.5 }}>
                    {summary.elementsNotWithinTolerance}
                  </Typography>
                  <Typography variant="summaryLabel" sx={{ mb: 1 }}>
                    Outside Tolerance
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={
                      summary.totalElements > 0
                        ? ((summary.elementsNotWithinTolerance) /
                            summary.totalElements) *
                          100
                        : 0
                    }
                    color="error"
                    sx={{ width: '100%' }}
                  />
                </CardContent>
              </Card>
              {/* Card 3: Average RSD (Changed to Blue) */}
              <Card elevation={2} className="summary-card">
                <CardContent className="card-content">
                  <div className="card-icon" style={{ backgroundColor: '#e3f2fd' }}>
                    <Activity size={24} color="#1976d2" />
                  </div>
                  <Typography variant="summaryValue" sx={{ color: '#1976d2', mb: 0.5 }}>
                    {summary.averageRSD}%
                  </Typography>
                  <Typography variant="summaryLabel">Average RSD</Typography>
                </CardContent>
              </Card>
              {/* Card 4: Average Error (Changed to Blue) */}
              <Card elevation={2} className="summary-card">
                <CardContent className="card-content">
                  <div className="card-icon" style={{ backgroundColor: '#e3f2fd' }}>
                    <AlertTriangle size={24} color="#1976d2" />
                  </div>
                  <Typography variant="summaryValue" sx={{ color: '#1976d2', mb: 0.5 }}>
                    {summary.averageErrorPercentage}%
                  </Typography>
                  <Typography variant="summaryLabel">Average Error</Typography>
                </CardContent>
              </Card>
            </div>
          )}

          {(selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) &&
            viewMode === 'table' && (
              <>
                <div ref={qcTableRef}>
                  <QCTable selectedFileId={selectedFileId} selectedDateRange={selectedDateRange} />
                </div>

                <Box mt={4} ref={sjsTableRef}>
                  <SJS_Table
                    selectedFileId={selectedFileId}
                    selectedDateRange={selectedDateRange}
                  />
                </Box>
              </>
            )}

          {(selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) &&
            viewMode === 'graph' && (
              <>
                <QCGraph selectedFileId={selectedFileId} selectedDateRange={selectedDateRange} />
                <Box mt={4}>
                  <SJS_Graph
                    selectedFileId={selectedFileId}
                    selectedDateRange={selectedDateRange}
                  />
                </Box>
              </>
            )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default QCChecks;