import { ensureCsrf, apiFetch } from '../csrfClient';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
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

function filenameFrom(res, fallback) {
  const cd = res.headers.get('Content-Disposition') || '';
  // matches: filename="foo.zip"  OR filename*=UTF-8''foo.zip
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  try { return m ? decodeURIComponent(m[1]) : fallback; } catch { return fallback; }
}




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
  const [filterType, setFilterType] = useState('all'); // TWEAKED: Default state for filter category
  const [selectedValue, setSelectedValue] = useState(''); // ADDED: State for the second dropdown's value
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState('Data Manager');

  // State for the new upload flow (CSV + PDF)
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  // State for the new re-upload dialog
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [fileIdToReplace, setFileIdToReplace] = useState(null);
  const [csvToReplace, setCsvToReplace] = useState(null);
  const [pdfToReplace, setPdfToReplace] = useState(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [fetchedParents, setFetchedParents] = useState(new Set());
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [orgList, setOrgList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');


  const storedUser = sessionStorage.getItem('user');
  let isAdmin = false;

  try {
  const userObj = storedUser ? JSON.parse(storedUser).user : null;
  isAdmin =
    !!userObj &&
    (userObj.is_admin === true ||
     userObj.is_admin === 1 ||
     userObj.role?.toLowerCase() === 'admin' ||
     userObj.email?.toLowerCase().includes('admin@'));
} catch (e) {
  console.warn('Invalid user object in sessionStorage:', e);
}


  // Utility to invalidate cached attachment fetch for a parent
  const invalidateAttachmentCache = (pid) => {
    setFetchedParents(prev => {
      const next = new Set(prev);
      next.delete(pid);
      return next;
    });
  };

  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();
  const location = useLocation();

  // --- DATA FETCHING & PROCESSING ---
  const fetchUploadedFiles = async () => {
    const userData = JSON.parse(sessionStorage.getItem('user')).user;
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/uploaded-files`, {
        credentials: 'include', // <-- IMPORTANT: This sends the session cookie
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = res.data;
      const filesData = data.files || data.data || data;

      const filesWithStatus = await Promise.all(
        filesData.map(async (file) => {
          const fileId = file.id || file.file_id;
          let qualityStatus = 'error';
          let failedElements = [];
          try {
            const summaryRes = await apiFetch(
              `${import.meta.env.VITE_API_URL}/summary?file_id=${fileId}`,
              {
                credentials: 'include', 
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
              }
            );
            if (summaryRes.ok) {
              const result = summaryRes.data;
              const summary = result.summary || {};
              const total = summary.totalElements || 0;
              const within = summary.elementsWithinTolerance || 0;
              if (total > 0 && total === within) {
                qualityStatus = 'success';
              }
              failedElements = summary.failedElements || [];
            } else {
            }
          } catch (err) {
            console.error(`Failed to fetch summary for file ${fileId}:`, err.message);
          }
          return { ...file, qualityStatus, failedElements };
        })
      );
      setFiles(filesWithStatus);
    } catch (err) {
      console.error('Failed to fetch uploaded files:', err.message);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);
  useEffect(() => {
    if (isAdmin) {
      apiFetch(`${import.meta.env.VITE_API_URL}/organizations`, { method: 'GET' })
        .then((res) => {
          if (res.ok) setOrgList(res.data || []);
        })
        .catch((err) => console.error('Failed to fetch organizations:', err));
    }
  }, [isAdmin]);


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
    const csv = Array.from(fileList).find((f) => f.name.toLowerCase().endsWith('.csv'));
    const pdf = Array.from(fileList).find((f) => f.name.toLowerCase().endsWith('.pdf'));

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

  

  // --- FILE ACTIONS (DELETE, DOWNLOAD, REPLACE) ---
  const handleFileUpload = async (csv, pdf, isReplacement = false) => {
    if (!csv || !pdf) {
      setSnackbarMessage('Both a CSV and a PDF file are required.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // Always resolve an explicit season value for backend
    const effectiveSeason = selectedSeason?.trim() || 'pre_basalt';

    const userData = JSON.parse(sessionStorage.getItem('user'))?.user;

    const formData = new FormData();
    formData.append('csvfile', csv);
    formData.append('pdffile', pdf);
    formData.append('season', effectiveSeason);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const token = await ensureCsrf();

      // Find the org name based on selected ID
      const selectedOrg = orgList.find(org => org.id === targetOrgId);
      const orgName = selectedOrg?.name?.trim() || '';

      const uploadUrl = `${import.meta.env.VITE_API_URL}/upload-files`;

      // Add orgName to the form data (so backend receives it as part of POST body)
      if (isAdmin && orgName) {
        formData.append('orgName', orgName);
      }


      console.log(`Uploading to: ${uploadUrl} (season=${effectiveSeason})`);

      const res = await fetch(uploadUrl, {
        headers: { 'X-CSRF-Token': token },
        credentials: 'include',
        method: 'POST',
        body: formData,
      });

      //  Handle backend-supplied messages properly
      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        const errMsg =
          data?.error ||
          data?.message ||
          `Upload failed with status ${res.status}`;
        throw new Error(errMsg);
      }

      const result = await res.json().catch(() => ({}));
      const msg =
        result?.message ||
        `File${isReplacement ? ' replaced' : 's uploaded'} successfully`;

      setSnackbarMessage(msg);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      await fetchUploadedFiles();

      //  Reset UI state
      setCsvFile(null);
      setPdfFile(null);
      setTargetOrgId('');
      setSelectedSeason('');
    } catch (err) {
      console.error('Error uploading files:', err);
      const displayMsg =
        err?.message || 'Something went wrong during upload.';
      setSnackbarMessage(displayMsg);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  
 
 
  const handleDelete = async (id) => {
  if (!id) return;
  setConfirmDialogOpen(false);

  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/hide-file/${id}`, {
      method: 'POST',
    });

    if (res.ok && res.data?.success) {
      setSnackbarMessage('File deleted successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setFiles(prev => prev.filter(file => file.id !== id));
      return;
    }

    // handle known auth cases
    if (res.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    if (res.status === 403) {
      throw new Error('You don’t have permission to delete this file.');
    }

    throw new Error(res.data?.error || 'Failed to delete the file');
  } catch (err) {
    console.error('Error deleting file:', err);
    setSnackbarMessage(err.message || 'Something went wrong');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
    throw err; // keep this if callers rely on catching it (e.g., replace flow)
  }
};


const handleDownload = async (fileId) => {
  setDownloadingId(fileId);
  try {
    const token = await ensureCsrf();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/download-file/${fileId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': token,
        'Accept': 'application/zip'
      }
    });

    if (res.status === 401) {
      setSnackbarMessage('Session expired. Please log in again.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    if (res.status === 403) {
      setSnackbarMessage('You don’t have access to this file.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    if (!res.ok) {
      setSnackbarMessage(`Download failed (${res.status}).`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFrom(res, `bundle_${fileId}.zip`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download error:', err);
    setSnackbarMessage('Download failed.');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  } finally {
    setDownloadingId(null);
  }
};

 
const handleDownloadPdf = async (fileId) => {
  setDownloadingId(fileId);
  try {
    const token = await ensureCsrf();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/download-pdf/${fileId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': token,
        'Accept': 'application/pdf'
      }
    });

    if (res.status === 401) {
      setSnackbarMessage('Session expired. Please log in again.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    if (res.status === 403) {
      setSnackbarMessage('You don’t have access to this PDF.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    if (!res.ok) {
      setSnackbarMessage(`PDF download failed (${res.status}).`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFrom(res, `report_${fileId}.pdf`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF download error:', err);
    setSnackbarMessage('PDF download failed.');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  } finally {
    setDownloadingId(null);
  }
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
  
  // --- ATTACHMENT HANDLING ---
  const fetchAttachments = async () => {
    if (!currentParentId) return;
    setLoadingAttachments(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/attachments/${currentParentId}`, {
        method: 'GET',
      });
      if (res.ok) {
        setAttachments(res.data || []);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error('Attachment fetch error:', err);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (showAttachModal && currentParentId && !fetchedParents.has(currentParentId)) {
      console.log(`[AttachmentModal] Fetching for parent ID ${currentParentId}`);
      fetchAttachments();
      setFetchedParents(prev => new Set([...prev, currentParentId]));
    }
  }, [showAttachModal, currentParentId]);

  const handleAttachmentUpload = async (file) => {
    if (!file || !currentParentId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL}/upload-files/attachment/${currentParentId}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (res.ok) {
        setSnackbarMessage('Attachment uploaded successfully.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        invalidateAttachmentCache(currentParentId);
        fetchAttachments();
      } else {
        throw new Error(`Upload failed: ${res.status}`);
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
      setSnackbarMessage(err.message || 'Attachment upload failed.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };




  const handleAttachmentDelete = async (id) => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/hide-file/${id}`, {
        method: 'POST',
      });
      if (res.ok) {
        setSnackbarMessage('Attachment deleted.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        fetchAttachments();
      } else {
        throw new Error('Failed to delete attachment.');
      }
    } catch (err) {
      console.error('Attachment delete failed:', err);
      setSnackbarMessage(err.message || 'Attachment delete failed.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  const handleDeleteBundle = async (fileId) => {
    if (!isAdmin || !fileId) return;
    if (!window.confirm('Are you sure you want to delete this entire bundle (CSV, PDF, and attachments)?')) return;

    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/delete-bundle/${fileId}`, {
        method: 'POST',
      });

      if (res.ok && res.data?.success) {
        setSnackbarMessage('Bundle deleted successfully (CSV, PDF, and attachments).');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        fetchUploadedFiles();
        return;
      }

      throw new Error(res.data?.error || 'Failed to delete bundle');
    } catch (err) {
      console.error('Error deleting bundle:', err);
      setSnackbarMessage(err.message || 'Something went wrong while deleting the bundle.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // --- MEMOIZED FILTERING & DERIVED STATE ---

  // TWEAKED: Memoized hook to generate unique options for the second dropdown
  const filterOptions = useMemo(() => {
    if (filterType === 'all' || !files.length) return [];
    
    const valueMap = {
      name: file => file.name,
      user: file => file.user,
      uploadDate: file => file.uploadDate,
      organization: file => file.user, // ADDED: Based on table logic, 'Organization' is file.user
      season: file => file.season,       // ADDED
    };

    const keyAccessor = valueMap[filterType];
    if (!keyAccessor) return [];

    const uniqueValues = new Set(files.map(keyAccessor));

    // MODIFIED to handle seasons cleanly
    if (filterType === 'season') {
      const seasonOptions = [];
      if (uniqueValues.has('pre_basalt')) seasonOptions.push({ value: 'pre_basalt', label: 'Pre Basalt' });
      if (uniqueValues.has('post_basalt')) seasonOptions.push({ value: 'post_basalt', label: 'Post Basalt' });
      
      // Check if any other values exist that aren't pre/post basalt
      const otherValuesExist = [...uniqueValues].some(v => v !== 'pre_basalt' && v !== 'post_basalt');
      if (otherValuesExist) {
         // This assumes any other value should be grouped as "Unspecified"
         // This matches the table chip's logic
         seasonOptions.push({ value: 'Unspecified', label: 'Unspecified' }); 
      }
      return seasonOptions;
    }
    
    // MODIFIED to return {value, label} for consistency
    // For other filter types, value and label are the same
    return [...uniqueValues].sort().map(val => (val ? { value: val, label: val } : { value: 'Unspecified', label: 'Unspecified' })).filter((v,i,a)=>a.findIndex(t=>(t.value === v.value))===i); // ensure unique values

  }, [files, filterType]);

  // TWEAKED: Main filtering logic to handle the new two-step filter and search interaction
  const filteredFiles = useMemo(() => {
    let tempFiles = [...files];

    // 1. Apply dropdown filter if a specific value is selected
    if (filterType !== 'all' && selectedValue) {
      tempFiles = tempFiles.filter(file => {
        if (filterType === 'name') return file.name === selectedValue;
        if (filterType === 'user') return file.user === selectedValue;
        if (filterType === 'uploadDate') return file.uploadDate === selectedValue;
        if (filterType === 'organization') { // ADDED
          if (selectedValue === 'Unspecified') {
            return !file.user;
          }
          return file.user === selectedValue;
        }
        if (filterType === 'season') { // ADDED
           if (selectedValue === 'Unspecified') {
             // Match anything that isn't pre or post basalt
             return file.season !== 'pre_basalt' && file.season !== 'post_basalt';
           }
           return file.season === selectedValue;
        }
        return true;
      });
    }

    // 2. Apply search query on the result of the dropdown filter (or on all files)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // ADDED: Helper function for season search
      const getSeasonLabel = (season) => {
        if (season === "pre_basalt") return "pre basalt";
        if (season === "post_basalt") return "post basalt";
        return "unspecified";
      };
      
      // If no filter is applied, search works across all fields
      if (filterType === 'all' || !selectedValue) {
        return tempFiles.filter(
          (file) =>
            (file.name && file.name.toLowerCase().includes(query)) ||
            (file.user && file.user.toLowerCase().includes(query)) || // This covers both user and organization
            (file.email && file.email.toLowerCase().includes(query)) ||
            (file.uploadDate && file.uploadDate.toLowerCase().includes(query)) ||
            getSeasonLabel(file.season).includes(query) // ADDED: Search by season label
        );
      } else {
      // If a filter IS applied, search within the already filtered results
        return tempFiles.filter(
          (file) =>
            (file.name && file.name.toLowerCase().includes(query)) ||
            (file.user && file.user.toLowerCase().includes(query)) || // This covers both user and organization
            (file.email && file.email.toLowerCase().includes(query)) ||
            (file.uploadDate && file.uploadDate.toLowerCase().includes(query)) ||
            getSeasonLabel(file.season).includes(query) // ADDED: Search by season label
        );
      }
    }

    return tempFiles;
  }, [files, searchQuery, filterType, selectedValue]);


  const paginatedFiles = filteredFiles.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // --- EFFECTS ---
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType, selectedValue]); // TWEAKED: Reset page when selectedValue changes

  // ADDED: Reset second dropdown when filter category changes
  useEffect(() => {
    setSelectedValue('');
  }, [filterType]);

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

  return (
    <Box className="dashboard-container file-upload-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      <Box className="dashboard-content main-content">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" className="page-title">
            Data Manager
          </Typography>
        </Box>
        
        {isAdmin && (

          <Card className="upload-card">
            
            <CardContent className='upload-place'>
              <Box>
              {/* --- Admin override selectors --- */}
                    {isAdmin && (
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'left', px: '10px' }}>
                        <TextField
                          select

                          value={targetOrgId}
                          onChange={(e) => setTargetOrgId(e.target.value)}
                          SelectProps={{ native: true }}
                          sx={{ width: '250px' }}
                        >
                          <option value="">-- Choose Organization --</option>
                          {orgList.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </TextField>
                      </Box>
                    )}
                    {/* --- Season selecting dropdown --- */}
                    {isAdmin && (
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'left', px: '10px', position: 'relative'}}>
                        <TextField
                          select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(e.target.value)}
                          SelectProps={{ native: true }}
                          sx={{ width: '250px' }}
                        >
                          <option value="">-- Choose Season --</option>
                          <option value="pre_basalt">Pre Basalt</option>
                          <option value="post_basalt">Post Basalt</option>
                        </TextField>
                      </Box>
                    )}
                    </Box>
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
                     
                    <Box className="upload-section">
                    <Button
                      variant="contained"
                      component="label"
                      className="upload-button"
                      startIcon={<CloudUpload />}
                      size="large"
                      disabled={isUploading}
                    >
                      Choose CSV & PDF
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={handleFileSelect}
                        accept=".csv,.pdf"
                      />
                    </Button>
                    <Typography variant="body2" className="upload-text">
                      or drag files in here
                    </Typography>
                    {(csvFile || pdfFile) && (
                      <Box
                        sx={{
                          mt: 2,
                          display: 'flex',
                          gap: 2,
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexDirection: 'column'
                        }}
                      >
                        {csvFile && (
                          <Chip
                            icon={<InsertDriveFile />}
                            label={csvFile.name}
                            onDelete={() => setCsvFile(null)}
                          />
                        )}
                        {pdfFile && (
                          <Chip
                            icon={<InsertDriveFile />}
                            label={pdfFile.name}
                            onDelete={() => setPdfFile(null)}
                          />
                        )}
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
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}


        {/* --- TWEAKED: SEARCH BAR & DYNAMIC FILTERS --- */}
        <Box sx={{ my: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* First Dropdown: Filter Category */}
          <TextField
            select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            variant="outlined"
            SelectProps={{ native: true }}
            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '25px' } }}
          >
            <option value="all">Filter by...</option>
            <option value="name">Filename</option>
            <option value="organization">Organization</option> {/* ADDED */}
            <option value="season">Season</option> {/* ADDED */}
            <option value="uploadDate">Upload Date</option>
          </TextField>

          {/* Second Dropdown: Specific Value (Conditional) */}
          {filterType !== 'all' && (
            <TextField
              select
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              variant="outlined"
              SelectProps={{ native: true }}
              sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '25px' } }}
              disabled={!filterOptions.length}
            >
              {/* MODIFIED to include new types */}
              <option value="">{`-- Select ${
                  filterType === 'uploadDate' ? 'Date' : 
                  filterType === 'season' ? 'Season' : 
                  filterType === 'organization' ? 'Organization' : 
                  filterType.charAt(0).toUpperCase() + filterType.slice(1)
                } --`}</option>
              {/* MODIFIED to use {value, label} objects */}
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </TextField>
          )}

          {/* Search Bar */}
          <TextField
            variant="outlined"
            fullWidth
            placeholder="Search by File Name, Organization, Season or Upload Date" // MODIFIED
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e' }} /></InputAdornment>),
              endAdornment: searchQuery && (<InputAdornment position="end"><IconButton onClick={() => setSearchQuery('')} edge="end" size="small"><ClearIcon sx={{ color: '#9e9e9e' }} /></IconButton></InputAdornment>),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '25px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                '&:hover fieldset': { borderColor: '#b0b0b0' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2', boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.2)' },
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
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
                    <TableCell className="table-cell-header">Season</TableCell>
                    <TableCell className="table-cell-header">Organization</TableCell>
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
                              onClick={() =>
                                setExpandedFileId(expandedFileId === file.id ? null : file.id)
                              }
                              size="small"
                            >
                              {expandedFileId === file.id ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          )}
                          <Typography
                            variant="body2"
                            className="filename-text"
                            sx={{ display: 'inline', ml: 1 }}
                          >
                            {file.name}
                          </Typography>
                        </TableCell>
                        <TableCell className="table-cell" align="center">
                          {renderQualityStatus(file.qualityStatus, file.name, file.id)}
                        </TableCell>
                        <TableCell className="table-cell">
                          <Chip
                            label={
                              file.seasonLabel ||
                              (file.season === "pre_basalt"
                                ? "Pre Basalt"
                                : file.season === "post_basalt"
                                ? "Post Basalt"
                                : "Unspecified")
                            }
                            color={file.season === "post_basalt" ? "primary" : "default"}
                            size="small"
                          />
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
                            <IconButton onClick={() => handleDownload(file.id)}
                            disabled={downloadingId === file.id}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Manage Attachments">
                            <IconButton
                              onClick={() => {
                                setCurrentParentId(file.id);
                                setShowAttachModal(true);
                              }}
                              size="small"
                            >
                              <CloudUpload />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip title="Delete Entire Bundle (CSV, PDF, and Attachments)">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteBundle(file.id)}
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          )}

                        </TableCell>
                      </TableRow>

                      {/* Collapsible row showing failed elements */}
                      {expandedFileId === file.id && (
                        <TableRow className="failed-elements-row">
                          <TableCell colSpan={7}>
                            <Box
                              sx={{
                                pl: 13,
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>
                                Failed Elements:
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: 0.5,
                                }}
                              >
                                {file.failedElements.map((elem, idx) => (
                                  <Typography key={idx} variant="body2" sx={{ color: 'red' }}>
                                    {elem}
                                    {idx !== file.failedElements.length - 1 ? ', ' : ''}
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
          // action={
          //   <Tooltip title="Copy to clipboard">
          //     <IconButton onClick={handleCopyToClipboard} color="inherit" size="small">
          //       <ContentCopyIcon fontSize="small" />
          //     </IconButton>
          //   </Tooltip>
          // }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to delete this file?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDelete(fileToDelete)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEW: Dialog for Re-uploading Files */}
      <Dialog open={replaceDialogOpen} onClose={handleCloseReplaceDialog}>
        <DialogTitle>Replace File</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please select the new CSV and PDF files to replace the old ones.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" component="label">
              {csvToReplace ? csvToReplace.name : 'Select New CSV'}
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={(e) => setCsvToReplace(e.target.files[0])}
              />
            </Button>
            <Button variant="outlined" component="label">
              {pdfToReplace ? pdfToReplace.name : 'Select New PDF'}
              <input
                type="file"
                hidden
                accept=".pdf"
                onChange={(e) => setPdfToReplace(e.target.files[0])}
              />
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
      {/* --- ATTACHMENT MANAGER MODAL --- */}
      <Dialog
        open={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Manage Attachments</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: '10px',
              p: 3,
              textAlign: 'center',
              mb: 3,
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              position: 'relative',
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleAttachmentUpload(file);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            Drag & drop files here or click below to browse
            <input
              type="file"
              style={{
                position: 'absolute',
                opacity: 0,
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
              }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleAttachmentUpload(file);
              }}
            />
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Filename</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingAttachments ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 2,
                      }}
                    >
                      <CircularProgress size={28} sx={{ mb: 1 }} />
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        Loading attachments...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : attachments.length > 0 ? (
                attachments.map((att, idx) => (
                  <TableRow key={att.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{att.filename}</TableCell>
                    <TableCell>
                      {/* Download */}
                      <Tooltip title="Download">
                        <IconButton
                          onClick={async () => {
                            try {
                              const res = await apiFetch(
                                `${import.meta.env.VITE_API_URL}/attachments/download/${att.id}`,
                                {
                                  method: "GET",
                                  responseType: "blob",
                                }
                              );
                              if (!res.ok) throw new Error("Download failed");

                              const blob = new Blob([res.data]);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = att.filename || `attachment_${att.id}`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error("Attachment download failed:", err);
                              setSnackbarMessage("Attachment download failed.");
                              setSnackbarSeverity("error");
                              setSnackbarOpen(true);
                            }
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>

                      {/* Delete */}
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleAttachmentDelete(att.id)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No attachments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAttachModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagerPage;

