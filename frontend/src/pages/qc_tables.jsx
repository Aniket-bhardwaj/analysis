import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';

// Icons
import {
  AnalyticsOutlined as AnalyticsIcon,
  BarChart as BarChartIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  TableChart as TableChartIcon,
  Folder as FolderIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// MiniChart component
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

const QCTable = () => {
  // State variables
  const [selectedItem, setSelectedItem] = useState('qc-tables');
  const [viewMode, setViewMode] = useState('table');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const location = useLocation();
  
  // New state for file selection and data
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedSolutionLabel, setSelectedSolutionLabel] = useState('QC_MES_5 ppm');
  const [availableSolutionLabels, setAvailableSolutionLabels] = useState([]);
  const [qcData, setQcData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  // Set selected file if passed through navigation state
  useEffect(() => {
    if (location.state && location.state.fileId) {
      setSelectedFileId(location.state.fileId);
    }
  }, [location.state]);

  // Fetch uploaded files on component mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Fetch QC data when file or solution label changes
  useEffect(() => {
    if (selectedFileId) {
      fetchQCData();
      fetchSolutionLabels();
    }
  }, [selectedFileId, selectedSolutionLabel]);

  // API Functions
  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Updated API endpoint to match your backend route
      const response = await fetch('http://localhost:5000/uploaded-files', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      
      // Handle different possible response structures
      let files = [];
      if (Array.isArray(data)) {
        files = data;
      } else if (data.files && Array.isArray(data.files)) {
        files = data.files;
      } else if (data.success && data.files) {
        files = data.files;
      } else if (data.data && Array.isArray(data.data)) {
        files = data.data;
      }
      
      setUploadedFiles(files);
      
      // Auto-select first file if available
      if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id || files[0].file_id);
      }
    } catch (err) {
      console.error('Error fetching uploaded files:', err);
      setError(`Failed to load files: ${err.message}`);
      setUploadedFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQCData = async () => {
    if (!selectedFileId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `http://localhost:5000/table-data?file_id=${selectedFileId}&solution_label=${encodeURIComponent(selectedSolutionLabel)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setQcData(result.tableData || []);
        setSummary(result.summary || null);
        setFileInfo(result.fileInfo || null);
      } else {
        throw new Error(result.message || 'Failed to load QC data');
      }
    } catch (err) {
      setError(`Failed to load QC data: ${err.message}`);
      console.error('Error fetching QC data:', err);
      setQcData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolutionLabels = async () => {
    if (!selectedFileId) return;
    
    try {
      const response = await fetch(
        `http://localhost:5000/table-solution-labels?file_id=${selectedFileId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Solution labels response is not JSON, using defaults');
        setAvailableSolutionLabels(['QC_MES_5 ppm']);
        return;
      }
      
      const result = await response.json();
      if (result.success && result.solutionLabels) {
        setAvailableSolutionLabels(result.solutionLabels.qcLabels || ['QC_MES_5 ppm']);
      } else {
        setAvailableSolutionLabels(['QC_MES_5 ppm']);
      }
    } catch (err) {
      console.error('Error fetching solution labels:', err);
      setAvailableSolutionLabels(['QC_MES_5 ppm']);
    }
  };

  // Event Handlers
  const handleFileChange = (event) => {
    const fileId = event.target.value;
    setSelectedFileId(fileId);
    setQcData([]); // Clear previous data
    setSummary(null);
    setError(null);
  };

  const handleSolutionLabelChange = (event) => {
    setSelectedSolutionLabel(event.target.value);
  };

  const handleRefresh = () => {
    if (selectedFileId) {
      fetchQCData();
    }
    fetchUploadedFiles();
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleRowExpansion = (element) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(element)) {
      newExpandedRows.delete(element);
    } else {
      newExpandedRows.add(element);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusInfo = (isWithinTolerance, errorPercentage) => {
    if (isWithinTolerance) {
      return {
        icon: <CheckCircleIcon />,
        label: 'Pass',
        color: 'success'
      };
    } else {
      return {
        icon: <ErrorIcon />,
        label: 'Fail',
        color: 'error'
      };
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !qcData.length) return qcData;

    return [...qcData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [qcData, sortConfig]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar Navigation */}
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      
      <div style={{ flexGrow: 1, padding: '24px' }}>
        {/* Header with controls */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            QC Tables
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            {/* File Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Select File</InputLabel>
                <Select
                  value={selectedFileId}
                  onChange={handleFileChange}
                  label="Select File"
                  startAdornment={<FolderIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  {uploadedFiles.map((file) => (
                    <MenuItem key={file.id || file.file_id} value={file.id || file.file_id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {file.filename || file.original_name || file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {file.uploaded_at || file.created_at ? 
                            new Date(file.uploaded_at || file.created_at).toLocaleDateString() : 
                            'Unknown date'
                          }
                        </Typography>
                      </Box>
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

            {/* Solution Label Selection */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Solution Label</InputLabel>
                <Select
                  value={selectedSolutionLabel}
                  onChange={handleSolutionLabelChange}
                  label="Solution Label"
                >
                  {availableSolutionLabels.map((label) => (
                    <MenuItem key={label} value={label}>
                      {label}
                    </MenuItem>
                  ))}
                  {availableSolutionLabels.length === 0 && (
                    <MenuItem value="QC_MES_5 ppm">QC_MES_5 ppm (default)</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* View Toggle and Refresh */}
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  startIcon={<TableChartIcon />}
                  onClick={() => setViewMode('table')}
                  size="small"
                >
                  Table
                </Button>
                
                <Button
                  variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                  startIcon={<BarChartIcon />}
                  onClick={() => setViewMode('graph')}
                  size="small"
                >
                  Graph
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  size="small"
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* File Info */}
        {fileInfo && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                File Information
              </Typography>
              <Stack direction="row" spacing={3} alignItems="center">
                <Typography variant="body2">
                  <strong>File:</strong> {fileInfo.filename}
                </Typography>
                <Typography variant="body2">
                  <strong>Uploaded:</strong> {new Date(fileInfo.uploadedAt).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Solution:</strong> {selectedSolutionLabel}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Summary Cards */}
        {summary && !loading && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AnalyticsIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
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
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
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
                <CardContent sx={{ textAlign: 'center' }}>
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
                <CardContent sx={{ textAlign: 'center' }}>
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

        {/* Main Table */}
        {!loading && qcData.length > 0 && (
          <Card>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Quality Control Analysis
              </Typography>
              <Chip 
                label={`Solution: ${selectedSolutionLabel}`}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>

            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'element'}
                        direction={sortConfig.key === 'element' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('element')}
                      >
                        Element
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Units</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'valueAvg'}
                        direction={sortConfig.key === 'valueAvg' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('valueAvg')}
                      >
                        Value (avg)
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'rsd'}
                        direction={sortConfig.key === 'rsd' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('rsd')}
                      >
                        RSD%
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'errorPercentage'}
                        direction={sortConfig.key === 'errorPercentage' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('errorPercentage')}
                      >
                        Error%
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Distribution</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((row, index) => {
                    const statusInfo = getStatusInfo(row.isWithinTolerance, row.errorPercentage);
                    const isExpanded = expandedRows.has(row.element);
                    
                    return (
                      <React.Fragment key={row.element || index}>
                        <TableRow hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {row.element}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => toggleRowExpansion(row.element)}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={row.units} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {row.valueAvg}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2"
                              color={row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'}
                            >
                              {row.rsd}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2"
                              color={statusInfo.color === 'error' ? 'error' : 'success.main'}
                            >
                              {row.errorPercentage}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Distribution visualization">
                              <div>
                                <MiniChart data={row.distributionData || []} />
                              </div>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={statusInfo.icon}
                              label={statusInfo.label}
                              color={statusInfo.color}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Row Content */}
                        <TableRow>
                          <TableCell colSpan={7} sx={{ py: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                  Detailed Statistics for {row.element}
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2 }}>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Statistical Summary
                                      </Typography>
                                      <Stack spacing={1}>
                                        <Typography variant="body2">
                                          <strong>Sample Count:</strong> {row.sampleCount}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Standard Deviation:</strong> {row.standardDeviation}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Min Value:</strong> {row.minValue}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Max Value:</strong> {row.maxValue}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Quality Status:</strong> {row.qualityStatus}
                                        </Typography>
                                      </Stack>
                                    </Paper>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2 }}>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Quality Assessment
                                      </Typography>
                                      <Stack spacing={1}>
                                        <Typography variant="body2">
                                          <strong>Error Tolerance:</strong> {row.errorTolerance}%
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Within Tolerance:</strong> {row.isWithinTolerance ? 'Yes' : 'No'}
                                        </Typography>
                                        {row.correctedValueAvg && (
                                          <Typography variant="body2">
                                            <strong>Corrected Average:</strong> {row.correctedValueAvg}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Paper>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* No Data Message */}
        {!loading && qcData.length === 0 && selectedFileId && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
                No QC Data Found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No QC data available for the selected file and solution label.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* No File Selected Message */}
        {!selectedFileId && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
                Select a File to View QC Data
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Choose an uploaded file from the dropdown above to view its QC analysis.
              </Typography>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QCTable;