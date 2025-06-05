import React, { useState } from 'react';
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
  Typography
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
  TableChart as TableChartIcon
} from '@mui/icons-material';

// MiniChart component
const MiniChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <Box className="mini-chart-empty">
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
    <Box className="mini-chart-container">
      {data.slice(0, 10).map((value, index) => (
        <Box
          key={index}
          className="mini-chart-bar"
          sx={{
            height: `${((value - minValue) / range) * 100}%`,
            minHeight: '2px'
          }}
        />
      ))}
    </Box>
  );
};

const QCTable = ({ 
  data = [], 
  summary = null, 
  solutionLabel = 'Unknown Solution' 
}) => {
  // State variables
  const [selectedItem, setSelectedItem] = useState('qc-tables');
  const [viewMode, setViewMode] = useState('table');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Mock data for demonstration
  const mockData = data.length > 0 ? data : [
    {
      element: 'Fe',
      units: 'ppm',
      valueAvg: 4.85,
      errorPercentage: 3.0,
      errorTolerance: 5.0,
      isWithinTolerance: true,
      distribution: [4.8, 4.9, 4.7, 4.85, 4.88, 4.82]
    },
    {
      element: 'Ca',
      units: 'ppm',
      valueAvg: 5.12,
      errorPercentage: 2.4,
      errorTolerance: 5.0,
      isWithinTolerance: true,
      distribution: [5.1, 5.15, 5.08, 5.12, 5.14, 5.09]
    },
    {
      element: 'Mg',
      units: 'ppm',
      valueAvg: 4.72,
      errorPercentage: 5.6,
      errorTolerance: 5.0,
      isWithinTolerance: false,
      distribution: [4.5, 4.8, 4.9, 4.7, 4.6, 4.8]
    }
  ];

  // Functions
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
    if (!sortConfig.key) return mockData;

    return [...mockData].sort((a, b) => {
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
  }, [mockData, sortConfig]);

  // Default summary if not provided
  const defaultSummary = summary || {
    totalElements: mockData.length,
    elementsWithinTolerance: mockData.filter(item => item.isWithinTolerance).length,
    averageRSD: mockData.reduce((acc, item) => acc + (item.errorPercentage || 0), 0) / (mockData.length || 1)
  };

  return (
    <div className="qc-container">
      {/* Sidebar Navigation */}
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      
      <div className="qc-main-content">
        {/* Header with controls */}
        <div className="qc-header">
          <div className="qc-breadcrumb">
            <span className="breadcrumb-item">QC Tables</span>
          </div>
          
          <div className="qc-header-controls">
            {/* View Toggle Buttons */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                startIcon={<TableChartIcon />}
                onClick={() => setViewMode('table')}
                size="small"
                className="view-button"
              >
                Table
              </Button>
              
              <Button
                variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                startIcon={<BarChartIcon />}
                onClick={() => setViewMode('graph')}
                size="small"
                className="view-button"
              >
                Graph
              </Button>
            </Stack>
            
            {/* Filter Button */}
            <button 
              className="filter-toggle-btn"
              onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
            >
              <FilterListIcon />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Sidebar */}
        <div className={`filter-sidebar ${filterSidebarOpen ? 'open' : ''}`}>
          <div className="filter-sidebar-header">
            <h3>Filters</h3>
            <button 
              className="filter-close-btn"
              onClick={() => setFilterSidebarOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="filter-content">
            <div className="filter-group">
              <label className="filter-label">Solution Label</label>
              <select className="filter-select">
                <option value="QC_MES_5 ppm">QC_MES_5 ppm</option>
                <option value="QC_STD_10 ppm">QC_STD_10 ppm</option>
                <option value="QC_CAL_1 ppm">QC_CAL_1 ppm</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Date Range</label>
              <div className="date-inputs">
                <div className="date-input-group">
                  <label className="date-label">Start date:</label>
                  <input type="date" className="filter-date-input" defaultValue="2024-01-01" />
                </div>
                <div className="date-input-group">
                  <label className="date-label">End date:</label>
                  <input type="date" className="filter-date-input" defaultValue="2024-12-31" />
                </div>
              </div>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Status Filter</label>
              <select className="filter-select">
                <option value="all">All Status</option>
                <option value="pass">Pass Only</option>
                <option value="fail">Fail Only</option>
              </select>
            </div>
            
            <button className="load-graphs-btn">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {filterSidebarOpen && <div className="filter-overlay" onClick={() => setFilterSidebarOpen(false)}></div>}

        {/* QC Samples Header */}
        <div className="qc-section">
          <div className="qc-section-header">
            <h2>QC Samples</h2>
            <div className="sample-indicator">
              {solutionLabel}
            </div>
          </div>

          {/* Summary Cards */}
          {defaultSummary && (
            <div style={{ padding: '24px' }}>
              <Grid container spacing={3} className="summary-cards">
                <Grid item xs={12} md={4}>
                  <Card className="summary-card primary-card">
                    <CardContent className="summary-card-content">
                      <AnalyticsIcon className="summary-icon primary-icon" />
                      <Typography variant="h4" className="summary-number primary-number">
                        {defaultSummary.totalElements}
                      </Typography>
                      <Typography variant="subtitle1" className="summary-label primary-label">
                        Total Elements
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card className="summary-card success-card">
                    <CardContent className="summary-card-content">
                      <CheckCircleIcon className="summary-icon success-icon" />
                      <Typography variant="h4" className="summary-number success-number">
                        {defaultSummary.elementsWithinTolerance}
                      </Typography>
                      <Typography variant="subtitle1" className="summary-label success-label">
                        Within Tolerance
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(defaultSummary.elementsWithinTolerance / defaultSummary.totalElements) * 100}
                        className="summary-progress"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </div>
          )}

          {/* Main Table */}
          <div style={{ padding: '0 24px 24px' }}>
            <Card className="main-table-card">
              {/* Table Header */}
              <Box className="table-header">
                <Box className="table-header-content">
                  <Box>
                    <Typography variant="h5" className="table-title">
                      Quality Control Analysis
                    </Typography>
                    <Chip 
                      label={`Solution: ${solutionLabel}`}
                      variant="outlined"
                      size="small"
                      className="solution-chip"
                    />
                  </Box>
                </Box>
              </Box>

              {/* Table */}
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-header-cell">
                        Element
                      </TableCell>
                      <TableCell className="table-header-cell">
                        <TableSortLabel
                          active={sortConfig.key === 'units'}
                          direction={sortConfig.key === 'units' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('units')}
                        >
                          Units
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className="table-header-cell">
                        <TableSortLabel
                          active={sortConfig.key === 'valueAvg'}
                          direction={sortConfig.key === 'valueAvg' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('valueAvg')}
                        >
                          Value (avg)
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className="table-header-cell">
                        <TableSortLabel
                          active={sortConfig.key === 'errorPercentage'}
                          direction={sortConfig.key === 'errorPercentage' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('errorPercentage')}
                        >
                          Error%
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className="table-header-cell">
                        <TableSortLabel
                          active={sortConfig.key === 'errorTolerance'}
                          direction={sortConfig.key === 'errorTolerance' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('errorTolerance')}
                        >
                          Error Tolerance%
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className="table-header-cell">
                        Distribution
                      </TableCell>
                      <TableCell className="table-header-cell">
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedData.map((row, index) => {
                      const statusInfo = getStatusInfo(row.isWithinTolerance, row.errorPercentage);
                      const isExpanded = expandedRows.has(row.element);
                      
                      return (
                        <React.Fragment key={row.element || index}>
                          <TableRow 
                            hover
                            className={`table-row ${isExpanded ? 'expanded' : ''} ${statusInfo.color}`}
                          >
                            <TableCell>
                              <Box className="element-cell" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" className="element-name">
                                  {row.element || 'Unknown'}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleRowExpansion(row.element)}
                                  className="expand-button"
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={row.units || 'N/A'} 
                                size="small" 
                                variant="outlined"
                                className="units-chip"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" className="value-text">
                                {row.valueAvg || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                className={`error-text ${statusInfo.color}`}
                              >
                                {row.errorPercentage || 0}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" className="tolerance-text">
                                {row.errorTolerance || 0}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Distribution visualization">
                                <div>
                                  <MiniChart data={row.distribution || []} />
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
                                className="status-chip"
                              />
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row Content */}
                          <TableRow>
                            <TableCell colSpan={7} className="expanded-cell">
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box className="expanded-content">
                                  <Typography variant="h6" className="expanded-title">
                                    Individual Samples Data for {row.element}
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                      <Paper className="detail-paper">
                              
                                        <Typography variant="body2">
                                          Sample 1: 
                                        </Typography>
                                        <Typography variant="body2">
                                          Sample 2: 
                                        </Typography>
                                        <Typography variant="body2">
                                          Sample 3: 
                                        </Typography>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default QCTable;