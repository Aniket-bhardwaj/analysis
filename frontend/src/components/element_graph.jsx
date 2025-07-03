import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Autocomplete, TextField } from '@mui/material';
import { Line } from 'react-chartjs-2';
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

// Register Chart.js components
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
  const [elementOptions, setElementOptions] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch available elements on mount
  useEffect(() => {
    const fetchElements = async () => {
      try {
        const res = await fetch('${import.meta.env.VITE_API_URL}/element-options');
        const json = await res.json();
        const elements = json.elements || [];
        setElementOptions(elements);
  
        // Auto-select the first element if none is selected
        if (elements.length > 0 && !selectedElement) {
          setSelectedElement(elements[0]);
        }
      } catch (err) {
        console.error('Failed to fetch element options:', err);
      }
    };
  
    fetchElements();
  }, []);
  

  // Fetch graph data when an element is selected
  useEffect(() => {
    if (!selectedElement) return;

    const fetchGraphData = async () => {
      setLoading(true);
      try {
        // console.log('Fetching graph for element:', selectedElement);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/element-graph?element=${encodeURIComponent(selectedElement)}`);
        const json = await res.json();
        // console.log('Backend response:', json);
        
        setGraphData(json.graphData);
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [selectedElement]);

  const chartConfig = {
    labels: graphData?.labels || [],
    datasets: [
      {
        label: selectedElement ? `${selectedElement} (Corrected)` : '',
        data: graphData?.data || [],
        borderColor: '#1976d2',
        backgroundColor: '#1976d2',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
    
  };
//   console.log('graphData for chart config:', graphData);
  
  

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
        title: {
          display: true,
          text: 'Sample Name',
        },
        ticks: {
          maxRotation: 45, // rotate labels
          minRotation: 45,
          autoSkip: true,  // skip some ticks to reduce clutter
          maxTicksLimit: 20, // show only 20 ticks max
        },
      },
      y: {
        title: {
          display: true,
          text: 'Corrected Value (ppm)',
        },
        ticks: {
          precision: 2,
          callback: function (value) {
            return value.toLocaleString(); // add commas for large values
          },
        },
      },
    },
  };
  

  return (
    <Box sx={{ p: 3 }}>
  <Box sx={{ mb: 3, width: 300 }}>
    <Autocomplete
      options={elementOptions}
      value={selectedElement}
      onChange={(event, newValue) => setSelectedElement(newValue)}
      renderInput={(params) => (
        <TextField {...params} label="Select Element" variant="outlined" />
      )}
    />
  </Box>

  <Box
    sx={{
      p: 2,
      backgroundColor: '#ffffff',
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      border: '1px solid #e0e0e0',
      minHeight: 300,
    }}
  >
    {loading ? (
      <CircularProgress />
    ) : graphData ? (
      <Line data={chartConfig} options={chartOptions} />
    ) : (
      selectedElement && (
        <Typography variant="body2" color="textSecondary">
          No data available for the selected element.
        </Typography>
      )
    )}
  </Box>
</Box>

  );
};

export default ElementGraph;
