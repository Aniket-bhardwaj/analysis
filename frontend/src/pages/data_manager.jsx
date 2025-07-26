import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
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
  InsertDriveFile,
} from '@mui/icons-material';

import '../styles/data_manager.css';

const DataManagerPage = () => {
  // --- STATE MANAGEMENT ---
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
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);

  // State for the new upload flow (CSV + PDF)
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  // State for the new re-upload dialog
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [fileIdToReplace, setFileIdToReplace] = useState(null);
  const [csvToReplace, setCsvToReplace] = useState(null);
  const [pdfToReplace, setPdfToReplace] = useState(null);
  
  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();
  const location = useLocation();

  // --- DATA FETCHING & PROCESSING ---
  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/uploaded-files`);
      const data = await res.json();
      const filesData = data.files || data.data || data;

      const filesWithStatus = await Promise.all(
        filesData.map(async (file) => {
          const fileId = file.id || file.file_id;
          let qualityStatus = 'error';
          let failedElements = [];
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
              failedElements = summary.failedElements || [];
            } else {
               // Silently fail if summary isn't available, default to error status
            }
          } catch (err) {
            console.error(`❌ Failed to fetch summary for file ${fileId}:`, err.message);
          }
          return { ...file, qualityStatus, failedElements };
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

  // --- UPLOAD LOGIC (NEW: CSV + PDF) ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = (fileList) => {
    const csv = Array.from(fileList).find(f => f.name.toLowerCase().endsWith('.csv'));
    const pdf = Array.from(fileList).find(f => f.name.toLowerCase().endsWith('.pdf'));

    if (csv) setCsvFile(csv);
    if (pdf) setPdfFile(pdf);

    if (fileList.length > 2 || (fileList.length > 0 && !csv && !pdf)) {
        setSnackbarMessage('Please select one CSV and one PDF file.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    } else if (fileList.length === 2 && (!csv || !pdf)) {
        setSnackbarMessage('Invalid file combination. Please provide one CSV and one PDF.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
        processFiles(selectedFiles);
    }
    e.target.value = ''; // Reset input to allow re-selecting the same files
  };

  const handleFileUpload = async (csv, pdf, isReplacement = false) => {
    if (!csv || !pdf) {
      setSnackbarMessage('Both a CSV and a PDF file are required.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append('csvfile', csv);
    formData.append('pdffile', pdf);

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
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Upload failed'));
            }
          } catch (e) {
             reject(new Error('Invalid server response.'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
      });

      xhr.open('POST', `${import.meta.env.VITE_API_URL}/upload-files`);
      xhr.send(formData);

      await uploadPromise;
      setSnackbarMessage(`File${isReplacement ? ' replaced' : 's uploaded'} successfully`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchUploadedFiles();
      
      // Clear selected files after successful upload
      setCsvFile(null);
      setPdfFile(null);

    } catch (err) {
      console.error('Error uploading files:', err);
      setSnackbarMessage(err.message || 'Something went wrong during upload.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  // --- FILE ACTIONS (DELETE, DOWNLOAD, REPLACE) ---
  const handleDelete = async (id) => {
    // This function will be called by both the delete button and the replace logic
    if (!id) return;
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
      throw err; // Re-throw to be caught by replacement logic if needed
    }
  };

  const handleDownload = (fileId) => {
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL}/download-file/${fileId}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenReplaceDialog = (fileId) => {
      setFileIdToReplace(fileId);
      setReplaceDialogOpen(true);
  };

  const handleCloseReplaceDialog = () => {
      setReplaceDialogOpen(false);
      setFileIdToReplace(null);
      setCsvToReplace(null);
      setPdfToReplace(null);
  };

  const handleFileReplaceUpload = async () => {
    if (csvToReplace && pdfToReplace && fileIdToReplace) {
        try {
            // 1. Delete the old file entry
            await handleDelete(fileIdToReplace);
            // 2. Upload the new files
            await handleFileUpload(csvToReplace, pdfToReplace, true);
        } catch (err) {
            console.error('Re-upload process failed:', err);
            // Snackbar message is likely already set by handleDelete or handleFileUpload
        } finally {
            // 3. Close dialog and reset state regardless of outcome
            handleCloseReplaceDialog();
        }
    } else {
        setSnackbarMessage('Please select both a new CSV and a new PDF file.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    }
  };

  // --- MEMOIZED FILTERING & DERIVED STATE ---
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    // Using the original, correct file properties for filtering
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.user.toLowerCase().includes(query) ||
        file.email.toLowerCase().includes(query) ||
        file.uploadDate.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  const paginatedFiles = filteredFiles.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  // --- EFFECTS ---
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const selectedFileIdFromRoute = searchParams.get('fileId');
    if (selectedFileIdFromRoute && files.length > 0) {
      const id = Number(selectedFileIdFromRoute);
      const exists = files.some((file) => file.id === id);
      if (exists) setSelectedFileId(id);
    }
  }, [location.search, files]);


  // --- RENDER LOGIC ---
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(snackbarMessage);
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

  return (
    <Box className="dashboard-container file-upload-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      <Box className="dashboard-content main-content">
        <Box className="header-section">
          <Typography variant="h4" className="page-title">
            Data Manager
          </Typography>
        </Box>

        {/* --- UPLOAD CARD (NEW UI) --- */}
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
                    Choose CSV & PDF
                    <input type="file" hidden multiple onChange={handleFileSelect} accept=".csv,.pdf"/>
                  </Button>
                  <Typography variant="body2" className="upload-text">
                    or drag files in here
                  </Typography>
                  {(csvFile || pdfFile) && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                          {csvFile && <Chip icon={<InsertDriveFile />} label={csvFile.name} onDelete={() => setCsvFile(null)} />}
                          {pdfFile && <Chip icon={<InsertDriveFile />} label={pdfFile.name} onDelete={() => setPdfFile(null)} />}
                      </Box>
                  )}
                  <Button
                      variant="contained"
                      color="primary"
                      sx={{ mt: 2 }}
                      disabled={!csvFile || !pdfFile || isUploading}
                      onClick={() => handleFileUpload(csvFile, pdfFile)}
                  >
                      Upload
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
        
        {/* --- SEARCH BAR --- */}
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

        {/* --- FILES TABLE (ORIGINAL STRUCTURE) --- */}
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
                  <React.Fragment key={file.id}>
                    <TableRow
                      className={`table-row ${file.id === selectedFileId ? 'highlighted-row' : ''}`}
                    >
                      <TableCell className="table-cell">
                        {(page - 1) * ROWS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell className="filename-cell">
                        {Array.isArray(file.failedElements) && file.failedElements.length > 0 && (
                          <IconButton
                            onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                            size="small"
                          >
                            {expandedFileId === file.id ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        )}
                        <Typography variant="body2" className="filename-text" sx={{ display: 'inline', ml: 1 }}>
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

                    {/* Collapsible row showing failed elements */}
                    {expandedFileId === file.id && (
                      <TableRow className="failed-elements-row">
                        <TableCell colSpan={7}>
                          <Box sx={{ pl: 13, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>
                              Failed Elements:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                              {file.failedElements.map((elem, idx) => (
                                <Typography key={idx} variant="body2" sx={{ color: 'red' }}>
                                  {elem}{idx !== file.failedElements.length - 1 ? ', ' : ''}
                                </Typography>
                              ))}
                              {/* NEW: Re-upload button opens a dialog */}
                              <Tooltip title="Re-upload file">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenReplaceDialog(file.id)}
                                >
                                  <CloudUpload fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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

      {/* --- NOTIFICATIONS & DIALOGS --- */}
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
      
      {/* NEW: Dialog for Re-uploading Files */}
      <Dialog open={replaceDialogOpen} onClose={handleCloseReplaceDialog}>
        <DialogTitle>Replace File</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{mb: 2}}>Please select the new CSV and PDF files to replace the old ones.</Typography>
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                <Button variant="outlined" component="label">
                    {csvToReplace ? csvToReplace.name : 'Select New CSV'}
                    <input type="file" hidden accept=".csv" onChange={(e) => setCsvToReplace(e.target.files[0])} />
                </Button>
                <Button variant="outlined" component="label">
                    {pdfToReplace ? pdfToReplace.name : 'Select New PDF'}
                    <input type="file" hidden accept=".pdf" onChange={(e) => setPdfToReplace(e.target.files[0])} />
                </Button>
            </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReplaceDialog}>Cancel</Button>
          <Button
            onClick={handleFileReplaceUpload}
            color="primary"
            variant="contained"
            disabled={!csvToReplace || !pdfToReplace}
          >
            Upload Replacement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagerPage;