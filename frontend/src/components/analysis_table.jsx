import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import AnalysisRow from './AnalysisRow';

const AnalysisTable = ({ sampleId }) => {
  console.log("🔍 sampleId received in AnalysisTable:", sampleId);

  const [tableData, setTableData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (sampleId) fetchTable();
  }, [sampleId]);

  const fetchTable = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/sample-table?sampleId=${sampleId}`
      );
      const json = await res.json();
      setTableData(json.tableData || []);
    } catch (err) {
      console.error('Failed to fetch analysis table', err);
      setTableData([]);
    }
  };

  const toggleRowExpansion = (element) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(element) ? next.delete(element) : next.add(element);
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortConfig.key !== key) {
      setSortConfig({ key, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ key, direction: 'desc' });
    } else if (sortConfig.direction === 'desc') {
      setSortConfig({ key: '', direction: '' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return tableData;
    return [...tableData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const sortableKeys = ['elem', 'corrected'];


  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          py: 1,
        }}
      >
        <Typography variant="h6" sx={{ pl: 1 }}>
          Sample Analysis
        </Typography>
      </Box>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 0,
          fontSize: '0.95rem',
        }}
      >
        <thead>
          <tr>
            {[{ key: 'elem', label: 'Element' },
            { key: 'corrected', label: 'Corrected Value' },
            { key: null, label: 'Status' }]

              .map((col, idx) => {
                const isSortable = sortableKeys.includes(col.key);
                const isActive = sortConfig.key === col.key;
                const displayArrow = isActive
                  ? sortConfig.direction === 'asc' ? '▲' : '▼'
                  : '⇅';
                return (
                  <th
                    key={idx}
                    onClick={() => isSortable && handleSort(col.key)}
                    style={{
                      position: 'sticky',
                      top: 48,
                      background: '#f8f9fb',
                      zIndex: 50,
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontWeight: 450,
                      borderBottom: '1px solid #ccc',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '&:hover .hoverArrow': { visibility: 'visible' },
                      }}
                    >
                      {col.label}
                      {isSortable && (
                        <Box
                          className="hoverArrow"
                          component="span"
                          sx={{
                            fontSize: '0.75rem',
                            color: '#888',
                            visibility: isActive ? 'visible' : 'hidden',
                          }}
                        >
                          {displayArrow}
                        </Box>
                      )}
                    </Box>
                  </th>
                );
              })}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((row, index) => (
            <AnalysisRow
            key={row.elem || index}
            row={row}
            isExpanded={expandedRows.has(row.elem)}   // ⬅️ fix here
            toggleRowExpansion={toggleRowExpansion}
          />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default AnalysisTable;