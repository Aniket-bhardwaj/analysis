import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import QCRow from './QCRow';
// ⏳ Add this helper
const formatDate = (dateObj) =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;


const QCTable = ({ selectedFileId, selectedDateRange }) => {
  const [qcData, setQcData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  // Store mini table data as { data: [], totalItems: 0, currentPage: 1 }
  const [miniTables, setMiniTables] = useState({});
  const [miniSortConfig, setMiniSortConfig] = useState({});

  const MINI_TABLE_PAGE_SIZE = 10; // Define page size

  useEffect(() => {
  console.log("📣 [useEffect] selectedFileId:", selectedFileId);
  console.log("📣 [useEffect] selectedDateRange:", selectedDateRange);

  if (selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) {
    fetchQCData();
  }
}, [selectedFileId, selectedDateRange]);

  const buildUrl = (baseUrl, page, pageSize) => {
  const params = new URLSearchParams();

  // Only one should be active at a time:
  if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
    const start = formatDate(new Date(selectedDateRange.startDate));
    const end = formatDate(new Date(selectedDateRange.endDate));
    params.append('start_date', start);
    params.append('end_date', end);
  } else if (selectedFileId) {
    params.append('file_id', selectedFileId);
  }

  if (page && pageSize) {
    params.append('page', page);
    params.append('pageSize', pageSize);
  }

  return `${baseUrl}?${params.toString()}`;
};




  const fetchQCData = async () => {
    try {
      // buildUrl for fetchQCData does not need page/pageSize for the main table
      const url = buildUrl(`http://localhost:5000/table-data`); 
      console.log("📡 Fetching QC data from:", url);
      const response = await fetch(url);
      const result = await response.json();
      console.log("✅ Fetched result:", result);
      setQcData(result.tableData || []);
    } catch (err) {
      console.error('❌ Error fetching QC data:', err);
      setQcData([]);
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

  const fetchMiniTableData = async (element, page = 1) => {
    try {
      const url = buildUrl(`http://localhost:5000/element-mini-table`, page, MINI_TABLE_PAGE_SIZE);
      const res = await fetch(`${url}&element=${encodeURIComponent(element)}`);
      const json = await res.json();
      if (json.success) {
        setMiniTables(prev => ({
          ...prev,
          [element]: {
            data: json.miniTable || [],
            totalItems: json.totalItems || 0,
            currentPage: json.page || 1,
          }
        }));
      } else {
        console.error("❌ [Frontend] Error fetching mini table:", json.message);
        setMiniTables(prev => ({
          ...prev,
          [element]: { data: [], totalItems: 0, currentPage: 1 }
        }));
      }
    } catch (err) {
      console.error("❌ [Frontend] Error fetching mini table:", err);
      setMiniTables(prev => ({
          ...prev,
          [element]: { data: [], totalItems: 0, currentPage: 1 }
        }));
    }
  };

  const toggleRowExpansion = (element) => {
    const next = new Set(expandedRows);
    if (next.has(element)) {
      next.delete(element);
    } else {
      next.add(element);
      // Fetch data if not already fetched or if it's empty (e.g. after an error)
      if (!miniTables[element] || !miniTables[element].data || miniTables[element].data.length === 0 && miniTables[element].totalItems === 0) {
        fetchMiniTableData(element, 1); // Fetch first page on expand
      }
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

  const handleMiniTablePageChange = (element, newPage) => {
    fetchMiniTableData(element, newPage);
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return qcData;
    return [...qcData].sort((a, b) => {
      const aVal = Number(a[sortConfig.key]);
      const bVal = Number(b[sortConfig.key]);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [qcData, sortConfig]);

  const sortableKeys = ['element', 'valueAvg', 'rsd', 'errorPercentage'];

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
          Quality Control Analysis
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
              { key: 'rsd', label: 'RSD%' },
              { key: 'errorPercentage', label: 'Error%' },
              //{ key: null, label: 'Distribution' },
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
          {sortedData.map((row, index) => (
            <QCRow
              key={row.element || index}
              row={row}
              isExpanded={expandedRows.has(row.element)}
              toggleRowExpansion={toggleRowExpansion}
              // Pass the specific miniTable object for the element, or a default structure
              miniTableData={miniTables[row.element] || { data: [], totalItems: 0, currentPage: 1 }}
              pageSize={MINI_TABLE_PAGE_SIZE}
              handleMiniTablePageChange={handleMiniTablePageChange}
              miniSortConfig={miniSortConfig} // Keep this for client-side sort state
              sortMiniTable={sortMiniTable}   // Keep this for client-side sort function
            />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default QCTable;
