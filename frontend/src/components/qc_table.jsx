// This file is now cleaned and modularized

import React, { useEffect, useState, useMemo } from 'react';
import { Box, Card, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material';
import QCRow from './QCRow';

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
            {sortedData.map((row, index) => (
              <QCRow
                key={row.element || index}
                row={row}
                isExpanded={expandedRows.has(row.element)}
                toggleRowExpansion={toggleRowExpansion}
                miniTables={miniTables}
                miniSortConfig={miniSortConfig}
                sortMiniTable={sortMiniTable}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default QCTable;
