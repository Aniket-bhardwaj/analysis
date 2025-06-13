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

// Sample uploaded files data
const sampleFiles = [
  { name: 'Random1.csv', date: '22-05-2025 14:11' },
  { name: 'Random2.csv', date: '22-05-2025 14:11' },
  { name: 'Random3.csv', date: '22-05-2025 14:11' },
  { name: 'Random4.csv', date: '22-05-2025 14:11' }
];

export default function NestedFilterDrawer() {
  const theme = useTheme();
  const [mainOpen, setMainOpen] = useState(false);
  const [optionOpen, setOptionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [filterApplied, setFilterApplied] = useState(false);

  // Handle main Filter button: open drawer or clear filters
  const handleMainClick = () => {
    if (filterApplied) {
      // Clear everything
      setFilterApplied(false);
      setSelectedOption('');
      setStartDate('');
      setEndDate('');
      setFileSearch('');
      setSelectedFile('');
      setOptionOpen(false);
      setMainOpen(false);
    } else {
      // Open/close main drawer
      setOptionOpen(false);
      setMainOpen(open => !open);
    }
  };

  // Apply filter action
  const applyFilter = () => {
    console.log('Applying filter:', {
      selectedOption,
      startDate,
      endDate,
      selectedFile,
    });
    setFilterApplied(true);
    setOptionOpen(false);
    setMainOpen(false);
  };

  // Open or toggle an option drawer
  const openOption = (option) => {
    if (!mainOpen) setMainOpen(true);
    if (selectedOption === option) {
      setOptionOpen(open => !open);
    } else {
      setSelectedOption(option);
      setOptionOpen(true);
    }
    setFileSearch('');
    setSelectedFile('');
  };

  const closeOption = () => {
    setOptionOpen(false);
  };

  // Filter files by search term
  const filteredFiles = sampleFiles.filter(f =>
    f.name.toLowerCase().includes(fileSearch.trim().toLowerCase())
  );

  return (
    <>
      {/* Main Filter Button */}
      <Button
        variant={filterApplied ? 'contained' : 'outlined'}
        color={filterApplied ? 'primary' : 'inherit'}
        endIcon={filterApplied ? <CloseIcon /> : <FilterListIcon />}
        onClick={handleMainClick}
        sx={{
          textTransform: 'none',
          borderRadius: 2,
          borderColor: theme.palette.grey[500],
          borderWidth: 1,
          borderStyle: 'solid',
          mr: 1,
        }}
      >
        <Typography variant="button" sx={{ color: filterApplied ? '#fff' : theme.palette.text.primary }}>
          Filter
        </Typography>
      </Button>

      {/* Main Drawer */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={mainOpen}
        PaperProps={{
          sx: { width: 240, position: 'fixed', right: 0, zIndex: theme.zIndex.drawer }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Filter</Typography>
            <IconButton onClick={handleMainClick}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <List>
            {['Date Range', 'Choose File'].map(option => (
              <ListItem
                key={option}
                button
                selected={selectedOption === option}
                onClick={() => openOption(option)}
              >
                <ListItemText primary={option} />
                {selectedOption === option && <CheckIcon color="primary" />}
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Option Drawer */}
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
            <IconButton onClick={closeOption}>
              <ChevronRightIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>
              {selectedOption}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, mt: 2, overflowY: 'auto' }}>
            {/* Date Range Picker */}
            {selectedOption === 'Date Range' && (
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Start date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <TextField
                  label="End date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </Box>
            )}

            {/* Choose File List */}
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
                      key={f.name}
                      selected={selectedFile === f.name}
                      onClick={() => setSelectedFile(f.name)}
                    >
                      <ListItemText primary={f.name} secondary={f.date} />
                      {selectedFile === f.name && <CheckIcon color="primary" />}
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

          {/* Apply Filter Button */}
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
              Apply Filter
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
