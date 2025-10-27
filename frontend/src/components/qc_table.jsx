import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import QCRow from './QCRow';
import { apiFetch } from '../csrfClient';

// ⏳ Add this helper
const formatDate = (dateObj) =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

const QC_TOLERANCE_PERCENT = 10; // adjust if your lab uses a different % for QC
const num = (v) =>
  v === undefined || v === null || v === '' ? null : Number(v);

const QCTable = ({ selectedFileId, selectedDateRange }) => {
  const [qcData, setQcData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  // Store mini table data as { data: [], totalItems: 0, currentPage: 1 }
  const [miniTables, setMiniTables] = useState({});
  const [miniSortConfig, setMiniSortConfig] = useState({});

  const MINI_TABLE_PAGE_SIZE = 10; // Define page size

  useEffect(() => {
    console.log('📣 [useEffect] selectedFileId:', selectedFileId);
    console.log('📣 [useEffect] selectedDateRange:', selectedDateRange);

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
    if (!selectedFileId) return;

    const userData = JSON.parse(sessionStorage.getItem("user")).user;

    try {
      const res = await apiFetch(`/qc-check/summary?file_id=${selectedFileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id }),
        credentials: "include",
      });

      console.log("📣 QC API Response:", res);

      // Pick correct source of rows
      const rows =
        res?.qcData || res?.summary?.tableData || res?.data?.qcData || [];

      if (!Array.isArray(rows) || rows.length === 0) {
        console.warn("⚠️ No QC rows in response");
        setQcData([]);
        return;
      }

      // Normalize field names + compute status
      const normalized = rows.map((r, idx) => {
        const errorPct = num(r.errorPercentage ?? r.error_percentage);

        // derive within tolerance if backend didn't send boolean
        const within =
          typeof r.isWithinTolerance === "boolean"
            ? r.isWithinTolerance
            : errorPct === null
            ? null
            : Math.abs(errorPct) <= QC_TOLERANCE_PERCENT;

        return {
          id: idx + 1,
          element: r.element || r.fullElementName || "N/A",
          fullElementName: r.fullElementName || r.element || "N/A",
          valueAvg: r.valueAvg ?? r.value_avg ?? r.value ?? null,
          correctedValueAvg: r.correctedValueAvg ?? r.corrected_value_avg ?? null,
          rsd: r.rsd ?? r.rsd_pct ?? null,
          errorPercentage: errorPct,
          solutionLabel: r.solutionLabel ?? r["Solution Label"] ?? "N/A",
          isWithinTolerance: within,
          status: within === null ? "N/A" : within ? "Pass" : "Fail",
          miniTableData: r.miniTableData || [],
        };
      });

      // De-duplicate by fullElementName (or element) and drop rows with no values
      const uniqueMap = new Map();

      for (const row of normalized) {
        // Skip rows that are all N/A
        if (
          row.valueAvg === null &&
          row.correctedValueAvg === null &&
          row.rsd === null &&
          row.errorPercentage === null
        ) {
          continue;
        }

        const key = row.fullElementName || row.element;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, row);
        }
      }

      setQcData([...uniqueMap.values()]);

    } catch (err) {
      console.error("❌ Error fetching QC data:", err);
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
      const userData = JSON.parse(sessionStorage.getItem('user')).user;
      const url = buildUrl(
        `${import.meta.env.VITE_API_URL}/element-mini-table`,
        page,
        MINI_TABLE_PAGE_SIZE
      );
      const res = await apiFetch(`${url}&element=${encodeURIComponent(element)}`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
        }),
      });

      // 🔧 apiFetch already parses JSON → use res.data
      const json = res.data;

      if (json.success) {
        setMiniTables((prev) => ({
          ...prev,
          [element]: {
            data: json.miniTable || [],
            totalItems: json.totalItems || 0,
            currentPage: json.page || 1,
          },
        }));
      } else {
        console.error('❌ [Frontend] Error fetching mini table:', json.message);
        setMiniTables((prev) => ({
          ...prev,
          [element]: { data: [], totalItems: 0, currentPage: 1 },
        }));
      }
    } catch (err) {
      console.error('❌ [Frontend] Error fetching mini table:', err);
      setMiniTables((prev) => ({
        ...prev,
        [element]: { data: [], totalItems: 0, currentPage: 1 },
      }));
    }
  };

  const toggleRowExpansion = (fullElementName) => {
    const next = new Set(expandedRows);
    if (next.has(fullElementName)) {
      next.delete(fullElementName);
    } else {
      next.add(fullElementName);
      if (
        !miniTables[fullElementName] ||
        !miniTables[fullElementName].data ||
        miniTables[fullElementName].data.length === 0
      ) {
        fetchMiniTableData(fullElementName, 1); // directly pass full name
      }
    }
    setExpandedRows(next);
  };

  const sortMiniTable = (element, key) => {
    const current = miniSortConfig[element] || { key: '', direction: 'asc' };
    const direction = current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    const sorted = [...(miniTables[element]?.data || [])].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setMiniTables((prev) => ({
      ...prev,
      [element]: { ...prev[element], data: sorted },
    }));
    setMiniSortConfig((prev) => ({ ...prev, [element]: { key, direction } }));
  };

  const handleMiniTablePageChange = (element, newPage) => {
    fetchMiniTableData(element, newPage);
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return qcData;

    const keyForSorting = sortConfig.key === 'status' ? 'errorPercentage' : sortConfig.key;

    return [...qcData].sort((a, b) => {
      const aVal = a[keyForSorting];
      const bVal = b[keyForSorting];

      if (keyForSorting === 'element') {
        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }

      if (Number(aVal) < Number(bVal)) return sortConfig.direction === 'asc' ? -1 : 1;
      if (Number(aVal) > Number(bVal)) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [qcData, sortConfig]);

  const sortableKeys = ['element', 'valueAvg', 'rsd', 'errorPercentage', 'status'];

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
          Quality Control Analysis
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
            {[
              { key: 'element', label: 'Element' },
              { key: 'valueAvg', label: 'Value (avg)' },
              { key: 'rsd', label: 'RSD%' },
              { key: 'errorPercentage', label: 'Error%' },
              { key: 'status', label: 'Status' },
            ].map((col, idx) => {
              const isSortable = sortableKeys.includes(col.key);
              const isActive = sortConfig.key === col.key;
              const displayArrow = isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅';

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
                      '&:hover .hoverArrow': {
                        visibility: 'visible',
                      },
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
            <QCRow
              key={`${row.fullElementName || row.element}-${index}`}
              row={row}
              isExpanded={expandedRows.has(row.fullElementName)}
              toggleRowExpansion={toggleRowExpansion}
              miniTableData={miniTables[row.fullElementName] || {}}
              pageSize={MINI_TABLE_PAGE_SIZE}
              handleMiniTablePageChange={handleMiniTablePageChange}
              miniSortConfig={miniSortConfig}
              sortMiniTable={sortMiniTable}
            />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default QCTable;
