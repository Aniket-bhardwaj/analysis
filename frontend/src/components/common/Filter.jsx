import React, { useState } from 'react';
import {
  Drawer,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight'; // This icon naturally points right
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import EventIcon from '@mui/icons-material/Event';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Date Pickers imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export default function NestedFilterDrawer({ uploadedFiles = [], onApplyFilter }) {
  const theme = useTheme();
  const [mainOpen, setMainOpen] = useState(false);
  const [optionOpen, setOptionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const handleMainClick = () => {
    if (filterApplied) {
      clearAllFilters();
    } else {
      setOptionOpen(false); // Close nested drawer when opening main one
      setMainOpen(open => !open);
    }
  };

  const clearAllFilters = () => {
    setFilterApplied(false);
    setSelectedOption('');
    setStartDate(null);
    setEndDate(null);
    setFileSearch('');
    setSelectedFile(null);
    setOptionOpen(false);
    setMainOpen(false);
    onApplyFilter({ type: 'clear' });
  };

  const applyFilter = () => {
    if (selectedOption === 'Date Range') {
      onApplyFilter({
        type: 'date',
        startDate: startDate ? startDate.toISOString() : '',
        endDate: endDate ? endDate.toISOString() : '',
      });
    } else if (selectedOption === 'Choose File') {
      onApplyFilter({ type: 'file', file: selectedFile });
    }
    setFilterApplied(true);
    setOptionOpen(false);
    setMainOpen(false);
  };

  const openOption = (option) => {
    if (!mainOpen) {
      setMainOpen(true);
      setTimeout(() => {
        setSelectedOption(option);
        setOptionOpen(true);
      }, theme.transitions.duration.enteringScreen);
    } else {
      if (selectedOption === option) {
        setOptionOpen(open => !open);
      } else {
        setSelectedOption(option);
        setOptionOpen(true);
      }
    }
  };

  const closeOption = () => {
    setOptionOpen(false);
  };

  const filteredFiles = uploadedFiles.filter(f => {
    const fileName = (f.filename || f.original_name || f.name || '').toLowerCase();
    return fileName.includes(fileSearch.trim().toLowerCase());
  });

  const getFileName = (file) => file.filename || file.original_name || file.name;

  const getUploadDate = (file) => {
    if (file.upload_date) {
      return dayjs(file.upload_date).format('DD MMMYYYY');
    }
    return 'Date N/A';
  };

  return (
    <>
      <Button
        variant={filterApplied ? 'contained' : 'outlined'}
        endIcon={filterApplied ? <ClearAllIcon /> : <FilterListIcon />}
        onClick={handleMainClick}
        sx={{
          minWidth: 100,
          borderRadius: theme.shape.borderRadius,
          ...(filterApplied && {
            backgroundColor: 'black',
            color: 'white',
            '&:hover': {
              backgroundColor: '#333',
              boxShadow: theme.shadows[4],
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
        {filterApplied ? 'Clear Filter' : 'Filter'}
      </Button>

      {/* Main Filter Drawer */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={mainOpen}
        PaperProps={{
          sx: {
            width: 280,
            position: 'fixed',
            right: 0,
            zIndex: theme.zIndex.drawer,
            boxShadow: theme.shadows[8],
            backgroundColor: theme.palette.background.paper,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            borderLeft: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <Box sx={{
          p: 2,
          pr: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Filter Options</Typography>
          <IconButton onClick={() => {
            setMainOpen(false);
            setOptionOpen(false);
          }} size="small" sx={{ color: theme.palette.text.secondary }}>
            {/* REMOVED transform: 'rotate(180deg)' */}
            <ChevronRightIcon /> {/* Points right to close (slide right) */}
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ pt: 1, flexGrow: 1, overflowY: 'auto' }}>
          <ListItemButton
            selected={selectedOption === 'Date Range'}
            onClick={() => openOption('Date Range')}
            sx={{
              py: 1.5,
              borderRadius: theme.shape.borderRadius,
              mx: 1,
              my: 0.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
                color: theme.palette.primary.main,
                fontWeight: 'medium',
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.main,
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EventIcon color={selectedOption === 'Date Range' ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText
              primary="Date Range"
              primaryTypographyProps={{
                fontWeight: selectedOption === 'Date Range' ? 'medium' : 'regular'
              }}
            />
            {selectedOption === 'Date Range' && <CheckIcon color="primary" fontSize="small" />}
          </ListItemButton>

          <ListItemButton
            selected={selectedOption === 'Choose File'}
            onClick={() => openOption('Choose File')}
            sx={{
              py: 1.5,
              borderRadius: theme.shape.borderRadius,
              mx: 1,
              my: 0.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
                color: theme.palette.primary.main,
                fontWeight: 'medium',
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.main,
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <InsertDriveFileIcon color={selectedOption === 'Choose File' ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText
              primary="Choose File"
              primaryTypographyProps={{
                fontWeight: selectedOption === 'Choose File' ? 'medium' : 'regular'
              }}
            />
            {selectedOption === 'Choose File' && <CheckIcon color="primary" fontSize="small" />}
          </ListItemButton>
        </List>
      </Drawer>

      {/* Option-Specific Drawer */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={optionOpen}
        PaperProps={{
          sx: {
            width: 320,
            position: 'fixed',
            right: mainOpen ? 280 : 0,
            zIndex: theme.zIndex.drawer + 1,
            boxShadow: theme.shadows[12],
            backgroundColor: theme.palette.background.paper,
            transition: theme.transitions.create('right', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            borderLeft: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <Box sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <Box display="flex" alignItems="center" mb={1}>
            <IconButton onClick={closeOption} size="small" sx={{ color: theme.palette.text.secondary }}>
              {/* REMOVED transform: 'rotate(180deg)' */}
              <ChevronRightIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: theme.palette.text.primary }}>{selectedOption}</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, px: 2, overflowY: 'auto', pb: 2, pt: 2 }}>
          {selectedOption === 'Date Range' && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box display="flex" flexDirection="column" gap={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                      size: 'small',
                      sx: { borderRadius: theme.shape.borderRadius }
                    }
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                      size: 'small',
                      sx: { borderRadius: theme.shape.borderRadius }
                    }
                  }}
                />
              </Box>
            </LocalizationProvider>
          )}
          {selectedOption === 'Choose File' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                  sx: { borderRadius: theme.shape.borderRadius }
                }}
                sx={{ mb: 2 }}
              />
              <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {filteredFiles.length > 0 ? (
                  filteredFiles.map(f => (
                    <ListItemButton
                      key={f.id || f.file_id}
                      selected={selectedFile?.id === (f.id || f.file_id)}
                      onClick={() => setSelectedFile(f)}
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        py: 1,
                        borderRadius: theme.shape.borderRadius,
                        my: 0.5,
                        '&.Mui-selected': {
                          backgroundColor: theme.palette.action.selected,
                          '& .MuiTypography-root': {
                            fontWeight: 'medium',
                            color: theme.palette.primary.main,
                          },
                          '& .MuiSvgIcon-root': {
                            color: theme.palette.primary.main,
                          },
                        },
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <ListItemText
                          primary={getFileName(f)}
                          primaryTypographyProps={{
                            noWrap: true,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: selectedFile?.id === (f.id || f.file_id) ? 'medium' : 'regular',
                          }}
                        />
                        {selectedFile?.id === (f.id || f.file_id) && <CheckIcon color="primary" fontSize="small" sx={{ ml: 1 }} />}
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
                  <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary', py: 2 }}>
                    <Typography variant="body2">No files found.</Typography>
                  </Box>
                )}
              </List>
            </Box>
          )}
        </Box>

        <Box sx={{
          mt: 'auto',
          pt: 2,
          pb: 2,
          px: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default,
        }}>
          <Button
            variant="contained"
            fullWidth
            onClick={applyFilter}
            disabled={
              selectedOption === 'Date Range'
                ? !(startDate && endDate)
                : selectedOption === 'Choose File'
                  ? !selectedFile
                  : true
            }
            sx={{
              borderRadius: theme.shape.borderRadius,
              backgroundColor: 'black',
              color: 'white',
              py: 1,
              '&:hover': {
                backgroundColor: '#333',
                boxShadow: theme.shadows[4],
              },
              '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
            }}
          >
            Apply Filter
          </Button>
        </Box>
      </Drawer>
    </>
  );
}