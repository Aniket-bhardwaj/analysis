import React, { useEffect, useState, useMemo } from 'react';
import { Box, Autocomplete, TextField, Typography  } from '@mui/material';
import AnalysisRow from './AnalysisRow';

const AnalysisTable = () => {
  const [samples, setSamples]               = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);

  const [tableData, setTableData]           = useState([]);
  const [sortConfig, setSortConfig]         = useState({ key: '', direction: '' });
  const [expandedRows, setExpandedRows]     = useState(new Set());
  const [fileLinks, setFileLinks] = useState([]);


  const API = import.meta.env.VITE_API_URL;

  // Fetch samples list
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res  = await fetch(`${API}/samples`);
        const data = await res.json();
        setSamples(data.samples || data);
      } catch (err) {
        console.error('Failed to fetch samples', err);
      }
    };
    fetchSamples();
  }, [API]);

  // Auto-select the last sample
  useEffect(() => {
    if (!selectedSample && samples.length) {
      setSelectedSample(samples[samples.length - 1]);
    }
  }, [samples, selectedSample]);

  // Fetch table data whenever the selected sample changes
  useEffect(() => {
    if (!selectedSample?.id) return;

    (async () => {
      try {
        const res  = await fetch(
          `${API}/sample-table?sampleId=${selectedSample.id}`
        );
        const data = await res.json();
        setTableData(Array.isArray(data.tableData) ? data.tableData : []);
setFileLinks(Array.isArray(data.fileLinks) ? data.fileLinks : []);
      } catch (err) {
        console.error('Failed to fetch table data', err);
        setTableData([]);
      }
    })();
  }, [selectedSample, API]);

  // Toggle row expansion
  const toggleRowExpansion = (elem) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(elem) ? next.delete(elem) : next.add(elem);
      return next;
    });
  };

  // Sorting logic
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: '', direction: '' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return tableData;
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
      {/* Full-width search bar */}
      <Box sx={{ mb: 2, width: '100%' }}>
        <Autocomplete
          disablePortal
          options={samples}
          getOptionLabel={(opt) => opt.name || ''}
          value={selectedSample}
          onChange={(e, val) => setSelectedSample(val)}
          sx={{ width: 300 }} // Set desired width here
          renderInput={(params) =>
            <TextField
              {...params}
              label="Search Sample"
              size="small"
            />
          }
        />

{fileLinks.length > 0 && (
  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 'normal',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      Source Filename:
    </Typography>

    {fileLinks.map((file, index) => (
      <span key={file.id} style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem' }}>
        <Box
          component="a"
          href={`/data-manager?fileId=${file.id}`}
          sx={{
            color: '#1e40af',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {file.filename}
        </Box>
        {index < fileLinks.length - 1 && ','}
      </span>
    ))}
  </Box>
)}


      </Box>

      {/* Data table */}
      {selectedSample && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              {[
                { key: 'elem',      label: 'Element'         },
                { key: 'corrected', label: 'Corrected Value' },
                { key: null,        label: 'QC Check'          }
              ].map((col, i) => {
                const isSortable = sortableKeys.includes(col.key);
                const isActive   = sortConfig.key === col.key;
                const arrow      = isActive
                  ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                  : '⇅';

                return (
                  <th
                    key={i}
                    onClick={() => isSortable && handleSort(col.key)}
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#f8f9fb',
                      zIndex: 50,
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontWeight: 600,
                      borderBottom: '1px solid #ccc',
                      cursor: isSortable ? 'pointer' : 'default',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {col.label}
                      {isSortable && (
                        <Box component="span"
                             sx={{ fontSize: '0.75rem', visibility: isActive ? 'visible' : 'hidden' }}>
                          {arrow}
                        </Box>
                      )}
                    </Box>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <AnalysisRow
                key={row.elem || idx}
                row={row}
                isExpanded={expandedRows.has(row.elem)}
                toggleRowExpansion={toggleRowExpansion}
              />
            ))}
          </tbody>
        </table>
      )}
    </Box>
  );
};

export default AnalysisTable;
