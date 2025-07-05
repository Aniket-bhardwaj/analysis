import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Autocomplete,
  TextField,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import Filter from './common/Filter'; // ✅ same Filter drawer you’re already using

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const ElementGraph = () => {
  /* ────────────── UI / filter state ────────────── */
  const [elementOptions, setElementOptions] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState(null);

  /* ────────────── data state ────────────── */
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ────────────────────────────────────────────────
     1.  Fetch list of elements (for the autocomplete)
  ──────────────────────────────────────────────── */
  useEffect(() => {
    const fetchElements = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/element-options`);
        const json = await res.json();
        const elements = json.elements || [];
        setElementOptions(elements);
        if (elements.length > 0 && !selectedElement) setSelectedElement(elements[0]);
      } catch (err) {
        console.error('Failed to fetch element options:', err);
      }
    };
    fetchElements();
  }, [selectedElement]);

  /* ────────────────────────────────────────────────
     2.  Fetch list of uploaded files (shown in Filter)
  ──────────────────────────────────────────────── */
  const fetchUploadedFiles = async (filters) => {
    setError(null);
    let url = `${import.meta.env.VITE_API_URL}/uploaded-files`;

    if (filters?.startDate && filters?.endDate) {
      const params = new URLSearchParams({
        start_date: filters.startDate,
        end_date: filters.endDate,
      });
      url += `?${params.toString()}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      const files = data.files ?? data.data ?? (Array.isArray(data) ? data : []);
      setUploadedFiles(files);

      // If user cleared file filter, keep things sane:
      if (files.length && !selectedFileId) {
        setSelectedFileId(files[0].id ?? files[0].file_id);
      }
    } catch (err) {
      console.error('❌ Failed to load files:', err);
      setError(`Failed to load files: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []); // initial load

  /* ────────────────────────────────────────────────
     3.  Handle filter drawer actions
  ──────────────────────────────────────────────── */
  const handleFilter = (payload) => {
    setError(null);

    if (payload.type === 'clear') {
      setSelectedFileId('');
      setSelectedDateRange(null);
      fetchUploadedFiles(); // reload full list
    } else if (payload.type === 'date') {
      setSelectedFileId('');
      setSelectedDateRange({
        startDate: payload.startDate,
        endDate: payload.endDate,
      });
      fetchUploadedFiles({ startDate: payload.startDate, endDate: payload.endDate });
    } else if (payload.type === 'file') {
      const fileId = payload.file.id ?? payload.file.file_id;
      setSelectedFileId(fileId);
      setSelectedDateRange(null);
    }
  };

  /* ────────────────────────────────────────────────
     4.  Fetch graph data whenever element OR filters change
  ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedElement) return;

    const fetchGraph = async () => {
      setLoading(true);
      setError(null);

      try {
        const base = `${import.meta.env.VITE_API_URL}/element-graph`;
        const params = new URLSearchParams({ element: selectedElement });

        // prioritise: file → date → nothing
        if (selectedFileId) params.append('file_id', selectedFileId);
        else if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
          params.append('start_date', selectedDateRange.startDate);
          params.append('end_date', selectedDateRange.endDate);
        }

        const res = await fetch(`${base}?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const { graphData } = await res.json();
        setGraphData(graphData);
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
        setError(`Failed to fetch graph data: ${err.message}`);
        setGraphData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [selectedElement, selectedFileId, selectedDateRange]);

  /* ────────────────────────────────────────────────
     5.  Chart.js configuration
  ──────────────────────────────────────────────── */
  const chartConfig = {
    labels: graphData?.map(d => d.sample) || [],
    datasets: [
      {
        label: selectedElement ? `${selectedElement} (Corrected)` : '',
        data: graphData?.map(d => d.value) || [],
        borderColor: 'rgba(0,0,0,.4)',
        borderWidth: 0.5,
        backgroundColor: graphData?.map(d =>
          d.status === 'Fail' ? 'red' : d.status === 'Pass' ? '#00c04b' : 'gray'
        ),
        pointBorderColor: graphData?.map(d =>
          d.status === 'Fail' ? 'red' : d.status === 'Pass' ? '#00c04b' : 'gray'
        ),
        pointBackgroundColor: graphData?.map(d =>
          d.status === 'Fail' ? 'red' : d.status === 'Pass' ? '#00c04b' : 'gray'
        ),
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: selectedElement ? `Element: ${selectedElement}` : '',
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Sample Name' },
        ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 20 },
      },
      y: {
        title: { display: true, text: 'Corrected Value (ppm)' },
        ticks: { precision: 2, callback: v => v.toLocaleString() },
      },
    },
  };

  /* ────────────────────────────────────────────────
     6.  Render
  ──────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      {/* search + filter row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Autocomplete
          options={elementOptions}
          value={selectedElement}
          onChange={(_, newVal) => setSelectedElement(newVal)}
          sx={{ flexGrow: 1 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Element" variant="outlined" size="small" />
          )}
        />

        <Filter
          uploadedFiles={uploadedFiles}
          onApplyFilter={handleFilter}
          selectedFile={selectedFileId}
          selectedDateRange={selectedDateRange}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box
        sx={{
          p: 2,
          backgroundColor: '#fff',
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          border: '1px solid #e0e0e0',
          minHeight: 300,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : graphData ? (
          <Line data={chartConfig} options={chartOptions} />
        ) : selectedElement ? (
          <Typography variant="body2" color="text.secondary">
            No data available for the selected element.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default ElementGraph;