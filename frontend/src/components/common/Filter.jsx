import React, { useState, useRef } from 'react';
import {
  Button,
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TuneIcon from '@mui/icons-material/Tune'; // <-- New filter icon
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import EventIcon from '@mui/icons-material/Event';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AccessTimeIcon from '@mui/icons-material/AccessTime';


// Date Pickers imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export default function DropdownFilter({ uploadedFiles = [], onApplyFilter }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeFilter, setActiveFilter] = useState(''); // 'Date Range' or 'Choose File'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const buttonRef = useRef();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const clearAllFilters = () => {
    setFilterApplied(false);
    setActiveFilter('');
    setStartDate(null);
    setEndDate(null);
    setFileSearch('');
    setSelectedFile(null);
    onApplyFilter({ type: 'clear' });
    handleClose();
  };

  const handleApplyFilter = () => {
    if (activeFilter === 'Date Range') {
      onApplyFilter({
        type: 'date',
        startDate: startDate ? startDate.toISOString() : '',
        endDate: endDate ? endDate.toISOString() : '',
      });
    } else if (activeFilter === 'Choose File') {
      onApplyFilter({ type: 'file', file: selectedFile });
    }
    setFilterApplied(true);
    handleClose();
  };

  const handleFilterButtonClick = () => {
    if (filterApplied) {
      clearAllFilters();
    } else {
      handleOpen({ currentTarget: buttonRef.current });
    }
  };

  const toggleFilterOption = (option) => {
    setActiveFilter(prev => (prev === option ? '' : option));
  };

  const filteredFiles = uploadedFiles.filter(f => {
    const fileName = (f.filename || f.original_name || f.name || '').toLowerCase();
    return fileName.includes(fileSearch.trim().toLowerCase());
  });

  const getFileName = (file) => file.filename || file.original_name || file.name;
  const getFileId = (file) => file.id || file.file_id;

  const getUploadDate = (file) => {
    if (file.upload_date) {
      return dayjs(file.upload_date).format('DD MMM YYYY');
    }
    return 'Date N/A';
  };

  const isApplyDisabled =
    (activeFilter === 'Date Range' && (!startDate || !endDate)) ||
    (activeFilter === 'Choose File' && !selectedFile) ||
    !activeFilter;

  return (
    <>
      <Button
        ref={buttonRef}
        variant={filterApplied ? 'contained' : 'outlined'}
        // Use startIcon instead of endIcon for better visual balance
        startIcon={filterApplied ? <ClearAllIcon /> : <TuneIcon />}
        onClick={handleFilterButtonClick}
        sx={{
          minWidth: 140,
          borderRadius: theme.shape.borderRadius,
          ...(filterApplied && {
            backgroundColor: 'black',
            color: 'white',
            '&:hover': {
              backgroundColor: '#333',
            },
          }),
          ...(!filterApplied && {
            borderColor: 'black',
            color: 'black',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderColor: 'black',
            },
          }),
        }}
      >
        {filterApplied ? 'Clear' : 'Filter'}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[8],
            mt: 1,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>Filter By</Typography>
        <Divider />
        <List sx={{ p: 1 }}>
          {/* Date Range Filter */}
          <ListItemButton
            selected={activeFilter === 'Date Range'}
            onClick={() => toggleFilterOption('Date Range')}
            sx={{ borderRadius: theme.shape.borderRadius, py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EventIcon color={activeFilter === 'Date Range' ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText primary="Date Range" />
            {activeFilter === 'Date Range' && <CheckIcon color="primary" fontSize="small" />}
          </ListItemButton>
          <Collapse in={activeFilter === 'Date Range'} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                />
              </LocalizationProvider>
            </Box>
          </Collapse>

          {/* Choose File Filter */}
          <ListItemButton
            selected={activeFilter === 'Choose File'}
            onClick={() => toggleFilterOption('Choose File')}
            sx={{ borderRadius: theme.shape.borderRadius, py: 1.5, mt: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <InsertDriveFileIcon color={activeFilter === 'Choose File' ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText primary="Choose File" />
            {activeFilter === 'Choose File' && <CheckIcon color="primary" fontSize="small" />}
          </ListItemButton>
          <Collapse in={activeFilter === 'Choose File'} timeout="auto" unmountOnExit>
            <Box sx={{ px: 2, pt: 1, pb: 2 }}>
              <TextField
                placeholder="Search file name"
                variant="outlined"
                fullWidth
                size="small"
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                <List disablePadding>
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map(f => (
                      <ListItemButton
                        key={getFileId(f)}
                        selected={selectedFile && getFileId(selectedFile) === getFileId(f)}
                        onClick={() => setSelectedFile(f)}
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          borderRadius: theme.shape.borderRadius,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                           <ListItemText
                              primary={getFileName(f)}
                              primaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                           />
                           {selectedFile && getFileId(selectedFile) === getFileId(f) && (
                              <CheckIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                           )}
                        </Box>
                        {f.upload_date && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <AccessTimeIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                            {getUploadDate(f)}
                          </Typography>
                        )}
                      </ListItemButton>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', p: 2 }}>
                      No files found.
                    </Typography>
                  )}
                </List>
              </Box>
            </Box>
          </Collapse>
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleApplyFilter}
            disabled={isApplyDisabled}
            sx={{
              backgroundColor: 'black',
              color: 'white',
              '&:hover': { backgroundColor: '#333' },
              '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
            }}
          >
            Apply Filter
          </Button>
        </Box>
      </Popover>
    </>
  );
}