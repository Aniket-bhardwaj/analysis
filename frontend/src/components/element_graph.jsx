import React, { useEffect, useState } from 'react';
import {
  Box, CircularProgress, Typography, Autocomplete,
  TextField, Alert, LinearProgress,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import Filter from './common/Filter';

import {
  Chart as ChartJS, LineElement, CategoryScale,
  LinearScale, PointElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(
  LineElement, CategoryScale, LinearScale,
  PointElement, Title, Tooltip, Legend
);

const ElementGraph = () => {
  /* ── UI / filter state ── */
  const [elementOptions, setElementOptions]     = useState([]);
  const [selectedElement, setSelectedElement]   = useState(null);
  const [uploadedFiles, setUploadedFiles]       = useState([]);
  const [selectedFileId, setSelectedFileId]     = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);

  /* ── data state ── */
  const [graphData, setGraphData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  /* 1️⃣ fetch element list once */
  useEffect(() => {
    (async () => {
      try {
        const res     = await fetch(`${import.meta.env.VITE_API_URL}/element-options`);
        const { elements = [] } = await res.json();
        setElementOptions(elements);
        if (elements.length && !selectedElement) {
          setSelectedElement(elements[0]);
        }
      } catch (err) {
        console.error('Failed to fetch element options:', err);
      }
    })();
  }, []);

  /* 2️⃣ fetch uploaded-file list (for the File filter dropdown) */
  const fetchUploadedFiles = async (filters = null) => {
    setError(null);
    let url = `${import.meta.env.VITE_API_URL}/uploaded-files`;

    if (filters?.startDate && filters?.endDate) {
      url += `?start_date=${filters.startDate}&end_date=${filters.endDate}`;
    }

    try {
      const res   = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data  = await res.json();
      const files = data.files ?? data.data ?? (Array.isArray(data) ? data : []);
      setUploadedFiles(files);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError(`Failed to load files: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  /* 3️⃣ handle Filter drawer actions */
  const handleFilter = (payload) => {
    setError(null);

    if (payload.type === 'clear') {
      setSelectedFileId(null);
      setSelectedDateRange(null);
      fetchUploadedFiles();   // reset file list
    } else if (payload.type === 'date') {
      setSelectedFileId(null);
      setSelectedDateRange({
        startDate: payload.startDate,
        endDate:   payload.endDate,
      });
      fetchUploadedFiles({ startDate: payload.startDate, endDate: payload.endDate });
    } else if (payload.type === 'file') {
      setSelectedFileId(payload.file.id ?? payload.file.file_id);
      setSelectedDateRange(null);
    }
  };

  /* 4️⃣ fetch graph data whenever element OR filters change */
  useEffect(() => {
    if (!selectedElement) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base   = `${import.meta.env.VITE_API_URL}/element-graph`;
        const params = new URLSearchParams({ element: selectedElement });

        if (selectedFileId) {
          params.append('file_id', selectedFileId);
        } else if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
          params.append('start_date', selectedDateRange.startDate);
          params.append('end_date',   selectedDateRange.endDate);
        }

        const res = await fetch(`${base}?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { graphData } = await res.json();
        setGraphData(graphData);
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
        setError(`Failed to fetch graph data: ${err.message}`);
        setGraphData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedElement, selectedFileId, selectedDateRange]);

  /* 5️⃣ chart config */
  const chartConfig = {
    labels: graphData?.map(d => d.sample) || [],
    datasets: [{
      label: selectedElement ? `${selectedElement} (Corrected)` : '',
      data:  graphData?.map(d => d.value) || [],
      borderColor: 'rgba(0,0,0,.4)',
      borderWidth: .5,
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
      tension: .3,
      pointRadius: 4,
      pointHoverRadius: 5,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title:  { display: !!selectedElement, text: `Element: ${selectedElement}` },
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

  /* 6️⃣ render */
  return (
   <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Autocomplete
          options={elementOptions}
          value={selectedElement}
          onChange={(_, v) => setSelectedElement(v)}
          sx={{ width: 300 }} // Set desired width here
          renderInput={(p) => <TextField {...p} label="Select Element" size="small" />}
        /> 

        <Filter
          uploadedFiles={uploadedFiles}
          onApplyFilter={handleFilter}
          selectedFile={selectedFileId}
          selectedDateRange={selectedDateRange}
        />
      </Box>

      {error   && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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