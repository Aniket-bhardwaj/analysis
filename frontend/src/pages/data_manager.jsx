import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import {
  Box,
  Typography,
  Button,
  Table,
  Card,
  CardContent,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Pagination,
  InputAdornment,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  CloudUpload,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import '../styles/data_manager.css';

const DataManagerPage = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
      });

      xhr.open('POST', `${import.meta.env.VITE_API_URL}/upload-csv`);
      xhr.send(formData);

      await uploadPromise;
      setSnackbarMessage('File uploaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchUploadedFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      setSnackbarMessage(err.message || 'Something went wrong');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await handleFileUpload(selectedFiles[0]);
    }
    e.target.value = '';
  };

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/uploaded-files`);
      const data = await res.json();
      const filesData = data.files || data.data || data;

      const filesWithStatus = await Promise.all(
        filesData.map(async (file) => {
          const fileId = file.id || file.file_id;
          let qualityStatus = 'error';
          try {
            const summaryRes = await fetch(
              `${import.meta.env.VITE_API_URL}/summary?file_id=${fileId}`
            );
            if (summaryRes.ok) {
              const result = await summaryRes.json();
              const summary = result.summary || {};
              const total = summary.totalElements || 0;
              const within = summary.elementsWithinTolerance || 0;
              if (total > 0 && total === within) {
                qualityStatus = 'success';
              }
            } else {
              throw new Error('Summary fetch failed');
            }
          } catch (err) {
            console.error(`❌ Failed to fetch summary for file ${fileId}:`, err.message);
          }
          return { ...file, qualityStatus };
        })
      );
      setFiles(filesWithStatus);
    } catch (err) {
      console.error('❌ Failed to fetch uploaded files:', err.message);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.user.toLowerCase().includes(query) ||
        file.email.toLowerCase().includes(query) ||
        file.uploadDate.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleDelete = async (id) => {
    setConfirmDialogOpen(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hide-file/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSnackbarMessage('File deleted successfully.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
      } else {
        throw new Error(data.error || 'Failed to delete the file');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setSnackbarMessage(err.message || 'Something went wrong');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(snackbarMessage);
  };

  const handleDownload = (fileId) => {
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL}/download-file/${fileId}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderQualityStatus = (status, filename, fileId) => {
    const statusConfig = {
      success: {
        icon: <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />,
        tooltip: `Quality check passed for ${filename}`,
      },
      warning: {
        icon: <Warning sx={{ color: '#ff9800', fontSize: 20 }} />,
        tooltip: `Quality check has warnings for ${filename}`,
      },
      error: {
        icon: <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />,
        tooltip: `Quality check failed for ${filename}`,
      },
    };
    const config = statusConfig[status] || statusConfig.error;
    return (
      <Tooltip title={config.tooltip} arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/qc-checks', { state: { fileId } })}
        >
          {config.icon}
        </Box>
      </Tooltip>
    );
  };

  const [selectedItem, setSelectedItem] = useState('Data Manager');
  const paginatedFiles = filteredFiles.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  return (
    <Box className="dashboard-container file-upload-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      <Box className="dashboard-content main-content">
        <Box className="header-section">
          <Typography variant="h4" className="page-title">
            Data Manager
          </Typography>
        </Box>

        <Card className="upload-card">
          <CardContent>
            <Box
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <Box className="upload-progress-container">
                  <CircularProgress
                    variant="determinate"
                    value={uploadProgress}
                    size={70}
                    thickness={4}
                    className="upload-progress-circular"
                  />
                  <Typography variant="body1" className="upload-progress-text">
                    Uploading... {uploadProgress}%
                  </Typography>
                </Box>
              ) : (
                <Box className="upload-normal-state">
                  <Button
                    variant="contained"
                    component="label"
                    className="upload-button"
                    startIcon={<CloudUpload />}
                    size="large"
                    disabled={isUploading}
                  >
                    Choose file
                    <input type="file" hidden onChange={handleFileSelect} />
                  </Button>
                  <Typography variant="body2" className="upload-text">
                    or drag file in here
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
        
        {/* Search Bar - Moved and updated */}
        <Box sx={{ my: 2 }}>
          <TextField
            variant="outlined"
            fullWidth
            placeholder="Search by filename, upload date, or username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9e9e9e' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchQuery('')} edge="end" size="small">
                    <ClearIcon sx={{ color: '#9e9e9e' }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '25px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                '&:hover fieldset': {
                  borderColor: '#b0b0b0',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.2)',
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e0e0e0',
              },
            }}
          />
        </Box>

        <Card className="files-table-card">
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table
                className="files-table"
                sx={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}
              >
                <TableHead>
                  <TableRow className="table-header">
                    <TableCell className="table-cell-header">#</TableCell>
                    <TableCell className="table-cell-header">Filename</TableCell>
                    <TableCell className="table-cell-header" align="center">
                      Quality Check
                    </TableCell>
                    <TableCell className="table-cell-header">Type</TableCell>
                    <TableCell className="table-cell-header">User</TableCell>
                    <TableCell className="table-cell-header">Upload Date</TableCell>
                    <TableCell className="table-cell-header">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFiles.map((file, index) => (
                    <TableRow key={file.id} className="table-row">
                      <TableCell className="table-cell">
                        {(page - 1) * ROWS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell className="filename-cell">
                        <Typography variant="body2" className="filename-text">
                          {file.name}
                        </Typography>
                      </TableCell>
                      <TableCell className="table-cell" align="center">
                        {renderQualityStatus(file.qualityStatus, file.name, file.id)}
                      </TableCell>
                      <TableCell className="table-cell">
                        <Chip label={file.type} className="file-type-chip" size="small" />
                      </TableCell>
                      <TableCell className="table-cell">
                        <Box className="user-cell">
                          <Box className="user-info">
                            <Typography variant="body2" className="user-name">
                              {file.user}
                            </Typography>
                            <Typography variant="caption" className="user-email">
                              {file.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell className="table-cell">
                        <Typography variant="body2" className="date-text">
                          {file.uploadDate}
                        </Typography>
                      </TableCell>
                      <TableCell className="table-cell">
                        <Tooltip title="Download">
                          <IconButton onClick={() => handleDownload(file.id)}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => {
                              setFileToDelete(file.id);
                              setConfirmDialogOpen(true);
                            }}
                            className="delete-button"
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {filteredFiles.length > ROWS_PER_PAGE && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Pagination
                  count={Math.ceil(filteredFiles.length / ROWS_PER_PAGE)}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          action={
            <Tooltip title="Copy to clipboard">
              <IconButton
                onClick={handleCopyToClipboard}
                color="inherit"
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to delete this file?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleDelete(fileToDelete)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagerPage;