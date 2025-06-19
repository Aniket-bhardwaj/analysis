import React, { useState } from 'react';
import {
  Drawer,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  TextField,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';

export default function NestedFilterDrawer({ uploadedFiles = [], onApplyFilter }) {
  const theme = useTheme();
  const [mainOpen, setMainOpen] = useState(false);
  const [optionOpen, setOptionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const handleMainClick = () => {
    if (filterApplied) {
      setFilterApplied(false);
      setSelectedOption('');
      setStartDate('');
      setEndDate('');
      setFileSearch('');
      setSelectedFile(null);
      setOptionOpen(false);
      setMainOpen(false);
      onApplyFilter({ type: 'clear' });
    } else {
      setOptionOpen(false); // Ensure option drawer is closed when opening main drawer
      setMainOpen(open => !open);
    }
  };

  const applyFilter = () => {
    if (selectedOption === 'Date Range') {
      onApplyFilter({ type: 'date', startDate, endDate });
    } else if (selectedOption === 'Choose File') {
      onApplyFilter({ type: 'file', file: selectedFile });
    }
    setFilterApplied(true);
    setOptionOpen(false);
    setMainOpen(false);
  };

  const openOption = (option) => {
    if (!mainOpen) setMainOpen(true);
    if (selectedOption === option) {
      setOptionOpen(open => !open);
    } else {
      setSelectedOption(option);
      setOptionOpen(true);
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

  return (
    <>
      <Button
        variant={filterApplied ? 'contained' : 'outlined'}
        color={filterApplied ? 'primary' : 'inherit'}
        endIcon={filterApplied ? <CloseIcon /> : <FilterListIcon />}
        onClick={handleMainClick}
      >
        Filter
      </Button>

      <Drawer
        anchor="right"
        variant="persistent"
        open={mainOpen}
        PaperProps={{
          sx: { width: 240, position: 'fixed', right: 0, zIndex: theme.zIndex.drawer }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Filter By</Typography>
          {/* MODIFIED HERE: Close both drawers when main close button is clicked */}
          <IconButton onClick={() => {
            setMainOpen(false);
            setOptionOpen(false); // Ensure option drawer closes with main
          }}><ChevronRightIcon /></IconButton>
        </Box>
        <List>
          {['Date Range', 'Choose File'].map(option => (
            <ListItem key={option} button selected={selectedOption === option} onClick={() => openOption(option)}>
              <ListItemText primary={option} />
              {selectedOption === option && <CheckIcon color="primary" />}
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Drawer
        anchor="right"
        variant="persistent"
        open={optionOpen}
        PaperProps={{
          sx: {
            width: 300,
            position: 'fixed',
            right: 240,
            zIndex: theme.zIndex.drawer + 1,
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box display="flex" alignItems="center">
            <IconButton onClick={closeOption}><ChevronRightIcon sx={{ transform: 'rotate(180deg)' }} /></IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>{selectedOption}</Typography>
          </Box>

          <Box sx={{ flex: 1, mt: 2, overflowY: 'auto' }}>
            {selectedOption === 'Date Range' && (
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="Start date" type="date" InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <TextField label="End date" type="date" InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </Box>
            )}
            {selectedOption === 'Choose File' && (
              <Box>
                <TextField
                  placeholder="Search file name"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={fileSearch}
                  onChange={e => setFileSearch(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <List sx={{ mt: 1 }}>
                  {filteredFiles.map(f => (
                    <ListItem
                      button
                      key={f.id || f.file_id}
                      selected={selectedFile?.id === (f.id || f.file_id)}
                      onClick={() => setSelectedFile(f)}
                    >
                      <ListItemText primary={getFileName(f)} />
                      {selectedFile?.id === (f.id || f.file_id) && <CheckIcon color="primary" />}
                    </ListItem>
                  ))}
                  {filteredFiles.length === 0 && (
                    <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No files found
                    </Box>
                  )}
                </List>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
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
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}