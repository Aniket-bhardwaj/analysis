import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography
} from '@mui/material';
import SJSRow from './SJSRow';

const SJSTable = ({ selectedFileId, startDate, endDate }) => {

    const [sjsData, setSjsData] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    const [expandedRows, setExpandedRows] = useState(new Set());
    // Updated state to hold pagination info for each mini table
    const [miniTables, setMiniTables] = useState({});
    const [miniSortConfig, setMiniSortConfig] = useState({});

    // Define a page size for the mini tables
    const MINI_TABLE_PAGE_SIZE = 10;

    useEffect(() => {
        if (selectedFileId || (startDate && endDate)) fetchSJSData();
    }, [selectedFileId, startDate, endDate]);


    const buildSJSURL = (selectedFileId, startDate, endDate) => {
        const base = `${import.meta.env.VITE_API_URL}/sjsTable-data`;
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

    const fetchMiniTableData = async (element, page = 1) => {
        try {
            let url = `${import.meta.env.VITE_API_URL}/sjs-mini-table?element=${encodeURIComponent(element)}`;
            if (selectedFileId) {
                url += `&file_id=${selectedFileId}`;
            } else if (startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            } else {
                console.warn("[SJS_Table] Cannot fetch mini table data without file_id or date range.");
                return;
            }
            // Add pagination parameters
            url += `&page=${page}&pageSize=${MINI_TABLE_PAGE_SIZE}`;

            const res = await fetch(url);
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
                console.error("❌ [Frontend] Error fetching SJS mini table:", json.message);
                setMiniTables(prev => ({
                    ...prev,
                    [element]: { data: [], totalItems: 0, currentPage: 1 }
                }));
            }
        } catch (err) {
            console.error("\u274C [Frontend] Error fetching SJS mini table:", err);
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
            // Fetch data if not already present
            if (!miniTables[element]) {
                fetchMiniTableData(element, 1); // Fetch first page on expand
            }
        }
        setExpandedRows(next);
    };
    
    // Handler for changing the page of a mini table
    const handleMiniTablePageChange = (element, newPage) => {
        fetchMiniTableData(element, newPage);
    };

    const sortMiniTable = (element, key) => {
        // Note: This sorting is client-side. If you need server-side sorting for paginated data,
        // you would need to adjust the `fetchMiniTableData` to include sort parameters.
        const current = miniSortConfig[element] || { key: '', direction: 'asc' };
        const direction = current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
        
        const sortedData = [...(miniTables[element]?.data || [])].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        setMiniTables(prev => ({ 
            ...prev, 
            [element]: {
                ...prev[element],
                data: sortedData
            }
        }));
        setMiniSortConfig(prev => ({ ...prev, [element]: { key, direction } }));
    };

    const sortedData = useMemo(() => {
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
                <Box sx={{ display: 'flex', alignItems: 'baseline', pl: 1 }}>
    <Typography variant="h6">
        Standard Quality Analysis
    </Typography>
    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
        (*All values shown below are corrected)
    </Typography>
</Box>
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
                        <SJSRow
                            key={row.element || index}
                            row={row}
                            isExpanded={expandedRows.has(row.fullElementName)}
                            toggleRowExpansion={toggleRowExpansion}
                            // Pass the specific miniTable object, or a default structure
                            miniTableData={miniTables[row.fullElementName] || { data: [], totalItems: 0, currentPage: 1 }}
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

export default SJSTable;
