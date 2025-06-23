import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography
} from '@mui/material';
import SJSRow from './SJSRow';

const SJSTable = ({ selectedFileId, startDate, endDate }) => {

  const [sjsData, setSjsData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [miniTables, setMiniTables] = useState({});
  const [miniSortConfig, setMiniSortConfig] = useState({});

  useEffect(() => {
  if (selectedFileId || (startDate && endDate)) fetchSJSData();
}, [selectedFileId, startDate, endDate]);


  const buildSJSURL = (selectedFileId, startDate, endDate) => {
  const base = 'http://localhost:5000/sjsTable-data';
  const params = new URLSearchParams();
  if (selectedFileId) params.append('file_id', selectedFileId);
  else if (startDate && endDate) {
    params.append('start_date', startDate);
    params.append('end_date', endDate);
  }
  return `${base}?${params.toString()}`;
};


  const fetchSJSData = async () => {
  try {
    const url = buildSJSURL(selectedFileId, startDate, endDate);
    const response = await fetch(url);
    const result = await response.json();
    console.log('[SJS Table] Data:', result.tableData);
    setSjsData(result.tableData || []);
  } catch (err) {
    console.error('Error fetching SJS data:', err);
    setSjsData([]);
  }
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

  const fetchMiniTableData = async (element) => {
    try {
      const url = `http://localhost:5000/sjs-mini-table?file_id=${selectedFileId}&element=${encodeURIComponent(element)}`;
      const res = await fetch(url);
      const json = await res.json();
      setMiniTables(prev => ({ ...prev, [element]: json.miniTable || [] }));
    } catch (err) {
      console.error("\u274C [Frontend] Error fetching mini table:", err);
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
    console.log('[SJS Table] Sorted Data:', sjsData);
    if (!sortConfig.key || !sortConfig.direction) return sjsData;
    return [...sjsData].sort((a, b) => {
      const aVal = Number(a[sortConfig.key]);
      const bVal = Number(b[sortConfig.key]);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sjsData, sortConfig]);

  const sortableKeys = ['element', 'valueAvg', 'sjsStd', 'errorAllowedPercent', 'actualErrorPercent', 'rsd'];

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          py: 1
        }}
      >
        <Typography variant="h6" sx={{ pl: 1 }}>
          SJS Table
        </Typography>
      </Box>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 0,
          fontSize: '0.95rem'
        }}
      >
        <thead>
          <tr>
            {[{ key: 'element', label: 'Element' },
              { key: 'valueAvg', label: 'Value (avg)' },
              { key: 'sjsStd', label: 'SJS-Std' },
              { key: 'errorAllowedPercent', label: 'Tolerance (%)' },
              { key: 'actualErrorPercent', label: 'Error (%)' },
              { key: 'rsd', label: 'RSD%' },
              { key: null, label: 'Distribution' },
              { key: null, label: 'Status' }
            ].map((col, idx) => {
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
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&:hover .hoverArrow': {
                        visibility: 'visible'
                      }
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
                          visibility: isActive ? 'visible' : 'hidden'
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
          {console.log('[Rendering Rows]', sortedData.map(r => r.element))}
          {sortedData.map((row, index) => (
            <SJSRow
              key={row.element || index}
              row={row}
              isExpanded={expandedRows.has(row.element)}
              toggleRowExpansion={toggleRowExpansion}
              miniTables={miniTables}
              miniSortConfig={miniSortConfig}
              sortMiniTable={sortMiniTable}
            />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default SJSTable;
