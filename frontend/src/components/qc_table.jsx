// This file is now cleaned: mini table retained, summary logic removed, onSummaryUpdate prop removed, debug logs kept

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, Chip, Collapse, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Typography
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

const MiniChart = ({ data = [] }) => {
  if (!data.length) return (
    <Box sx={{ width: 60, height: 30, backgroundColor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="caption">No data</Typography>
    </Box>
  );

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <Box sx={{ display: 'flex', gap: 1, height: 30, width: 60, alignItems: 'end' }}>
      {data.slice(0, 8).map((v, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            backgroundColor: '#1976d2',
            borderRadius: '2px 2px 0 0',
            height: `${Math.max(((v - min) / range) * 100, 10)}%`,
            opacity: 0.8
          }}
        />
      ))}
    </Box>
  );
};

const QCTable = ({ selectedFileId, selectedSolutionLabel }) => {
  const [qcData, setQcData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [miniTables, setMiniTables] = useState({});
  const [miniSortConfig, setMiniSortConfig] = useState({});

  useEffect(() => {
    if (selectedFileId && selectedSolutionLabel) fetchQCData();
  }, [selectedFileId, selectedSolutionLabel]);

  const fetchQCData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/table-data?file_id=${selectedFileId}&solution_label=${encodeURIComponent(selectedSolutionLabel)}`);
      const result = await response.json();
      setQcData(result.tableData || []);
    } catch (err) {
      console.error('Error fetching QC data:', err);
      setQcData([]);
    }
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const fetchMiniTableData = async (element) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/element-mini-table?file_id=${selectedFileId}&solution_label=${encodeURIComponent(selectedSolutionLabel)}&element=${encodeURIComponent(element)}`;
      const res = await fetch(url);
      const json = await res.json();
      setMiniTables(prev => ({ ...prev, [element]: json.miniTable || [] }));
    } catch (err) {
      console.error("❌ [Frontend] Error fetching mini table:", err);
    }
  };

  const toggleRowExpansion = (element) => {
    const next = new Set(expandedRows);
    if (next.has(element)) {
      next.delete(element);
    } else {
      next.add(element);
      if (!miniTables[element]) fetchMiniTableData(element);
    }
    setExpandedRows(next);
  };

  const getStatusInfo = (within) => within
    ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
    : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return qcData;
    return [...qcData].sort((a, b) => {
      const aVal = Number(a[sortConfig.key]);
      const bVal = Number(b[sortConfig.key]);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [qcData, sortConfig]);

  const sortMiniTable = (element, key) => {
    const current = miniSortConfig[element] || { key: '', direction: 'asc' };
    const direction = current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    const sorted = [...(miniTables[element] || [])].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setMiniTables(prev => ({ ...prev, [element]: sorted }));
    setMiniSortConfig(prev => ({ ...prev, [element]: { key, direction } }));
  };

  return (
    <Card>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Quality Control Analysis</Typography>
        <Chip label={`Solution: ${selectedSolutionLabel}`} variant="outlined" size="small" sx={{ mt: 1 }} />
      </Box>

      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 8 }}>
                <TableSortLabel
                  active={sortConfig.key === 'element'}
                  direction={sortConfig.key === 'element' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('element')}
                >
                  Element
                </TableSortLabel>
              </TableCell>
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
              const isExpanded = expandedRows.has(row.element);
              const status = getStatusInfo(row.isWithinTolerance);

              return (
                <React.Fragment key={row.element || index}>
                  <TableRow hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => toggleRowExpansion(row.element)}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.element}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{row.valueAvg}</TableCell>
                    <TableCell>
                      <Typography color={row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'}>{row.rsd}%</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color={row.errorPercentage > 10 ? 'error' : 'success.main'}>{row.errorPercentage}%</Typography>
                    </TableCell>
                    <TableCell>
                      {row.distributionData && row.distributionData.length > 0 ? (
                        <MiniChart data={row.distributionData} />
                      ) : (
                        <Chip label="No data" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip icon={status.icon} label={status.label} color={status.color} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 4, py: 2 }}>
                          <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Measurements for <strong>{row.element}</strong>
                          </Typography>

                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <TableSortLabel
                                    active={miniSortConfig[row.element]?.key === 'timestamp'}
                                    direction={miniSortConfig[row.element]?.direction || 'asc'}
                                    onClick={() => sortMiniTable(row.element, 'timestamp')}
                                  >
                                    Timestamp
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={miniSortConfig[row.element]?.key === 'value'}
                                    direction={miniSortConfig[row.element]?.direction || 'asc'}
                                    onClick={() => sortMiniTable(row.element, 'value')}
                                  >
                                    Value
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={miniSortConfig[row.element]?.key === 'errorPercentage'}
                                    direction={miniSortConfig[row.element]?.direction || 'asc'}
                                    onClick={() => sortMiniTable(row.element, 'errorPercentage')}
                                  >
                                    Error%
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>

                            <TableBody>
                              {(miniTables[row.element] || []).map((entry, i) => {
                                const miniStatus = entry.status === 'Pass'
                                  ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
                                  : entry.status === 'Fail'
                                    ? { icon: <ErrorIcon />, label: 'Fail', color: 'error' }
                                    : { icon: null, label: 'N/A', color: 'default' };
                                return (
                                  <TableRow key={i}>
                                    <TableCell>{entry.timestamp}</TableCell>
                                    <TableCell>{entry.value}</TableCell>
                                    <TableCell>{entry.errorPercentage}</TableCell>
                                    <TableCell>
                                      <Chip icon={miniStatus.icon} label={miniStatus.label} color={miniStatus.color} size="small" variant="outlined" />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
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
  );
};

export default QCTable;
