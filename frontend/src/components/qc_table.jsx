import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
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
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  AnalyticsOutlined as AnalyticsIcon
} from '@mui/icons-material';
import MiniChart from './MiniChart';

const QCTable = ({ selectedFileId, selectedSolutionLabel }) => {
  const [qcData, setQcData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchQCData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/table-data?file_id=${selectedFileId}&solution_label=${encodeURIComponent(selectedSolutionLabel)}`);
        const result = await res.json();
        if (result.success) {
          setQcData(result.tableData || []);
          setSummary(result.summary || null);
        }
      } catch (error) {
        console.error('Error fetching QC data:', error);
      }
    };

    if (selectedFileId && selectedSolutionLabel) {
      fetchQCData();
    }
  }, [selectedFileId, selectedSolutionLabel]);

  const toggleRowExpansion = (element) => {
    const updatedRows = new Set(expandedRows);
    if (updatedRows.has(element)) updatedRows.delete(element);
    else updatedRows.add(element);
    setExpandedRows(updatedRows);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusInfo = (isWithinTolerance) => {
    return isWithinTolerance
      ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
      : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !qcData.length) return qcData;
    return [...qcData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      return sortConfig.direction === 'asc'
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });
  }, [qcData, sortConfig]);

  return (
    <>
      {summary && (
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
        </Grid>
      )}

      <Card>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Quality Control Analysis</Typography>
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
                <TableCell>Error%</TableCell>
                <TableCell>Distribution</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((row, index) => {
                const statusInfo = getStatusInfo(row.isWithinTolerance);
                const isExpanded = expandedRows.has(row.element);
                return (
                  <React.Fragment key={row.element || index}>
                    <TableRow hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {row.element}
                          </Typography>
                          <IconButton size="small" onClick={() => toggleRowExpansion(row.element)}>
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>{row.units}</TableCell>
                      <TableCell>{row.valueAvg}</TableCell>
                      <TableCell>{row.rsd}%</TableCell>
                      <TableCell>{row.errorPercentage}%</TableCell>
                      <TableCell>
                        <Tooltip title="Distribution visualization">
                          <div><MiniChart data={row.distributionData || []} /></div>
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
                                  <Stack spacing={1}>
                                    <Typography variant="body2"><strong>Sample Count:</strong> {row.sampleCount}</Typography>
                                    <Typography variant="body2"><strong>Standard Deviation:</strong> {row.standardDeviation}</Typography>
                                    <Typography variant="body2"><strong>Min Value:</strong> {row.minValue}</Typography>
                                    <Typography variant="body2"><strong>Max Value:</strong> {row.maxValue}</Typography>
                                    <Typography variant="body2"><strong>Quality Status:</strong> {row.qualityStatus}</Typography>
                                  </Stack>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                  <Stack spacing={1}>
                                    <Typography variant="body2"><strong>Error Tolerance:</strong> {row.errorTolerance}%</Typography>
                                    <Typography variant="body2"><strong>Within Tolerance:</strong> {row.isWithinTolerance ? 'Yes' : 'No'}</Typography>
                                    {row.correctedValueAvg && (
                                      <Typography variant="body2"><strong>Corrected Average:</strong> {row.correctedValueAvg}</Typography>
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
    </>
  );
};

export default QCTable;